#!/bin/bash

echo -e "\n🚧 Step 1: Stopping containers and removing volumes..."
docker-compose down -v

echo -e "\n🧹 Step 2: Cleaning up system..."
docker system prune -af

echo -e "\n🔨 Step 3: Rebuilding images..."
docker-compose build

echo -e "\n🚀 Step 4: Starting services..."
docker-compose up -d

echo -e "\n✅ Done!"