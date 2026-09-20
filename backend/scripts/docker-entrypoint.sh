#!/bin/sh
set -e

echo "Running database migrations..."
if ! uv run alembic upgrade head; then
  echo "ERROR: alembic upgrade failed"
  uv run alembic current || true
  exit 1
fi
uv run alembic current || true

echo "Seeding commerce plans if empty..."
uv run python scripts/seed_commerce.py || echo "WARN: seed_commerce skipped"

echo "Starting application..."
exec uv "$@"
