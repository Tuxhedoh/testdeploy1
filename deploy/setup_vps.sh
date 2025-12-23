#!/bin/bash

# Configuration
SITE_DOMAIN="my-app"
WEB_ROOT="/var/www/$SITE_DOMAIN"
# The actual deployment target
DEPLOY_TARGET="$WEB_ROOT/current"
USER_NAME=$1

if [ -z "$USER_NAME" ]; then
    echo "Usage: sudo ./setup_vps.sh <your_user_name>"
    exit 1
fi

echo "Setting up VPS for $SITE_DOMAIN..."

# Create directory structure
sudo mkdir -p "$DEPLOY_TARGET"

# Set permissions
sudo chown -R $USER_NAME:www-data "$WEB_ROOT"
sudo chmod -R 775 "$WEB_ROOT"

# Create a dummy index.html if it doesn't exist
if [ ! -f "$DEPLOY_TARGET/index.html" ]; then
    echo "<h1>Deploying MemeGenie...</h1>" | sudo tee "$DEPLOY_TARGET/index.html"
fi

echo "Directories created at $WEB_ROOT"
echo "Please copy the nginx.conf to /etc/nginx/sites-available/$SITE_DOMAIN and symlink to sites-enabled."
