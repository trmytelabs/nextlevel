#!/usr/bin/env bash
# Full WordPress rescue backup. Run as root on the OLD server:  bash backup.sh [/path/to/wordpress]
# Finds the WordPress install (or takes the path you give), reads the DB credentials from wp-config.php, dumps the
# database, archives the whole site directory, and also captures everything you would otherwise forget: web server
# vhosts, PHP config, Let's Encrypt certs, crontabs, systemd units you added, package list, PHP version + extensions,
# DNS as seen from the box, and a quick malware triage of wp-content. Output: /root/wp-rescue-<date>.tar.gz + .sha256
set -euo pipefail
TS=$(date -u +%Y%m%d-%H%M%S); OUT=/root/wp-rescue-$TS; mkdir -p "$OUT"; LOG="$OUT/backup.log"
log(){ echo "[$(date -u +%H:%M:%S)] $*" | tee -a "$LOG"; }

# ---- 1. locate WordPress ----
WP="${1:-}"
if [ -z "$WP" ]; then
  WP=$(find / -xdev -name wp-config.php -not -path '*/node_modules/*' 2>/dev/null | head -1 | xargs -r dirname)
fi
[ -n "$WP" ] && [ -f "$WP/wp-config.php" ] || { echo "wp-config.php not found; pass the WordPress directory as the first argument"; exit 1; }
log "WordPress at $WP"
# wp-config.php is sometimes one level above the web root
CFG="$WP/wp-config.php"; [ -f "$CFG" ] || CFG="$(dirname "$WP")/wp-config.php"
getc(){ php -r "define('ABSPATH','$WP/'); @include '$CFG'; echo defined('$1')?constant('$1'):'';" 2>/dev/null || grep -oP "define\(\s*['\"]$1['\"]\s*,\s*['\"]\K[^'\"]+" "$CFG" | head -1; }
DB_NAME=$(getc DB_NAME); DB_USER=$(getc DB_USER); DB_PASS=$(getc DB_PASSWORD); DB_HOST=$(getc DB_HOST); DB_HOST=${DB_HOST:-localhost}
TABLE_PREFIX=$(grep -oP "^\s*\\\$table_prefix\s*=\s*['\"]\K[^'\"]+" "$CFG" | head -1 || echo wp_)
log "DB name=$DB_NAME user=$DB_USER host=$DB_HOST prefix=$TABLE_PREFIX"
printf 'WP_PATH=%s\nDB_NAME=%s\nDB_USER=%s\nDB_HOST=%s\nTABLE_PREFIX=%s\n' "$WP" "$DB_NAME" "$DB_USER" "$DB_HOST" "$TABLE_PREFIX" > "$OUT/site.env"
printf 'DB_PASSWORD=%s\n' "$DB_PASS" > "$OUT/db-password.env"; chmod 600 "$OUT/db-password.env"

# ---- 2. database dump (single transaction, routines, triggers, utf8mb4) ----
HOSTARG=(-h "${DB_HOST%%:*}"); case "$DB_HOST" in *:/*) HOSTARG=(--socket "${DB_HOST#*:}");; *:*) HOSTARG=(-h "${DB_HOST%%:*}" -P "${DB_HOST#*:}");; esac
log "dumping database"
MYSQL_PWD="$DB_PASS" mysqldump "${HOSTARG[@]}" -u "$DB_USER" --single-transaction --quick --routines --triggers --events --default-character-set=utf8mb4 --add-drop-table "$DB_NAME" | gzip -6 > "$OUT/db.sql.gz"
log "db.sql.gz $(du -h "$OUT/db.sql.gz" | cut -f1); tables: $(zcat "$OUT/db.sql.gz" | grep -c '^CREATE TABLE')"

# ---- 3. site files (everything, including wp-config, .htaccess, uploads, themes, plugins, mu-plugins) ----
log "archiving site files"
tar -C "$(dirname "$WP")" -czf "$OUT/site-files.tar.gz" --warning=no-file-changed "$(basename "$WP")" || true
[ "$CFG" != "$WP/wp-config.php" ] && cp "$CFG" "$OUT/wp-config.php.outside-webroot"
log "site-files.tar.gz $(du -h "$OUT/site-files.tar.gz" | cut -f1)"

# ---- 4. server config you will want to look at while rebuilding ----
log "capturing server config"
mkdir -p "$OUT/etc"
for d in /etc/nginx /etc/apache2 /etc/httpd /etc/php /etc/letsencrypt /etc/mysql /etc/caddy /etc/fail2ban /etc/ufw /etc/cron.d /etc/cron.daily /etc/logrotate.d /etc/systemd/system; do [ -e "$d" ] && cp -a "$d" "$OUT/etc/" 2>/dev/null || true; done
cp -a /etc/crontab /etc/hosts /etc/hostname /etc/fstab /etc/ssh/sshd_config "$OUT/etc/" 2>/dev/null || true
for u in $(cut -d: -f1 /etc/passwd); do crontab -l -u "$u" 2>/dev/null | sed "s/^/$u: /" ; done > "$OUT/crontabs.txt" || true
dpkg -l > "$OUT/packages.txt" 2>/dev/null || rpm -qa > "$OUT/packages.txt" 2>/dev/null || true
{ php -v; echo; php -m; } > "$OUT/php.txt" 2>/dev/null || true
{ (mysql --version || mariadb --version); nginx -v 2>&1 || apache2 -v 2>&1; } > "$OUT/versions.txt" 2>&1 || true
{ cat /etc/os-release; uname -a; df -h; free -m; } > "$OUT/system.txt" 2>/dev/null
(ss -tulpn 2>/dev/null || netstat -tulpn) > "$OUT/listening.txt" 2>/dev/null || true
systemctl list-units --type=service --state=running --no-pager --no-legend > "$OUT/services.txt" 2>/dev/null || true
# DNS as the site currently resolves (so the records can be recreated exactly)
SITEURL=$(MYSQL_PWD="$DB_PASS" mysql "${HOSTARG[@]}" -u "$DB_USER" -N -e "select option_value from ${TABLE_PREFIX}options where option_name in ('siteurl','home')" "$DB_NAME" 2>/dev/null | head -1 || true)
echo "siteurl=$SITEURL" > "$OUT/dns.txt"; DOM=$(echo "$SITEURL" | sed -E 's#https?://##; s#/.*##')
[ -n "$DOM" ] && for t in A AAAA MX TXT CNAME NS; do echo "--- $t $DOM"; (dig +short "$t" "$DOM" 2>/dev/null || host -t "$t" "$DOM" 2>/dev/null); done >> "$OUT/dns.txt" || true
[ -n "$DOM" ] && for s in www mail; do echo "--- A $s.$DOM"; dig +short A "$s.$DOM" 2>/dev/null; done >> "$OUT/dns.txt" || true
log "site url: $SITEURL"

# ---- 5. WordPress facts: version, active plugins/themes, users, cron, uploads size ----
log "collecting WordPress facts"
{
  echo "wp version: $(grep -oP "wp_version = '\K[^']+" "$WP/wp-includes/version.php" 2>/dev/null)"
  echo "active plugins:"; MYSQL_PWD="$DB_PASS" mysql "${HOSTARG[@]}" -u "$DB_USER" -N -e "select option_value from ${TABLE_PREFIX}options where option_name='active_plugins'" "$DB_NAME" 2>/dev/null | tr ';' '\n' | grep -oP '"\K[^"]+\.php' || true
  echo "theme:"; MYSQL_PWD="$DB_PASS" mysql "${HOSTARG[@]}" -u "$DB_USER" -N -e "select option_name,option_value from ${TABLE_PREFIX}options where option_name in ('template','stylesheet')" "$DB_NAME" 2>/dev/null || true
  echo "users:"; MYSQL_PWD="$DB_PASS" mysql "${HOSTARG[@]}" -u "$DB_USER" -e "select ID,user_login,user_email,user_registered from ${TABLE_PREFIX}users" "$DB_NAME" 2>/dev/null || true
  echo "uploads: $(du -sh "$WP/wp-content/uploads" 2>/dev/null | cut -f1)"; echo "plugins dir:"; ls "$WP/wp-content/plugins" 2>/dev/null; echo "themes dir:"; ls "$WP/wp-content/themes" 2>/dev/null; echo "mu-plugins:"; ls "$WP/wp-content/mu-plugins" 2>/dev/null || true
} > "$OUT/wordpress.txt"

# ---- 6. malware triage (read-only): PHP in uploads, recently changed PHP, obfuscation markers, extra admin users ----
log "malware triage"
{
  echo "== PHP files inside uploads (should be none) =="; find "$WP/wp-content/uploads" -type f -name '*.php*' 2>/dev/null
  echo "== PHP files modified in the last 14 days =="; find "$WP" -type f -name '*.php' -mtime -14 2>/dev/null | head -60
  echo "== obfuscation markers (eval/base64/gzinflate/str_rot13) outside known plugin vendor dirs =="; grep -rlE 'eval\s*\(\s*(base64_decode|gzinflate|str_rot13|gzuncompress)' "$WP" --include='*.php' 2>/dev/null | grep -vE '/vendor/|/node_modules/' | head -60
  echo "== files in web root that are not WordPress core/content =="; ls -la "$WP" | grep -vE ' (wp-[a-z-]+\.php|wp-admin|wp-content|wp-includes|index\.php|xmlrpc\.php|license\.txt|readme\.html|\.htaccess|\.\.?)$'
  echo "== administrators =="; MYSQL_PWD="$DB_PASS" mysql "${HOSTARG[@]}" -u "$DB_USER" -e "select u.user_login,u.user_email from ${TABLE_PREFIX}users u join ${TABLE_PREFIX}usermeta m on m.user_id=u.ID where m.meta_key='${TABLE_PREFIX}capabilities' and m.meta_value like '%administrator%'" "$DB_NAME" 2>/dev/null
  echo "== suspicious options (unexpected siteurl/home, injected scripts) =="; MYSQL_PWD="$DB_PASS" mysql "${HOSTARG[@]}" -u "$DB_USER" -N -e "select option_name from ${TABLE_PREFIX}options where option_value like '%<script%' or option_value like '%eval(%' limit 20" "$DB_NAME" 2>/dev/null
} > "$OUT/malware-triage.txt" 2>&1

# ---- 7. bundle + checksum ----
cp "$0" "$OUT/backup.sh" 2>/dev/null || true
tar -C /root -czf "/root/wp-rescue-$TS.tar.gz" "wp-rescue-$TS"
sha256sum "/root/wp-rescue-$TS.tar.gz" > "/root/wp-rescue-$TS.tar.gz.sha256"
log "bundle: /root/wp-rescue-$TS.tar.gz ($(du -h /root/wp-rescue-$TS.tar.gz | cut -f1))"
echo; echo "Copy it off the server before you wipe anything:"
echo "  scp root@THIS_SERVER:/root/wp-rescue-$TS.tar.gz* ."
echo "Then verify:  sha256sum -c wp-rescue-$TS.tar.gz.sha256"
