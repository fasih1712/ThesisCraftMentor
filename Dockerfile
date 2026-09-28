FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY index.html /srv/index.html
COPY assets/ /srv/assets/
COPY blog/ /srv/blog/
COPY sitemap.xml robots.txt favicon.ico /srv/

EXPOSE 80 443
