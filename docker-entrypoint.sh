#!/bin/bash
set -e

# Create backup directories
mkdir -p /backups
mkdir -p /mnt/backup-storage

# Load CIFS kernel module if available
modprobe cifs 2>/dev/null || echo "CIFS module not available or already loaded"

# Run database migrations
echo "Running database migrations..."
cd /app
node apply-migration.js || echo "Migrations completed or already applied"

# Start nginx
echo "Starting nginx..."
nginx

# Start the application
cd /app
node dist/server/index.js
