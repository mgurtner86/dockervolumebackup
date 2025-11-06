#!/bin/bash

echo "Starting Docker Compose services (PostgreSQL)..."
docker-compose up -d postgres

echo "Waiting for PostgreSQL to be ready..."
sleep 5

echo "Starting development servers..."
npm run dev
