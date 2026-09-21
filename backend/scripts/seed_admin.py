"""Insert the first super_admin account when missing."""

from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.core.config import get_settings
from app.core.password import hash_password
from app.db.models import User, UserStatus
from app.db.session import AsyncSessionLocal
from app.services.account import _bind_role, ensure_role, normalize_email, normalize_phone


async def seed() -> None:
    settings = get_settings()
    phone = normalize_phone(settings.admin_seed_phone)
    email = normalize_email(settings.admin_seed_email) if settings.admin_seed_email else None
    password = (settings.admin_seed_password or "").strip()
    if not password:
        print("ADMIN_SEED_PASSWORD is empty, skip seed")
        return
    if not phone and not email:
        print("ADMIN_SEED_PHONE / ADMIN_SEED_EMAIL missing, skip seed")
        return

    async with AsyncSessionLocal() as session:
        user = None
        if phone:
            user = (
                await session.execute(select(User).where(User.phone == phone))
            ).scalar_one_or_none()
        if user is None and email:
            user = (
                await session.execute(select(User).where(User.email == email))
            ).scalar_one_or_none()
        created = False
        if user is None:
            user = User(
                phone=phone,
                email=email,
                password_hash=hash_password(password),
                nickname=settings.admin_seed_nickname or "超级管理员",
                status=UserStatus.ACTIVE.value,
                points=0,
            )
            session.add(user)
            await session.flush()
            created = True
        elif user.is_deleted or user.status != UserStatus.ACTIVE.value:
            user.is_deleted = False
            user.status = UserStatus.ACTIVE.value
        role = await ensure_role(session, "super_admin")
        await _bind_role(session, user, role)
        await session.commit()
        action = "created" if created else "ensured"
        print(f"{action} super_admin user_id={user.id} phone={user.phone}")


if __name__ == "__main__":
    asyncio.run(seed())
