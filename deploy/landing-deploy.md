# Landing page deploy (patchnotes.ca)

The apex `patchnotes.ca` can serve `site/` as plain static files from `/var/www/patchnotes` (copy `site/index.html`, `site/style.css`, plus `public/favicon-32.png` and `public/og.png` into that folder; nothing to build). It is not live yet. The Next Level game is on its own subdomain, `nextlevel.patchnotes.ca`, deployed as a container by `.github/workflows/ci-cd.yml`; the host Caddy terminates HTTPS with a Cloudflare origin certificate and proxies to it. DNS is on Cloudflare: proxied records for `patchnotes.ca`, `www` and `nextlevel` point at the VPS, so the apex block below should use the same origin certificate as the `nextlevel` block rather than requesting its own.

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
