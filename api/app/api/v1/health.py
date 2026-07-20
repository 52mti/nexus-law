from fastapi import APIRouter, Request

from app.core.config import get_settings
from app.schemas.health import HealthData, HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        data=HealthData(
            status="ok",
            app_name=settings.app_name,
            env=settings.env,
        ),
        request_id=getattr(request.state, "request_id", None),
    )
