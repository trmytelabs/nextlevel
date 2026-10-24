#!/usr/bin/env bash
# Read-only compromise check for an Ubuntu/Debian server. Run as root: bash audit.sh > audit.txt
# Changes nothing. Looks for: unexpected users and keys, sudoers edits, suspicious processes and listeners, outbound
# connections, cron/systemd persistence, modified package files, SUID binaries, recent logins and brute-force volume,
# webshell-looking files, and basic rootkit indicators.
set -uo pipefail
sec(){ printf '\n===== %s =====\n' "$1"; }
sec "HOST"; hostname; date -u; uptime; cat /etc/os-release | head -2
sec "USERS WITH SHELLS"; awk -F: '$7 !~ /(nologin|false|sync|halt|shutdown)$/ {print $1" uid="$3" home="$6" shell="$7}' /etc/passwd
sec "UID 0 ACCOUNTS (should be root only)"; awk -F: '$3==0{print $1}' /etc/passwd
sec "AUTHORIZED KEYS (every account)"; for h in /root /home/*; do f="$h/.ssh/authorized_keys"; [ -f "$f" ] && { echo "--- $f"; sed 's/\(ssh-[a-z0-9-]* [A-Za-z0-9+\/=]\{20\}\)[A-Za-z0-9+\/=]*/\1.../' "$f"; }; done
sec "SUDOERS"; grep -vE '^\s*(#|$)' /etc/sudoers 2>/dev/null; ls -la /etc/sudoers.d 2>/dev/null; for f in /etc/sudoers.d/*; do [ -f "$f" ] && { echo "--- $f"; grep -vE '^\s*(#|$)' "$f"; }; done
sec "RECENT PASSWORD/SHADOW CHANGES"; ls -la --time-style=long-iso /etc/passwd /etc/shadow /etc/group /etc/sudoers
sec "LISTENING SOCKETS"; (ss -tulpn 2>/dev/null || netstat -tulpn 2>/dev/null)
sec "ESTABLISHED OUTBOUND CONNECTIONS"; ss -tnp state established 2>/dev/null | awk 'NR==1||$0!~/127\.0\.0\.1|::1/'
sec "TOP PROCESSES BY CPU"; ps -eo pid,user,pcpu,pmem,etime,comm,args --sort=-pcpu | head -15
sec "PROCESSES RUNNING FROM /tmp /dev/shm /var/tmp OR DELETED BINARIES"; for p in /proc/[0-9]*; do exe=$(readlink "$p/exe" 2>/dev/null) || continue; case "$exe" in /tmp/*|/dev/shm/*|/var/tmp/*|*"(deleted)") echo "pid ${p#/proc/} exe=$exe cmd=$(tr '\0' ' ' < "$p/cmdline" | head -c 200)";; esac; done
sec "CRON (system + every user)"; ls -la /etc/cron.* 2>/dev/null | head -40; cat /etc/crontab 2>/dev/null | grep -vE '^\s*(#|$)'; for u in $(cut -f1 -d: /etc/passwd); do c=$(crontab -l -u "$u" 2>/dev/null | grep -vE '^\s*(#|$)'); [ -n "$c" ] && { echo "--- crontab $u"; echo "$c"; }; done
sec "SYSTEMD UNITS NOT FROM PACKAGES (last 30 days)"; find /etc/systemd/system /usr/local/lib/systemd/system /root/.config/systemd /home/*/.config/systemd -type f -mtime -30 2>/dev/null; systemctl list-units --type=service --state=running --no-pager --no-legend | awk '{print $1}' | sort
sec "SYSTEMD TIMERS"; systemctl list-timers --all --no-pager --no-legend 2>/dev/null | head -30
sec "RC.LOCAL / PROFILE HOOKS / LD_PRELOAD"; [ -f /etc/rc.local ] && cat /etc/rc.local; cat /etc/ld.so.preload 2>/dev/null; grep -lE 'curl|wget|base64|nc |/dev/tcp' /etc/profile /etc/profile.d/* /etc/bash.bashrc /root/.bashrc /root/.profile /home/*/.bashrc /home/*/.profile 2>/dev/null
sec "SUID/SGID BINARIES OUTSIDE PACKAGES"; find / -xdev \( -perm -4000 -o -perm -2000 \) -type f 2>/dev/null | while read -r f; do dpkg -S "$f" >/dev/null 2>&1 || echo "NOT FROM A PACKAGE: $f"; done
sec "RECENTLY MODIFIED SYSTEM BINARIES (7 days)"; find /bin /sbin /usr/bin /usr/sbin /usr/local/bin /usr/local/sbin /lib /usr/lib -xdev -type f -mtime -7 2>/dev/null | head -40
sec "PACKAGE FILE INTEGRITY (debsums, if installed)"; if command -v debsums >/dev/null; then debsums -s 2>&1 | head -40; else echo "debsums not installed (apt install debsums to verify every package file)"; fi
sec "WEB ROOT: SCRIPTS OR ODD FILES"; for d in /var/www /srv /usr/share/nginx/html; do [ -d "$d" ] && find "$d" -type f \( -name '*.php' -o -name '*.sh' -o -name '*.py' -o -name '*.pl' -o -name '.*' \) 2>/dev/null | head -40; done
sec "WORLD-WRITABLE DIRS WITH EXECUTABLES"; find /tmp /var/tmp /dev/shm -xdev -type f -perm -o+x 2>/dev/null | head
sec "LAST LOGINS"; last -a -n 25 2>/dev/null; echo; lastb -n 5 2>/dev/null | head -8
sec "SSH AUTH SUMMARY (journal, 14 days)"; journalctl -u ssh -u sshd --since '14 days ago' --no-pager 2>/dev/null | grep -E 'Accepted|Failed password|Invalid user' | awk '{for(i=1;i<=NF;i++){if($i=="Accepted"||$i=="Failed"||$i=="Invalid")k=$i; if($i=="for"){u=$(i+1)}; if($i=="from"){ip=$(i+1)}} print k, u, ip}' | sort | uniq -c | sort -rn | head -25
sec "ACCEPTED LOGINS (full lines, 30 days)"; journalctl -u ssh -u sshd --since '30 days ago' --no-pager 2>/dev/null | grep Accepted | tail -30
sec "SSHD EFFECTIVE SETTINGS"; sshd -T 2>/dev/null | grep -E '^(passwordauthentication|permitrootlogin|pubkeyauthentication|kbdinteractiveauthentication|port |maxauthtries)'
sec "FIREWALL"; ufw status verbose 2>/dev/null || iptables -S 2>/dev/null | head -40
sec "FAIL2BAN"; fail2ban-client status 2>/dev/null; fail2ban-client status sshd 2>/dev/null | tail -5
sec "DNS / HOSTS TAMPERING"; cat /etc/resolv.conf | grep -v '^#'; grep -vE '^\s*(#|$)' /etc/hosts
sec "KERNEL MODULES NOT FROM PACKAGES"; for m in $(lsmod | awk 'NR>1{print $1}'); do f=$(modinfo -n "$m" 2>/dev/null); [ -n "$f" ] && ! dpkg -S "$f" >/dev/null 2>&1 && echo "NOT FROM A PACKAGE: $m $f"; done
sec "ROOTKIT CHECKERS (if installed)"; command -v chkrootkit >/dev/null && chkrootkit 2>/dev/null | grep -vE 'not found|not infected|nothing found|nothing detected' | head -30; command -v rkhunter >/dev/null && rkhunter --check --sk --rwo 2>/dev/null | head -30; command -v chkrootkit >/dev/null || echo "chkrootkit not installed"; command -v rkhunter >/dev/null || echo "rkhunter not installed"
sec "DOCKER (if present)"; command -v docker >/dev/null && docker ps -a --format '{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null
sec "PENDING SECURITY UPDATES"; apt-get -s upgrade 2>/dev/null | grep -i security | head -20
sec "DISK / INODES"; df -h / /var 2>/dev/null
echo; echo "===== END ====="
