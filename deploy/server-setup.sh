#!/usr/bin/env bash
# One-time provisioning for the Next Level VPS (Ubuntu 22.04/24.04 or Debian 12). Run as root:
#   DOMAIN=nextlevel.example.com DEPLOY_PUBKEY="ssh-ed25519 AAAA... nextlevel-deploy@belt-pc" [HARDEN_SSH=1] bash server-setup.sh
# What it does: creates an unprivileged `deploy` user that can only receive files, installs Caddy (automatic HTTPS via
# Let's Encrypt, HTTP->HTTPS redirect, security headers), locks the firewall to 22/80/443, enables fail2ban and
# unattended security upgrades, and disables password SSH logins once the key works.
set -euo pipefail
: "${DOMAIN:?set DOMAIN, e.g. DOMAIN=nextlevel.example.com}"
: "${DEPLOY_PUBKEY:?set DEPLOY_PUBKEY to the public line of the deploy key}"
SITE_DIR=/var/www/nextlevel

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl rsync ufw fail2ban unattended-upgrades apt-listchanges debian-keyring debian-archive-keyring apt-transport-https gnupg

# ---- deploy user: key only, no shell beyond rsync into the site dir ----
id -u deploy >/dev/null 2>&1 || useradd -m -s /bin/bash deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
printf 'command="/usr/local/bin/deploy-rrsync %s",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty %s\n' "$SITE_DIR" "$DEPLOY_PUBKEY" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys
# rrsync (restricted rsync) ships with rsync; expose it under a fixed path
RR=$(ls /usr/share/doc/rsync/scripts/rrsync* 2>/dev/null | head -1 || true)
if [ -n "$RR" ]; then
  if [[ "$RR" == *.gz ]]; then gunzip -c "$RR" > /usr/local/bin/deploy-rrsync; else cp "$RR" /usr/local/bin/deploy-rrsync; fi
else
  cp "$(command -v rrsync)" /usr/local/bin/deploy-rrsync
fi
chmod 755 /usr/local/bin/deploy-rrsync
install -d -m 755 -o deploy -g deploy "$SITE_DIR"

# ---- Caddy ----
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y && apt-get install -y caddy
fi
sed "s/__DOMAIN__/$DOMAIN/g; s#__SITE_DIR__#$SITE_DIR#g" "$(dirname "$0")/Caddyfile" > /etc/caddy/Caddyfile
systemctl enable --now caddy
systemctl reload caddy

# ---- firewall, fail2ban, auto-updates ----
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
systemctl enable --now fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades

# ---- SSH hardening (keys only). Opt in with HARDEN_SSH=1 once your own key works for root/your user, or you lock yourself out. ----
if [ "${HARDEN_SSH:-0}" = "1" ]; then
install -d /etc/ssh/sshd_config.d
cat > /etc/ssh/sshd_config.d/90-hardening.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
X11Forwarding no
MaxAuthTries 4
EOF
sshd -t && (systemctl reload ssh || systemctl reload sshd)
else
  echo "SSH password login left enabled. Re-run with HARDEN_SSH=1 after your key works."
fi

echo "Done. Point DNS A/AAAA for $DOMAIN at this server, then the first HTTPS request obtains the certificate."
echo "Deploy with: rsync -az --delete -e 'ssh -i <deploy key>' dist/ deploy@$DOMAIN:/"
