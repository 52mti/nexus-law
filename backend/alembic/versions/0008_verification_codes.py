"""verification codes for account module

Revision ID: 0008_verification_codes
Revises: 0007_drop_physical_foreign_keys
Create Date: 2026-09-17 10:20:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008_verification_codes"
down_revision: str | None = "0007_drop_physical_foreign_keys"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "verification_codes",
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
        sa.Column("target", sa.String(length=255), nullable=False),
        sa.Column("channel", sa.String(length=16), nullable=False),
        sa.Column("scene", sa.String(length=32), nullable=False),
        sa.Column("code", sa.String(length=16), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.create_index(op.f("ix_verification_codes_is_deleted"), "verification_codes", ["is_deleted"])
    op.create_index(op.f("ix_verification_codes_target"), "verification_codes", ["target"])
    op.create_index(op.f("ix_verification_codes_scene"), "verification_codes", ["scene"])
    op.create_index(op.f("ix_verification_codes_expires_at"), "verification_codes", ["expires_at"])
    op.create_index(
        "ix_verification_codes_target_scene",
        "verification_codes",
        ["target", "scene"],
    )


def downgrade() -> None:
    op.drop_index("ix_verification_codes_target_scene", table_name="verification_codes")
    op.drop_index(op.f("ix_verification_codes_expires_at"), table_name="verification_codes")
    op.drop_index(op.f("ix_verification_codes_scene"), table_name="verification_codes")
    op.drop_index(op.f("ix_verification_codes_target"), table_name="verification_codes")
    op.drop_index(op.f("ix_verification_codes_is_deleted"), table_name="verification_codes")
    op.drop_table("verification_codes")
