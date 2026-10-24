#!/usr/bin/env bash
# Restore the WordPress rescue bundle onto a FRESH Ubuntu 24.04 / Debian 12 server, in Docker, behind Caddy.
# Run as root after deploy/server-setup.sh has installed Caddy:
#   WP_DOMAIN=example.ca bash restore.sh /root/wp-rescue-<date>.tar.gz
# Optional: NEW_DOMAIN=newname.ca to move the site to a new domain (does a wp-cli search-replace).
set -euo pipefail
BUNDLE="${1:?path to wp-rescue-*.tar.gz}"; : "${WP_DOMAIN:?set WP_DOMAIN to the domain of the site}"
APP=/opt/wordpress; HERE="$(cd "$(dirname "$0")" && pwd)"
export DEBIAN_FRONTEND=noninteractive

# ---- Docker ----
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

# ---- unpack the bundle ----
WORK=$(mktemp -d); tar -C "$WORK" -xzf "$BUNDLE"; SRC=$(find "$WORK" -maxdepth 1 -mindepth 1 -type d | head -1)
set -a; . "$SRC/site.env"; . "$SRC/db-password.env"; set +a
TABLE_PREFIX=${TABLE_PREFIX:-wp_}
echo "restoring $DB_NAME (prefix $TABLE_PREFIX) from $(basename "$SRC")"

# ---- app folder: compose, env, php limits ----
mkdir -p "$APP/data/html" "$APP/data/db" "$APP/backups"
cp "$HERE/docker-compose.yml" "$APP/docker-compose.yml"
printf 'upload_max_filesize=64M\npost_max_size=64M\nmemory_limit=256M\nmax_execution_time=120\n' > "$APP/uploads.ini"
ROOTPW=$(openssl rand -hex 24)
cat > "$APP/.env" <<EOF
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_ROOT_PASSWORD=$ROOTPW
TABLE_PREFIX=$TABLE_PREFIX
EOF
chmod 600 "$APP/.env"

# ---- site files ----
tar -C "$APP/data/html" --strip-components=1 -xzf "$SRC/site-files.tar.gz"
# the container writes its own wp-config.php from the environment; keep the old one for reference (salts, custom defines)
[ -f "$APP/data/html/wp-config.php" ] && mv "$APP/data/html/wp-config.php" "$APP/wp-config.old.php"
chown -R 33:33 "$APP/data/html"   # www-data inside the image

# ---- start db, import, start wordpress ----
cd "$APP"
docker compose up -d db
echo "waiting for the database"; for i in $(seq 1 60); do docker compose exec -T db healthcheck.sh --connect --innodb_initialized >/dev/null 2>&1 && break; sleep 2; done
zcat "$SRC/db.sql.gz" | docker compose exec -T db sh -c "MYSQL_PWD=\$MARIADB_ROOT_PASSWORD mariadb --default-character-set=utf8mb4 $DB_NAME"
docker compose up -d
echo "waiting for WordPress"; for i in $(seq 1 60); do curl -sf -o /dev/null -H "Host: $WP_DOMAIN" http://127.0.0.1:8080/ && break; sleep 2; done

# ---- carry over the old salts so existing sessions/cookies keep working (optional, safe to skip) ----
if [ -f "$APP/wp-config.old.php" ]; then
  SALTS=$(grep -E "define\(\s*'(AUTH|SECURE_AUTH|LOGGED_IN|NONCE)_(KEY|SALT)'" "$APP/wp-config.old.php" || true)
  if [ -n "$SALTS" ]; then docker compose exec -T wordpress sh -c "cat >> /var/www/html/wp-config.php" <<EOF

/* salts carried over from the previous server */
$SALTS
EOF
  fi
fi

# ---- wp-cli for the domain move and a health check ----
docker run --rm --network "$(basename "$APP")_default" -v "$APP/data/html:/var/www/html" --user 33:33 --env-file "$APP/.env" wordpress:cli-php8.3 wp --path=/var/www/html core version || true
if [ -n "${NEW_DOMAIN:-}" ]; then
  echo "moving site URL to $NEW_DOMAIN"
  docker run --rm --network "$(basename "$APP")_default" -v "$APP/data/html:/var/www/html" --user 33:33 wordpress:cli-php8.3 \
    wp --path=/var/www/html search-replace "://$WP_DOMAIN" "://$NEW_DOMAIN" --all-tables --precise --skip-columns=guid
  WP_DOMAIN="$NEW_DOMAIN"
fi

# ---- Caddy vhost (appends to the Caddyfile server-setup.sh wrote; Next Level static site stays as is) ----
if ! grep -q "$WP_DOMAIN {" /etc/caddy/Caddyfile; then
cat >> /etc/caddy/Caddyfile <<EOF

$WP_DOMAIN, www.$WP_DOMAIN {
	encode zstd gzip
	reverse_proxy 127.0.0.1:8080 {
		header_up X-Forwarded-Proto {scheme}
		header_up X-Forwarded-Host {host}
	}
	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "SAMEORIGIN"
		Referrer-Policy "strict-origin-when-cross-origin"
		-Server
	}
	# block the usual probes before they reach PHP
	@blocked path /xmlrpc.php /wp-config.php* /.env /.git/* /readme.html /license.txt
	respond @blocked 403
	log {
		output file /var/log/caddy/wordpress.log {
			roll_size 20mb
			roll_keep 5
		}
	}
}
EOF
fi
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
# fail2ban jail: ban IPs that hammer wp-login.php (reads Caddy's JSON access log)
cat > /etc/fail2ban/filter.d/caddy-wplogin.conf <<'EOF'
[Definition]
failregex = ^.*"remote_ip":"<HOST>".*"uri":"/wp-login\.php".*$
ignoreregex =
EOF
cat > /etc/fail2ban/jail.d/caddy-wplogin.conf <<'EOF'
[caddy-wplogin]
enabled = true
port = http,https
filter = caddy-wplogin
logpath = /var/log/caddy/wordpress.log
maxretry = 15
findtime = 10m
bantime = 1h
EOF
systemctl restart fail2ban || true

rm -rf "$WORK"
echo
echo "Done. Point $WP_DOMAIN's A record here (if you have not), then open https://$WP_DOMAIN/wp-admin/ ."
echo "Daily DB dumps land in $APP/backups. Site files live in $APP/data/html. Everything restores from this folder."
