from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.biz import ok
from app.core.config import get_settings
from app.core.jwt import create_access_token
from app.db.session import get_db_session
from app.schemas.account import (
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SendCodeRequest,
)
from app.schemas.auth import TokenData, TokenRequest, TokenResponse
from app.services import account as account_service

router = APIRouter(tags=["auth"])


@router.post("/auth/token", response_model=TokenResponse)
async def issue_token(request: Request, body: TokenRequest) -> TokenResponse:
    """Issue a JWT for Kong gateway testing (public route, no auth required)."""
    settings = get_settings()
    token = create_access_token(body.user_id, body.tier, settings=settings)
    return TokenResponse(
        data=TokenData(
            access_token=token,
            tier=body.tier,
            user_id=body.user_id,
            expires_in_hours=settings.jwt_expire_hours,
        ),
        request_id=getattr(request.state, "request_id", None),
    )


@router.post("/auth/send_code")
async def send_code(
    body: SendCodeRequest,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    data = await account_service.send_code(
        session,
        scene=body.scene,
        phone=body.phone,
        email=body.email,
    )
    return ok(data)


@router.post("/auth/register")
async def register(
    body: RegisterRequest,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    data = await account_service.register(
        session,
        code=body.code,
        password=body.password,
        phone=body.phone,
        email=body.email,
        nickname=body.nickname,
    )
    return ok(data)


@router.post("/auth/login")
async def login(
    body: LoginRequest,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    data = await account_service.login(
        session,
        login_type=body.login_type,
        phone=body.phone,
        email=body.email,
        password=body.password,
        code=body.code,
    )
    return ok(data)


@router.post("/auth/reset_password")
async def reset_password(
    body: ResetPasswordRequest,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    data = await account_service.reset_password(
        session,
        code=body.code,
        new_password=body.new_password,
        phone=body.phone,
        email=body.email,
    )
    return ok(data, "密码已重置")
