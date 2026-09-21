from collections.abc import Callable, Coroutine
from dataclasses import dataclass
from typing import Any

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AccountContext, require_account
from app.core.biz import BizCode, BizError
from app.db.models import User
from app.services.admin.common import ADMIN_ROLE_CODES, SUPER_ADMIN_CODE
from app.services.admin.rbac import load_permission_codes, load_role_codes


@dataclass
class AdminContext:
    session: AsyncSession
    user: User
    role_codes: list[str]
    permission_codes: list[str]

    @property
    def is_super_admin(self) -> bool:
        return SUPER_ADMIN_CODE in self.role_codes


async def require_admin(ctx: AccountContext = Depends(require_account)) -> AdminContext:
    role_codes = await load_role_codes(ctx.session, ctx.user.id)
    if not ADMIN_ROLE_CODES.intersection(role_codes):
        raise BizError(BizCode.FORBIDDEN, "无后台权限")
    permission_codes = await load_permission_codes(ctx.session, ctx.user.id)
    return AdminContext(
        session=ctx.session,
        user=ctx.user,
        role_codes=role_codes,
        permission_codes=permission_codes,
    )


def require_permission(code: str) -> Callable[..., Coroutine[Any, Any, AdminContext]]:
    async def _checker(ctx: AdminContext = Depends(require_admin)) -> AdminContext:
        if ctx.is_super_admin:
            return ctx
        if code not in ctx.permission_codes:
            raise BizError(BizCode.FORBIDDEN, "权限不足")
        return ctx

    return _checker


async def require_super_admin(ctx: AdminContext = Depends(require_admin)) -> AdminContext:
    if not ctx.is_super_admin:
        raise BizError(BizCode.FORBIDDEN, "仅超级管理员可执行该操作")
    return ctx
