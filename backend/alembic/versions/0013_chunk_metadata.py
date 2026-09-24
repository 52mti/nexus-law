"""document chunk statute metadata

Revision ID: 0013_chunk_metadata
Revises: 0012_notifications
Create Date: 2026-09-24 18:50:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0013_chunk_metadata"
down_revision: str | None = "0012_notifications"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("document_chunks", sa.Column("metadata_json", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("document_chunks", "metadata_json")
