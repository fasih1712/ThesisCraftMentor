FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY index.html favicon.ico /srv/
COPY assets/ /srv/assets/

EXPOSE 80 443
