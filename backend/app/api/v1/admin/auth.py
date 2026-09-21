from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.admin.deps import AdminContext, require_admin
from app.core.biz import ok
from app.db.session import get_db_session
from app.schemas.admin import AdminLoginRequest
from app.services.admin import auth as admin_auth

router = APIRouter()


@router.post("/auth/login")
async def admin_login(
    body: AdminLoginRequest,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    data = await admin_auth.login(
        session,
        login_type=body.login_type,
        phone=body.phone,
        email=body.email,
        password=body.password,
        code=body.code,
    )
    return ok(data)


@router.get("/auth/profile")
async def admin_profile(ctx: AdminContext = Depends(require_admin)) -> dict:
    data = await admin_auth.profile(ctx.session, ctx.user)
    return ok(data)
