"""HITL document status, raw_content, chunk updated_at

Revision ID: 0003_hitl_document_status
Revises: 0002_documents_chunks
Create Date: 2026-07-21 13:20:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_hitl_document_status"
down_revision: str | None = "0002_documents_chunks"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("raw_content", sa.LargeBinary(), nullable=True))
    # Map legacy statuses onto HITL lifecycle.
    op.execute(
        sa.text(
            "UPDATE documents SET status = 'published' WHERE status IN ('ready', 'pending')"
        )
    )
    op.execute(sa.text("UPDATE documents SET status = 'failed' WHERE status = 'failed'"))

    op.add_column(
        "document_chunks",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("document_chunks", "updated_at")
    op.execute(
        sa.text(
            "UPDATE documents SET status = 'ready' WHERE status IN "
            "('draft', 'published', 'publishing', 'uploading', 'parsing')"
        )
    )
    op.execute(
        sa.text(
            "UPDATE documents SET status = 'pending' WHERE status IN ('discarded')"
        )
    )
    op.drop_column("documents", "raw_content")
