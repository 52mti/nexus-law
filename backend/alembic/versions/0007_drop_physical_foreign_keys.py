"""drop leftover physical foreign keys; keep indexes only

Revision ID: 0007_drop_physical_foreign_keys
Revises: 0006_requirements_schema
Create Date: 2026-09-16 12:05:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007_drop_physical_foreign_keys"
down_revision: str | None = "0006_requirements_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Already-applied 0001–0006 may have created FOREIGN KEY constraints.
    # New installs from edited revisions never create them; this is a no-op then.
    op.execute(
        sa.text(
            """
            DO $$
            DECLARE
                rec record;
            BEGIN
                FOR rec IN
                    SELECT
                        n.nspname AS schema_name,
                        c.relname AS table_name,
                        con.conname AS constraint_name
                    FROM pg_constraint AS con
                    JOIN pg_class AS c ON c.oid = con.conrelid
                    JOIN pg_namespace AS n ON n.oid = c.relnamespace
                    WHERE con.contype = 'f'
                      AND n.nspname = 'public'
                LOOP
                    EXECUTE format(
                        'ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I',
                        rec.schema_name,
                        rec.table_name,
                        rec.constraint_name
                    );
                END LOOP;
            END
            $$;
            """
        )
    )


def downgrade() -> None:
    # Physical FOREIGN KEY must not be recreated.
    pass
