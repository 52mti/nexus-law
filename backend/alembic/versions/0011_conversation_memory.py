"""conversation memory summary and locked title

Revision ID: 0011_conversation_memory
Revises: 0010_agent_graph_code_and_runs
Create Date: 2026-09-23 12:50:00
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0011_conversation_memory"
down_revision: str | None = "0010_agent_graph_code_and_runs"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("conversations", sa.Column("memory_summary", sa.Text(), nullable=True))
    op.add_column(
        "conversations",
        sa.Column("summary_until_message_id", sa.String(length=36), nullable=True),
    )
    op.add_column(
        "conversations",
        sa.Column(
            "title_locked",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("conversations", "title_locked")
    op.drop_column("conversations", "summary_until_message_id")
    op.drop_column("conversations", "memory_summary")
