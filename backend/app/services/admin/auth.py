from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.biz import BizCode, BizError
from app.core.config import Settings, get_settings
from app.db.models import User
from app.services import account as account_service
from app.services.admin.common import ADMIN_ROLE_CODES
from app.services.admin.rbac import load_permission_codes, load_role_codes


def _with_permissions(payload: dict[str, Any], permission_codes: list[str]) -> dict[str, Any]:
    user = dict(payload.get("user") or {})
    user["permission_codes"] = permission_codes
    data = dict(payload)
    data["user"] = user
    data["permission_codes"] = permission_codes
    return data


async def assert_admin_roles(role_codes: list[str]) -> None:
    if not ADMIN_ROLE_CODES.intersection(role_codes):
        raise BizError(BizCode.FORBIDDEN, "无后台权限")


async def login(
    session: AsyncSession,
    *,
    login_type: str,
    phone: str | None,
    email: str | None,
    password: str | None,
    code: str | None,
    settings: Settings | None = None,
) -> dict[str, Any]:
    payload = await account_service.login(
        session,
        login_type=login_type,
        phone=phone,
        email=email,
        password=password,
        code=code,
        settings=settings or get_settings(),
    )
    user = payload.get("user") or {}
    role_codes = list(user.get("role_codes") or [])
    await assert_admin_roles(role_codes)
    permission_codes = await load_permission_codes(session, str(user["id"]))
    return _with_permissions(payload, permission_codes)


async def profile(session: AsyncSession, user: User) -> dict[str, Any]:
    role_codes = await load_role_codes(session, user.id)
    await assert_admin_roles(role_codes)
    permission_codes = await load_permission_codes(session, user.id)
    data = account_service.to_profile(user, role_codes).model_dump()
    data["permission_codes"] = permission_codes
    return data
