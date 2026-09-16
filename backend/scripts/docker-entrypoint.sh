#!/bin/sh
set -e

echo "Running database migrations..."
if ! uv run alembic upgrade head; then
  echo "ERROR: alembic upgrade failed"
  uv run alembic current || true
  exit 1
fi
uv run alembic current || true

echo "Starting application..."
exec uv "$@"
