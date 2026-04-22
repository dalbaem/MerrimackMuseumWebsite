#!/usr/bin/env bash
# This file loads the museum SQL files into the database.
set -euo pipefail

# This shows the help text for the script.
usage() {
  cat <<'EOF' >&2
Usage: bash scripts/import_database.sh [--dry-run]

Loads the museum-only SQL dump files from `database/` in dependency-safe
order. When DB_NAME is not provided, this script defaults to
`ArtMuseumMerrimack`.
EOF
}

DRY_RUN=0

case "${1:-}" in
  "")
    ;;
  --dry-run)
    DRY_RUN=1
    ;;
  -h|--help)
    usage
    exit 0
    ;;
  *)
    usage
    exit 1
    ;;
esac

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
DATABASE_DIR="$ROOT_DIR/database"
FRONTEND_ENV_FILE="$ROOT_DIR/merrimack-museum/.env.local"

# Preserve any environment variables passed in by the caller before loading
# the app's local defaults from merrimack-museum/.env.local.
CALLER_DB_NAME="${DB_NAME-}"
CALLER_DB_USER="${DB_USER-}"
CALLER_DB_PASSWORD="${DB_PASSWORD-}"
CALLER_DB_HOST="${DB_HOST-}"
CALLER_DB_PORT="${DB_PORT-}"

if [ -f "$FRONTEND_ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$FRONTEND_ENV_FILE"
  set +a
fi

if [ -n "$CALLER_DB_NAME" ]; then
  DB_NAME="$CALLER_DB_NAME"
else
  DB_NAME="ArtMuseumMerrimack"
fi
if [ -n "$CALLER_DB_USER" ]; then
  DB_USER="$CALLER_DB_USER"
fi
if [ -n "$CALLER_DB_PASSWORD" ]; then
  DB_PASSWORD="$CALLER_DB_PASSWORD"
fi
if [ -n "$CALLER_DB_HOST" ]; then
  DB_HOST="$CALLER_DB_HOST"
fi
if [ -n "$CALLER_DB_PORT" ]; then
  DB_PORT="$CALLER_DB_PORT"
fi

DB_NAME="${DB_NAME:-ArtMuseumMerrimack}"
DB_USER="${DB_USER:-}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_HOST="${DB_HOST:-}"
DB_PORT="${DB_PORT:-}"

missing_keys=()
for key in DB_NAME DB_USER DB_HOST DB_PORT; do
  if [ -z "${!key}" ]; then
    missing_keys+=("$key")
  fi
done

if [ "${#missing_keys[@]}" -gt 0 ]; then
  echo "Missing required database settings: ${missing_keys[*]}" >&2
  echo "Set them in merrimack-museum/.env.local or pass DB_* in the shell environment." >&2
  exit 1
fi

ordered_files=(
  "museum_user_type.sql"
  "museum_user.sql"
  "museum_artist.sql"
  "museum_category.sql"
  "museum_donor.sql"
  "museum_images.sql"
  "museum_location.sql"
  "museum_artwork.sql"
  "museum_move_request.sql"
)

for filename in "${ordered_files[@]}"; do
  if [ ! -f "$DATABASE_DIR/$filename" ]; then
    echo "Missing required SQL file: $DATABASE_DIR/$filename" >&2
    exit 1
  fi
done

discovered_files=()
while IFS= read -r filename; do
  discovered_files+=("$filename")
done < <(cd "$DATABASE_DIR" && printf '%s\n' *.sql | LC_ALL=C sort)

unlisted_files=()
for filename in "${discovered_files[@]}"; do
  is_listed=0
  for listed_file in "${ordered_files[@]}"; do
    if [ "$filename" = "$listed_file" ]; then
      is_listed=1
      break
    fi
  done

  if [ "$is_listed" -eq 0 ]; then
    unlisted_files+=("$filename")
  fi
done

echo "Database target: $DB_NAME on $DB_HOST:$DB_PORT as $DB_USER" >&2
echo "SQL files to load: ${#ordered_files[@]}" >&2

if [ "${#unlisted_files[@]}" -gt 0 ]; then
  echo "Warning: these SQL files are not part of the import order and will be skipped:" >&2
  for filename in "${unlisted_files[@]}"; do
    echo "  - $filename" >&2
  done
fi

if [ "$DRY_RUN" -eq 1 ]; then
  for filename in "${ordered_files[@]}"; do
    echo "  - $filename" >&2
  done
  exit 0
fi

if ! command -v mysql >/dev/null 2>&1; then
  echo "The mysql client was not found in PATH." >&2
  echo "Install the MySQL command-line client, then rerun this script." >&2
  exit 1
fi

mysql_admin_args=(
  --default-character-set=utf8mb4
  --host="$DB_HOST"
  --port="$DB_PORT"
  --user="$DB_USER"
)

create_database_sql="CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"

echo "Ensuring database exists..." >&2

if [ -n "$DB_PASSWORD" ]; then
  printf '%s\n' "$create_database_sql" | MYSQL_PWD="$DB_PASSWORD" mysql "${mysql_admin_args[@]}"
else
  printf '%s\n' "$create_database_sql" | mysql "${mysql_admin_args[@]}"
fi

mysql_args=(
  "${mysql_admin_args[@]}"
  "$DB_NAME"
)

echo "Importing SQL files..." >&2

if [ -n "$DB_PASSWORD" ]; then
  {
    printf 'SET FOREIGN_KEY_CHECKS=0;\n'
    for filename in "${ordered_files[@]}"; do
      echo "  - loading $filename" >&2
      cat "$DATABASE_DIR/$filename"
      printf '\n'
    done
    printf 'SET FOREIGN_KEY_CHECKS=1;\n'
  } | MYSQL_PWD="$DB_PASSWORD" mysql "${mysql_args[@]}"
else
  {
    printf 'SET FOREIGN_KEY_CHECKS=0;\n'
    for filename in "${ordered_files[@]}"; do
      echo "  - loading $filename" >&2
      cat "$DATABASE_DIR/$filename"
      printf '\n'
    done
    printf 'SET FOREIGN_KEY_CHECKS=1;\n'
  } | mysql "${mysql_args[@]}"
fi

echo "Database import completed." >&2
