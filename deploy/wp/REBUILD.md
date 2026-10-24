# Rebuild the server: save the WordPress site, wipe, start clean

Order matters. Nothing gets wiped until step 4 is proven.

## 1. Before touching the old server (15 minutes)
- [ ] Lower DNS TTLs for the WordPress domain to 300 s now, so the cutover is quick later.
- [ ] Write down what else lives on the box that is not the site: mail (`dig MX`), other vhosts, cron jobs, anything in
      `/home`. `deploy/audit.sh` lists listening ports and services; `backup.sh` captures crontabs and vhosts.
- [ ] Collect credentials you will need again: Namecheap login, the WordPress admin login, any plugin licence keys
      (premium themes/plugins re-activate by key), SMTP/mail plugin credentials, payment or form integrations.
- [ ] Know the provider console password and how to reinstall the OS / change the root password (console access is
      the safety net if SSH is lost).

## 2. Back up (on the old server, as root)
```
bash backup.sh            # finds WordPress itself; or: bash backup.sh /var/www/html
```
It writes `/root/wp-rescue-<date>.tar.gz` with: the database dump, every site file (uploads, themes, plugins,
wp-config.php, .htaccess), nginx/apache/php/letsencrypt configs, crontabs, package list, PHP version and modules,
the DNS records the site currently resolves to, a WordPress fact sheet, and a malware triage report.

Copy it off the server **twice** (this PC and a second place):
```
scp root@OLD_SERVER:/root/wp-rescue-*.tar.gz* .
sha256sum -c wp-rescue-*.tar.gz.sha256
```

## 3. Read the triage before you restore it
Open `malware-triage.txt` and `wordpress.txt` inside the bundle. Red flags: PHP files inside `wp-content/uploads`,
PHP files modified recently that you did not touch, `eval(base64_decode(` hits, administrator accounts you do not
recognise, plugins you never installed. Delete those from the bundle (or restore then remove) so you do not carry an
infection to the new box. Prefer re-downloading plugins and themes fresh from wordpress.org over restoring them.

## 4. Test-restore somewhere disposable (strongly recommended)
Any machine with Docker: run `restore.sh` against a throwaway VM or a second cheap VPS for an hour, log in to
`/wp-admin`, click through pages, check uploads display. Only when that works is the backup proven.

## 5. Wipe and rebuild (provider console → reinstall OS: Ubuntu 24.04 LTS)
```
scp -r deploy root@NEW_SERVER:/root/
ssh root@NEW_SERVER 'DOMAIN=nextlevel.yourdomain.ca DEPLOY_PUBKEY="ssh-ed25519 AAAA... nextlevel-deploy@belt-pc" bash /root/deploy/server-setup.sh'
scp wp-rescue-<date>.tar.gz root@NEW_SERVER:/root/
ssh root@NEW_SERVER 'WP_DOMAIN=yourwordpress.ca bash /root/deploy/wp/restore.sh /root/wp-rescue-<date>.tar.gz'
```
What that gives you: Caddy with automatic HTTPS for both sites, WordPress + MariaDB in Docker on localhost only, daily
DB dumps kept 14 days, firewall on 22/80/443, fail2ban, unattended security updates, xmlrpc and config probes blocked,
login rate-limited, file editing from wp-admin disabled, the Next Level static site deployed by CI.

## 6. Cut over
- [ ] Point the WordPress domain's A record at the new IP (and `www`).
- [ ] Load `https://yourwordpress.ca/`, log in, check Settings → General URLs, Permalinks (click Save once), uploads,
      contact forms, and that mail still sends (a mail plugin with SMTP is more reliable than PHP mail in a container).
- [ ] Update WordPress core, themes and plugins; delete unused plugins and themes; change the admin password; enable
      2FA (a plugin such as Two-Factor); make sure no account is named `admin`.
- [ ] Once your own SSH key works for root: `HARDEN_SSH=1 bash server-setup.sh` to turn off password logins.
- [ ] Delete the old server (or keep it powered off for a week, then delete).

## 7. Keep it that way
- Backups: the `backup` container dumps the DB daily into `/opt/wordpress/backups`; add an off-box copy with a
  nightly `rsync` or `rclone` to object storage (Backblaze B2 or Cloudflare R2 cost cents).
- Updates: `unattended-upgrades` handles the OS; WordPress minor core updates are automatic; check plugins monthly.
- Monitoring: a free uptime check (UptimeRobot or Better Stack) on both domains, pointing alerts at your phone.
- Rebuilding again later is `server-setup.sh` + `restore.sh`, nothing manual.
