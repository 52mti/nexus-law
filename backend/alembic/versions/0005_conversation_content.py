"""conversations.content; title is last user question

Revision ID: 0005_conversation_content
Revises: 0004_datasets
Create Date: 2026-09-14 09:11:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_conversation_content"
down_revision: str | None = "0004_datasets"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("conversations", sa.Column("content", sa.Text(), nullable=True))
    op.execute(
        """
        UPDATE conversations AS c
        SET
            title = LEFT(
                COALESCE(
                    (
                        SELECT m.content
                        FROM messages AS m
                        WHERE m.conversation_id = c.id AND m.role = 'user'
                        ORDER BY m.created_at DESC, m.id DESC
                        LIMIT 1
                    ),
                    c.title
                ),
                255
            ),
            content = (
                SELECT m.content
                FROM messages AS m
                WHERE m.conversation_id = c.id AND m.role = 'assistant'
                ORDER BY m.created_at DESC, m.id DESC
                LIMIT 1
            )
        """
    )


def downgrade() -> None:
    op.drop_column("conversations", "content")
