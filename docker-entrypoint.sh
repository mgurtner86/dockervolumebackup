#!/bin/bash
set -e

# Create backup directories
mkdir -p /backups
mkdir -p /mnt/backup-storage

# Load CIFS kernel module if available
modprobe cifs 2>/dev/null || echo "CIFS module not available or already loaded"

# Start nginx
nginx

# Start the application
cd /app
node server/index.js
