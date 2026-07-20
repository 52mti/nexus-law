import asyncio
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.agent import AgentRunData, AgentRunRequest, AgentRunResponse, ToolTraceItem
from app.services.agent import AgentService, get_agent_service
from app.utils.sse import format_sse

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("/run", response_model=AgentRunResponse)
async def run_agent(
    payload: AgentRunRequest,
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    agent_service: AgentService = Depends(get_agent_service),
) -> AgentRunResponse:
    result = await agent_service.run(
        session,
        user_input=payload.input,
        conversation_id=payload.conversation_id,
        user_external_id=payload.user_external_id,
        title=payload.title,
        debug=payload.debug,
    )
    return AgentRunResponse(
        data=AgentRunData(
            conversation_id=result.conversation_id,
            answer=result.answer,
            model=result.model,
            latency_ms=result.latency_ms,
            iterations=result.iterations,
            tool_trace=(
                [ToolTraceItem.model_validate(item) for item in result.tool_trace]
                if payload.debug
                else None
            ),
        ),
        request_id=getattr(request.state, "request_id", None),
    )


@router.post("/run/stream")
async def run_agent_stream(
    payload: AgentRunRequest,
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    agent_service: AgentService = Depends(get_agent_service),
) -> StreamingResponse:
    request_id = getattr(request.state, "request_id", None)
    cancel_event = asyncio.Event()

    async def event_generator() -> AsyncIterator[str]:
        try:
            async for item in agent_service.stream(
                session,
                user_input=payload.input,
                conversation_id=payload.conversation_id,
                user_external_id=payload.user_external_id,
                title=payload.title,
                debug=payload.debug,
                cancel_event=cancel_event,
            ):
                if await request.is_disconnected():
                    cancel_event.set()
                    logger.info("sse_client_disconnected request_id={}", request_id)
                    break
                data = {**item.data, "request_id": request_id}
                yield format_sse(item.event, data)
        except asyncio.CancelledError:
            cancel_event.set()
            logger.info("sse_generator_cancelled request_id={}", request_id)
            raise
        except Exception as exc:  # noqa: BLE001
            logger.exception("sse_unhandled_error request_id={}", request_id)
            yield format_sse(
                "error",
                {
                    "code": "internal_error",
                    "message": "Internal server error",
                    "request_id": request_id,
                },
            )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
