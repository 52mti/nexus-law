from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AdminAuditLog


async def write_audit(
    session: AsyncSession,
    *,
    admin_id: str,
    action: str,
    target_type: str,
    target_id: str | None = None,
    detail: dict[str, Any] | list | None = None,
) -> AdminAuditLog:
    row = AdminAuditLog(
        admin_id=admin_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        detail_json=detail,
    )
    session.add(row)
    await session.flush()
    return row
