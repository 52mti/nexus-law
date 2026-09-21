"""add audit:view permission for admin operation logs

Revision ID: 0009_audit_view_permission
Revises: 0008_verification_codes
Create Date: 2026-09-21 11:30:00
"""

from collections.abc import Sequence
from uuid import uuid4

import sqlalchemy as sa
from alembic import op

revision: str = "0009_audit_view_permission"
down_revision: str | None = "0008_verification_codes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PERM_CODE = "audit:view"
ADMIN_ROLE_CODES = ("super_admin", "admin")


def upgrade() -> None:
    bind = op.get_bind()
    existing = bind.execute(
        sa.text("SELECT id FROM permissions WHERE code = :code AND is_deleted = false"),
        {"code": PERM_CODE},
    ).fetchone()
    if existing:
        perm_id = existing[0]
    else:
        perm_id = str(uuid4())
        bind.execute(
            sa.text(
                """
                INSERT INTO permissions (id, code, name, "type")
                VALUES (:id, :code, :name, :perm_type)
                """
            ),
            {
                "id": perm_id,
                "code": PERM_CODE,
                "name": "查看操作日志",
                "perm_type": "api",
            },
        )

    for code in ADMIN_ROLE_CODES:
        role = bind.execute(
            sa.text("SELECT id FROM roles WHERE code = :code AND is_deleted = false"),
            {"code": code},
        ).fetchone()
        if not role:
            continue
        role_id = role[0]
        already = bind.execute(
            sa.text(
                """
                SELECT id FROM role_permissions
                WHERE role_id = :role_id AND permission_id = :perm_id AND is_deleted = false
                """
            ),
            {"role_id": role_id, "perm_id": perm_id},
        ).fetchone()
        if already:
            continue
        bind.execute(
            sa.text(
                """
                INSERT INTO role_permissions (id, role_id, permission_id)
                VALUES (:id, :role_id, :permission_id)
                """
            ),
            {"id": str(uuid4()), "role_id": role_id, "permission_id": perm_id},
        )


def downgrade() -> None:
    bind = op.get_bind()
    perm = bind.execute(
        sa.text("SELECT id FROM permissions WHERE code = :code"),
        {"code": PERM_CODE},
    ).fetchone()
    if not perm:
        return
    bind.execute(
        sa.text("DELETE FROM role_permissions WHERE permission_id = :perm_id"),
        {"perm_id": perm[0]},
    )
    bind.execute(
        sa.text("DELETE FROM permissions WHERE id = :perm_id"),
        {"perm_id": perm[0]},
    )
