import asyncio
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from loguru import logger

from app.api.v1.users import AccountContext, require_account
from app.core.prompt_guard import assert_safe_user_text
from app.schemas.agent import (
    AgentRunData,
    AgentRunRequest,
    AgentRunResponse,
    SourceCitation,
    ToolTraceItem,
)
from app.services.agent import AgentService, get_agent_service
from app.utils.sse import format_sse

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("/run", response_model=AgentRunResponse)
async def run_agent(
    payload: AgentRunRequest,
    request: Request,
    ctx: AccountContext = Depends(require_account),
    agent_service: AgentService = Depends(get_agent_service),
) -> AgentRunResponse:
    assert_safe_user_text(payload.input)
    result = await agent_service.run(
        ctx.session,
        user_input=payload.input,
        conversation_id=payload.conversation_id,
        user_id=ctx.user.id,
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
            sources=[SourceCitation.model_validate(item) for item in result.sources],
        ),
        request_id=getattr(request.state, "request_id", None),
    )


@router.post("/run/stream")
async def run_agent_stream(
    payload: AgentRunRequest,
    request: Request,
    ctx: AccountContext = Depends(require_account),
    agent_service: AgentService = Depends(get_agent_service),
) -> StreamingResponse:
    assert_safe_user_text(payload.input)
    request_id = getattr(request.state, "request_id", None)
    cancel_event = asyncio.Event()

    async def event_generator() -> AsyncIterator[str]:
        try:
            async for item in agent_service.stream(
                ctx.session,
                user_input=payload.input,
                conversation_id=payload.conversation_id,
                user_id=ctx.user.id,
                title=payload.title,
                debug=payload.debug,
                cancel_event=cancel_event,
            ):
                data = item.data
                if item.event in {"conversation_meta", "error", "final"} and isinstance(data, dict):
                    data = {**data, "request_id": request_id}
                yield format_sse(item.event, data)
        except asyncio.CancelledError:
            cancel_event.set()
            logger.info("sse_generator_cancelled request_id={}", request_id)
            raise
        except Exception:
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
