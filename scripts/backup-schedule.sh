#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="${LOG_DIR:-./backups/logs}"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/backup_$TIMESTAMP.log"

echo "[$(date)] Starting scheduled backup..." | tee "$LOG_FILE"

if bash "$SCRIPT_DIR/backup.sh" >> "$LOG_FILE" 2>&1; then
  echo "[$(date)] Backup completed successfully." | tee -a "$LOG_FILE"
else
  echo "[$(date)] ERROR: Backup failed. Check $LOG_FILE" | tee -a "$LOG_FILE"
  exit 1
fi

find "$LOG_DIR" -name "backup_*.log" -mtime +30 -delete 2>/dev/null

echo "[$(date)] Schedule run complete." | tee -a "$LOG_FILE"
