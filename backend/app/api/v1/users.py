from dataclasses import dataclass

from fastapi import APIRouter, Depends, File, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.biz import BizCode, BizError, ok
from app.core.config import get_settings
from app.core.exceptions import AppError
from app.core.jwt import decode_access_token
from app.db.models import User
from app.db.session import get_db_session
from app.schemas.account import PasswordUpdateRequest, ProfileUpdateRequest
from app.services import account as account_service

router = APIRouter(tags=["user"])


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


@router.get("/user/profile")
async def get_profile(ctx: AccountContext = Depends(require_account)) -> dict:
    data = await account_service.get_profile(ctx.session, ctx.user)
    return ok(data)


@router.post("/user/profile/update")
async def update_profile(
    body: ProfileUpdateRequest,
    ctx: AccountContext = Depends(require_account),
) -> dict:
    data = await account_service.update_profile(
        ctx.session,
        ctx.user,
        nickname=body.nickname,
        phone=body.phone,
        email=body.email,
        code=body.code,
    )
    return ok(data)


@router.post("/user/password/update")
async def update_password(
    body: PasswordUpdateRequest,
    ctx: AccountContext = Depends(require_account),
) -> dict:
    data = await account_service.update_password(
        ctx.session,
        ctx.user,
        old_password=body.old_password,
        new_password=body.new_password,
    )
    return ok(data, "密码已更新")


@router.post("/user/avatar/upload")
async def upload_avatar(
    file: UploadFile = File(...),
    ctx: AccountContext = Depends(require_account),
) -> dict:
    content = await file.read()
    data = await account_service.upload_avatar(
        ctx.session,
        ctx.user,
        filename=file.filename or "avatar",
        content=content,
        content_type=file.content_type,
    )
    return ok(data)
