"""FastAPI dependency injection helpers."""

from collections.abc import AsyncGenerator
from dataclasses import dataclass

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.biz import BizCode, BizError
from app.core.config import Settings, get_settings
from app.core.exceptions import AppError
from app.core.jwt import decode_access_token
from app.core.rate_limit import check_rate_limit
from app.core.security import Principal, authenticate_request
from app.db.models import User
from app.db.session import get_db_session
from app.services import account as account_service


def get_app_settings() -> Settings:
    return get_settings()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db_session():
        yield session


async def require_principal(request: Request) -> Principal:
    settings = get_settings()
    principal = authenticate_request(request, settings)
    assert principal is not None
    request.state.principal = principal

    should_rate_limit = settings.rate_limit_enabled and not principal.is_vip
    if (
        should_rate_limit
        and principal.auth_type == "kong_jwt"
        and settings.skip_app_rate_limit_for_gateway
    ):
        should_rate_limit = False

    if should_rate_limit:
        client_host = request.client.host if request.client else "unknown"
        identity = f"{principal.subject}:{client_host}"
        await check_rate_limit(identity, settings=settings)

    return principal


# Alias used by routers
RequireAuth = Depends(require_principal)


@dataclass
class AccountContext:
    session: AsyncSession
    user: User


async def require_account(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> AccountContext:
    authorization = request.headers.get("authorization") or ""
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise BizError(BizCode.UNAUTHORIZED, "未登录或登录已过期")
    settings = get_settings()
    try:
        payload = decode_access_token(token.strip(), settings=settings)
    except AppError as exc:
        code = BizCode.TOKEN_EXPIRED if "expired" in exc.message.lower() else BizCode.UNAUTHORIZED
        raise BizError(code, "未登录或登录已过期") from exc
    user_id = str(payload.get("user_id") or payload.get("sub") or "")
    if not user_id:
        raise BizError(BizCode.UNAUTHORIZED, "未登录或登录已过期")
    user = await account_service.get_active_user_by_id(session, user_id)
    return AccountContext(session=session, user=user)
