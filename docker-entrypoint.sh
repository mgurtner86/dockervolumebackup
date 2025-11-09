#!/bin/bash
set -e

# Create backup directories
mkdir -p /backups
mkdir -p /mnt/backup-storage
mkdir -p /var/www/certbot

# Load CIFS kernel module if available
modprobe cifs 2>/dev/null || echo "CIFS module not available or already loaded"

# Check if SSL certificates exist, if not obtain them
if [ ! -f "/etc/letsencrypt/live/${DOMAIN:-dvbm.computech.ch}/fullchain.pem" ]; then
    echo "SSL certificates not found. Starting nginx in HTTP-only mode for certificate generation..."
    # Temporarily start nginx for certbot verification
    cat > /etc/nginx/http.d/default.conf << 'EOF'
server {
    listen 80;
    server_name _;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
EOF
    nginx

    echo "Obtaining SSL certificate..."
    certbot certonly --webroot -w /var/www/certbot \
        -d ${DOMAIN:-dvbm.computech.ch} \
        --non-interactive --agree-tos \
        --email admin@${DOMAIN:-dvbm.computech.ch} \
        || echo "Certificate generation failed. Please check domain DNS and firewall settings."

    # Reload nginx with SSL config if certificate was obtained
    if [ -f "/etc/letsencrypt/live/${DOMAIN:-dvbm.computech.ch}/fullchain.pem" ]; then
        echo "Certificate obtained! Restarting nginx with SSL..."
        nginx -s stop
        cp /app/../nginx.conf /etc/nginx/http.d/default.conf
        nginx
    else
        echo "Running without SSL. Fix certificate issues and restart container."
    fi
else
    echo "SSL certificates found. Starting nginx..."
    nginx
fi

# Start the application
cd /app
node dist/server/index.js
