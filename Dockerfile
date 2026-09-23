FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY index.html favicon.ico robots.txt sitemap.xml /srv/
COPY assets/ /srv/assets/
COPY blog/ /srv/blog/

EXPOSE 80 443
