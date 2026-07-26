#!/bin/bash
set -euo pipefail

BACKUP_FILE="${1:-}"
DB_URL="${DATABASE_URL:-postgresql://hms:hms-secret@localhost:5432/hms}"

if [ -z "$BACKUP_FILE" ]; then
  # Use latest backup if no file specified
  BACKUP_DIR="${BACKUP_DIR:-./backups}"
  BACKUP_FILE="$BACKUP_DIR/latest.sql.gz"
  if [ ! -f "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file>"
    echo "  or set BACKUP_DIR to use latest backup"
    exit 1
  fi
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "[$(date)] Starting restore from: $BACKUP_FILE"
gunzip -c "$BACKUP_FILE" | psql "$DB_URL"
echo "[$(date)] Restore complete."
