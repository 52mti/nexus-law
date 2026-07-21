from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from sqlalchemy import text

from app.core.config import get_settings
from app.db.session import engine
from app.schemas.health import HealthData, HealthResponse

router = APIRouter(tags=["health"])


class ReadyCheck(BaseModel):
    name: str
    status: str
    detail: str | None = None


class ReadyData(BaseModel):
    status: str = Field(examples=["ok", "degraded", "fail"])
    app_name: str
    env: str
    checks: list[ReadyCheck]


class ReadyResponse(BaseModel):
    success: bool = True
    data: ReadyData
    error: None = None
    request_id: str | None = None


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


async def _check_database() -> ReadyCheck:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return ReadyCheck(name="database", status="ok")
    except Exception as exc:  # noqa: BLE001
        return ReadyCheck(name="database", status="fail", detail=type(exc).__name__)


def _check_weaviate() -> ReadyCheck:
    settings = get_settings()
    try:
        import weaviate

        client = weaviate.connect_to_local(
            host=settings.weaviate_host,
            port=settings.weaviate_http_port,
            grpc_port=settings.weaviate_grpc_port,
        )
        try:
            ready = client.is_ready()
        finally:
            client.close()
        if ready:
            return ReadyCheck(name="weaviate", status="ok")
        return ReadyCheck(name="weaviate", status="fail", detail="not ready")
    except Exception as exc:  # noqa: BLE001
        return ReadyCheck(name="weaviate", status="fail", detail=type(exc).__name__)


async def _check_redis() -> ReadyCheck:
    settings = get_settings()
    try:
        from redis.asyncio import Redis

        client = Redis.from_url(settings.redis_url, socket_connect_timeout=1.5)
        try:
            pong = await client.ping()
        finally:
            await client.aclose()
        if pong:
            return ReadyCheck(name="redis", status="ok")
        return ReadyCheck(name="redis", status="degraded", detail="ping failed")
    except Exception as exc:  # noqa: BLE001
        # Redis is optional for Stage 7 (in-memory rate limit fallback).
        return ReadyCheck(name="redis", status="skip", detail=type(exc).__name__)


@router.get("/health/ready", response_model=ReadyResponse)
async def health_ready(request: Request) -> ReadyResponse:
    settings = get_settings()
    checks = [
        await _check_database(),
        _check_weaviate(),
        await _check_redis(),
        ReadyCheck(
            name="llm_configured",
            status="ok" if settings.llm_configured else "fail",
            detail=None if settings.llm_configured else "LLM_API_KEY missing",
        ),
    ]

    statuses = {item.status for item in checks if item.name != "redis"}
    if "fail" in statuses:
        overall = "fail"
    elif "degraded" in statuses:
        overall = "degraded"
    else:
        overall = "ok"

    return ReadyResponse(
        data=ReadyData(
            status=overall,
            app_name=settings.app_name,
            env=settings.env,
            checks=checks,
        ),
        request_id=getattr(request.state, "request_id", None),
    )
