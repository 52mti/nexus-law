"""FastAPI dependency injection helpers."""

from collections.abc import AsyncGenerator

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.rate_limit import check_rate_limit
from app.core.security import Principal, authenticate_request
from app.db.session import get_db_session


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
    client_host = request.client.host if request.client else "unknown"
    identity = f"{principal.subject}:{client_host}"
    await check_rate_limit(identity, settings=settings)
    return principal


# Alias used by routers
RequireAuth = Depends(require_principal)
