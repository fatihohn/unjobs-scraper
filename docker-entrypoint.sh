#!/bin/bash
set -e

echo "Install packages..."
yarn
echo "Package installation complete!"

echo "Building application..."
yarn build
echo "Application build complete!"

yarn add pm2@5.4.3
npx pm2 start --name "unjobs-scraper" yarn -- run dev
npx pm2 logs
tail -f /dev/null
