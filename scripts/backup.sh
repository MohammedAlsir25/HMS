#!/bin/bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_URL="${DATABASE_URL:-postgresql://hms:hms-secret@localhost:5432/hms}"
RETENTION_DAILY="${RETENTION_DAILY:-7}"
RETENTION_WEEKLY="${RETENTION_WEEKLY:-4}"

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

FILENAME="hms_backup_$TIMESTAMP.sql.gz"
BACKUP_PATH="$BACKUP_DIR/daily/$FILENAME"

echo "[$(date)] Starting backup..."
pg_dump "$DB_URL" --no-owner --clean --if-exists | gzip > "$BACKUP_PATH"
echo "[$(date)] Backup saved: $BACKUP_PATH"

# Verify backup integrity
gunzip -t "$BACKUP_PATH" || { echo "Backup corrupted: $BACKUP_PATH"; exit 1; }
echo "[$(date)] Backup integrity verified."

# Update latest symlink
ln -sf "$BACKUP_PATH" "$BACKUP_DIR/latest.sql.gz"

# Weekly rotation (keep one per week)
DOW=$(date +%u)
if [ "$DOW" = "7" ]; then
  cp "$BACKUP_PATH" "$BACKUP_DIR/weekly/hms_backup_$(date +%Y%W).sql.gz"
fi

# Cleanup old daily backups
find "$BACKUP_DIR/daily" -name "*.sql.gz" -mtime +$RETENTION_DAILY -delete
echo "[$(date)] Cleaned daily backups older than $RETENTION_DAILY days."

# Cleanup old weekly backups (keep last N)
ls -t "$BACKUP_DIR/weekly"/*.sql.gz 2>/dev/null | tail -n +$((RETENTION_WEEKLY + 1)) | xargs -r rm
echo "[$(date)] Cleaned weekly backups older than $RETENTION_WEEKLY weeks."

echo "[$(date)] Backup complete."
