#!/bin/bash
# PostgreSQL backup script — run via cron every hour
# crontab: 0 * * * * /var/www/vr-studio-360/scripts/backup-db.sh

BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting database backup..."

pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/vr_studio_$TIMESTAMP.sql.gz"

if [ $? -eq 0 ]; then
  echo "[$(date)] Backup created: vr_studio_$TIMESTAMP.sql.gz"
else
  echo "[$(date)] ERROR: Backup failed!"
  exit 1
fi

# Clean up old backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] Cleaned up backups older than $RETENTION_DAYS days"
echo "[$(date)] Backup complete."
