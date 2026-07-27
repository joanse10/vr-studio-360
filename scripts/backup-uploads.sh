#!/bin/bash
# Uploads backup script — run via cron daily
# crontab: 0 2 * * * /var/www/vr-studio-360/scripts/backup-uploads.sh

UPLOADS_DIR="/var/www/vr-studio-360/public/uploads"
BACKUP_DIR="/backups/uploads"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting uploads backup..."

rsync -avz --delete "$UPLOADS_DIR/" "$BACKUP_DIR/"

if [ $? -eq 0 ]; then
  echo "[$(date)] Uploads backup complete."
else
  echo "[$(date)] ERROR: Uploads backup failed!"
  exit 1
fi
