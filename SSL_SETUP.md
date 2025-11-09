# SSL/HTTPS Setup Guide

This application now supports HTTPS using Let's Encrypt SSL certificates.

## Prerequisites

1. Your domain `dvbm.computech.ch` must point to your server's IP address
2. Ports 80 and 443 must be accessible from the internet
3. Firewall must allow incoming connections on ports 80 and 443

## Setup Steps

### 1. Update Azure AD Redirect URI

In Azure Portal → App Registrations → Your App → Authentication:
- Add redirect URI: `https://dvbm.computech.ch/auth/callback`
- Save changes

### 2. Deploy with Docker Compose

The `docker-compose.yml` has been updated to include:
- Port 8443 for HTTPS traffic
- REDIRECT_URI environment variable set to HTTPS
- Certbot volumes for SSL certificate storage

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### 3. First Run - Certificate Generation

On first run, the container will:
1. Start nginx in HTTP-only mode
2. Attempt to obtain SSL certificate from Let's Encrypt
3. Automatically restart nginx with SSL enabled if successful

**Important**: Make sure your domain DNS is properly configured before starting.

### 4. Port Forwarding

Update your router/firewall to forward:
- Port 80 → Server Port 8080 (for certificate renewal)
- Port 443 → Server Port 8443 (for HTTPS traffic)

Or if you're using different external ports, adjust accordingly.

## Troubleshooting

### Certificate Generation Failed

If certificate generation fails:

1. **Check DNS**: Verify `dvbm.computech.ch` resolves to your server
   ```bash
   nslookup dvbm.computech.ch
   ```

2. **Check Firewall**: Ensure port 80 is accessible
   ```bash
   curl http://dvbm.computech.ch/.well-known/acme-challenge/test
   ```

3. **Check Logs**:
   ```bash
   docker-compose logs backup-manager
   ```

4. **Manual Certificate Generation**:
   ```bash
   docker-compose exec backup-manager certbot certonly --webroot \
     -w /var/www/certbot \
     -d dvbm.computech.ch \
     --non-interactive --agree-tos \
     --email your-email@example.com
   ```

### Running Without SSL (Development)

If you want to run without SSL temporarily, you can:
1. Keep the old `nginx.conf` (HTTP only)
2. Use `http://` redirect URI
3. Skip the certificate generation

## Certificate Renewal

Let's Encrypt certificates expire after 90 days. To auto-renew:

```bash
# Add to crontab (run twice daily)
0 0,12 * * * docker-compose exec backup-manager certbot renew --quiet
```

## Production Recommendations

For production, consider:
1. Using a proper reverse proxy (Traefik, Caddy, or dedicated nginx)
2. Setting up automatic certificate renewal
3. Implementing proper monitoring and alerting
4. Using a CDN for additional security
