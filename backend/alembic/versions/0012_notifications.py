"""in-app notifications

Revision ID: 0012_notifications
Revises: 0011_conversation_memory
Create Date: 2026-09-23 15:30:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0012_notifications"
down_revision: str | None = "0011_conversation_memory"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("is_deleted", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=128), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("biz_id", sa.String(length=36), nullable=True),
        sa.Column("extra_json", sa.JSON(), nullable=True),
    )
    op.create_index(op.f("ix_notifications_is_deleted"), "notifications", ["is_deleted"])
    op.create_index(op.f("ix_notifications_user_id"), "notifications", ["user_id"])
    op.create_index(op.f("ix_notifications_type"), "notifications", ["type"])
    op.create_index(op.f("ix_notifications_biz_id"), "notifications", ["biz_id"])
    op.create_index("ix_notifications_user_created", "notifications", ["user_id", "created_at"])

    op.create_table(
        "notification_reads",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("is_deleted", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("notification_id", sa.String(length=36), nullable=False),
        sa.UniqueConstraint("user_id", "notification_id", name="uq_notification_reads_user_notice"),
    )
    op.create_index(
        op.f("ix_notification_reads_is_deleted"), "notification_reads", ["is_deleted"]
    )
    op.create_index(op.f("ix_notification_reads_user_id"), "notification_reads", ["user_id"])
    op.create_index(
        op.f("ix_notification_reads_notification_id"),
        "notification_reads",
        ["notification_id"],
    )


def downgrade() -> None:
    op.drop_table("notification_reads")
    op.drop_table("notifications")
