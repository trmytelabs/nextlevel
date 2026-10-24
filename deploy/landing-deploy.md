# Landing page deploy (patchnotes.ca)

The apex `patchnotes.ca` serves `site/` as plain static files from `/var/www/patchnotes` (copy `site/index.html`, `site/style.css`, plus `public/favicon-32.png` and `public/og.png` into that folder; nothing to build). The Next Level game stays on its own subdomain, `nextlevel.patchnotes.ca`, served from `/var/www/nextlevel`, which is where `deploy/server-setup.sh` + `.github/workflows/deploy.yml` already rsync the Vite build (run server-setup with `DOMAIN=nextlevel.patchnotes.ca`). DNS needs A/AAAA records for `patchnotes.ca`, `www`, and `nextlevel` pointing at the VPS; Caddy then issues all three certificates itself.

Add this block to `/etc/caddy/Caddyfile` next to the existing `nextlevel` site block, then `systemctl reload caddy`:

```caddyfile
patchnotes.ca {
	root * /var/www/patchnotes
	encode zstd gzip
	file_server

	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "SAMEORIGIN"
		Referrer-Policy "strict-origin-when-cross-origin"
		Permissions-Policy "camera=(), microphone=(), geolocation=()"
		# No scripts on the landing page; only Google Fonts is external.
		Content-Security-Policy "default-src 'self'; script-src 'none'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'"
		-Server
	}

	@static path *.css *.png
	header @static Cache-Control "public, max-age=86400"
	@html path / /index.html
	header @html Cache-Control "no-cache"

	log {
		output file /var/log/caddy/patchnotes.log {
			roll_size 20mb
			roll_keep 5
		}
	}
}

www.patchnotes.ca {
	redir https://patchnotes.ca{uri} permanent
}
```
