FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:18-alpine

RUN apk add --no-cache docker-cli bash tar gzip nginx cifs-utils kmod

WORKDIR /app

COPY --from=builder /app/dist/client /usr/share/nginx/html
COPY --from=builder /app/dist/server ./dist/server
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

COPY nginx.conf /etc/nginx/http.d/default.conf

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

RUN mkdir -p /backups

EXPOSE 80 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
