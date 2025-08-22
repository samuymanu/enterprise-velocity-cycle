#!/bin/bash
# backup.sh - Script de backup de la base de datos PostgreSQL
# Uso: ./backup.sh

set -e

DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="./backups"
DB_URL=${DATABASE_URL:-"postgresql://postgres:300000@localhost:5432/bikeshop_erp?schema=public"}

mkdir -p "$BACKUP_DIR"

pg_dump "$DB_URL" > "$BACKUP_DIR/bikeshop_erp_$DATE.sql"
echo "Backup realizado en $BACKUP_DIR/bikeshop_erp_$DATE.sql"
