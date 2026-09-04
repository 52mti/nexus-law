from fastapi import APIRouter, Request

from app.core.config import get_settings
from app.core.jwt import create_access_token
from app.schemas.auth import TokenData, TokenRequest, TokenResponse

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
