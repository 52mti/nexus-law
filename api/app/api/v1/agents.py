from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.agent import AgentRunData, AgentRunRequest, AgentRunResponse, ToolTraceItem
from app.services.agent import AgentService, get_agent_service

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
