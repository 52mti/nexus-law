from __future__ import annotations

from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Notification, NotificationRead
from app.services.commerce import page_meta


def _dump(row: Notification, *, is_read: bool) -> dict[str, Any]:
    return {
        "id": row.id,
        "type": row.type,
        "title": row.title,
        "content": row.content or "",
        "biz_id": row.biz_id,
        "extra": row.extra_json or {},
        "is_read": is_read,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _visible(user_id: str):
    return or_(Notification.user_id == user_id, Notification.user_id.is_(None))


async def create_notification(
    session: AsyncSession,
    *,
    user_id: str | None,
    ntype: str,
    title: str,
    content: str = "",
    biz_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> Notification | None:
    """Insert a notice. The same user, type, and biz_id is written only once."""
    if biz_id:
        existing = await session.execute(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.type == ntype,
                Notification.biz_id == biz_id,
                Notification.is_deleted.is_(False),
            )
        )
        found = existing.scalar_one_or_none()
        if found:
            return found

    row = Notification(
        user_id=user_id,
        type=ntype,
        title=title,
        content=content,
        biz_id=biz_id,
        extra_json=extra or None,
    )
    session.add(row)
    await session.flush()
    return row


async def list_notifications(
    session: AsyncSession,
    *,
    user_id: str,
    current: int = 1,
    size: int = 20,
) -> dict[str, Any]:
    filters = [Notification.is_deleted.is_(False), _visible(user_id)]
    total = int(
        (
            await session.execute(select(func.count()).select_from(Notification).where(*filters))
        ).scalar_one()
    )
    read_ids_stmt = select(NotificationRead.notification_id).where(
        NotificationRead.user_id == user_id,
        NotificationRead.is_deleted.is_(False),
    )
    unread = int(
        (
            await session.execute(
                select(func.count())
                .select_from(Notification)
                .where(*filters, Notification.id.not_in(read_ids_stmt))
            )
        ).scalar_one()
    )
    stmt = (
        select(Notification)
        .where(*filters)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .offset((current - 1) * size)
        .limit(size)
    )
    rows = list((await session.execute(stmt)).scalars().all())
    read_ids: set[str] = set()
    if rows:
        marked = await session.execute(
            select(NotificationRead.notification_id).where(
                NotificationRead.user_id == user_id,
                NotificationRead.notification_id.in_([row.id for row in rows]),
                NotificationRead.is_deleted.is_(False),
            )
        )
        read_ids = set(marked.scalars().all())
    return {
        "records": [_dump(row, is_read=row.id in read_ids) for row in rows],
        "unread": unread,
        **page_meta(total, current, size),
    }


async def mark_notifications_read(
    session: AsyncSession,
    *,
    user_id: str,
    id_list: list[str] | None = None,
) -> dict[str, int]:
    filters = [Notification.is_deleted.is_(False), _visible(user_id)]
    if id_list:
        filters.append(Notification.id.in_(id_list))
    ids = list((await session.execute(select(Notification.id).where(*filters))).scalars().all())
    if not ids:
        return {"updated": 0}
    existing = set(
        (
            await session.execute(
                select(NotificationRead.notification_id).where(
                    NotificationRead.user_id == user_id,
                    NotificationRead.notification_id.in_(ids),
                    NotificationRead.is_deleted.is_(False),
                )
            )
        ).scalars().all()
    )
    updated = 0
    for notice_id in ids:
        if notice_id in existing:
            continue
        session.add(NotificationRead(user_id=user_id, notification_id=notice_id))
        updated += 1
    await session.flush()
    return {"updated": updated}
