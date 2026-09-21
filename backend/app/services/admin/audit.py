from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.biz import BizCode, BizError
from app.db.models import AdminAuditLog, User
from app.services.admin.common import iso, page_meta


def dump_audit(item: AdminAuditLog, admin: User | None = None) -> dict[str, Any]:
    data: dict[str, Any] = {
        "id": item.id,
        "admin_id": item.admin_id,
        "action": item.action,
        "target_type": item.target_type,
        "target_id": item.target_id,
        "detail": item.detail_json,
        "created_at": iso(item.created_at),
    }
    if admin:
        data["admin"] = {
            "id": admin.id,
            "nickname": admin.nickname,
            "phone": admin.phone,
            "email": admin.email,
        }
    return data


async def list_audits(
    session: AsyncSession,
    *,
    admin_id: str | None = None,
    action: str | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
    current: int = 1,
    size: int = 20,
) -> dict[str, Any]:
    filters = [AdminAuditLog.is_deleted.is_(False)]
    if admin_id:
        filters.append(AdminAuditLog.admin_id == admin_id)
    if action:
        filters.append(AdminAuditLog.action == action)
    if target_type:
        filters.append(AdminAuditLog.target_type == target_type)
    if target_id:
        filters.append(AdminAuditLog.target_id == target_id)
    if start_at:
        filters.append(AdminAuditLog.created_at >= start_at)
    if end_at:
        filters.append(AdminAuditLog.created_at <= end_at)
    total = int(
        (
            await session.execute(
                select(func.count()).select_from(AdminAuditLog).where(*filters)
            )
        ).scalar_one()
    )
    rows = list(
        (
            await session.execute(
                select(AdminAuditLog)
                .where(*filters)
                .order_by(AdminAuditLog.created_at.desc(), AdminAuditLog.id.desc())
                .offset((current - 1) * size)
                .limit(size)
            )
        )
        .scalars()
        .all()
    )
    admin_ids = [item.admin_id for item in rows if item.admin_id]
    admins: dict[str, User] = {}
    if admin_ids:
        admin_rows = (
            await session.execute(select(User).where(User.id.in_(admin_ids)))
        ).scalars().all()
        admins = {item.id: item for item in admin_rows}
    return {
        "records": [dump_audit(item, admins.get(item.admin_id or "")) for item in rows],
        **page_meta(total, current, size),
    }


async def get_audit_detail(session: AsyncSession, audit_id: str) -> dict[str, Any]:
    result = await session.execute(
        select(AdminAuditLog).where(
            AdminAuditLog.id == audit_id,
            AdminAuditLog.is_deleted.is_(False),
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise BizError(BizCode.AUDIT_NOT_FOUND, "操作日志不存在")
    admin = await session.get(User, item.admin_id) if item.admin_id else None
    return dump_audit(item, admin)
