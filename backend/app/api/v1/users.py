from fastapi import APIRouter, Depends, File, UploadFile

from app.api.deps import AccountContext, require_account
from app.core.biz import ok
from app.schemas.account import PasswordUpdateRequest, ProfileUpdateRequest
from app.services import account as account_service

router = APIRouter(tags=["user"])


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
