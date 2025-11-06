#!/bin/bash
set -e

mkdir -p /backups

nginx

cd /app
node server/index.js
