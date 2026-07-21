from fastapi import APIRouter, Depends, Request

from app.api.deps import require_principal
from app.core.config import Settings, get_settings
from app.core.prompt_guard import assert_safe_user_text
from app.core.security import Principal
from app.schemas.chat import (
    ChatCompletionData,
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionUsage,
)
from app.services.llm import ChatMessageInput, LangChainLLMClient, get_llm_client

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/completions", response_model=ChatCompletionResponse)
async def create_chat_completion(
    payload: ChatCompletionRequest,
    request: Request,
    _principal: Principal = Depends(require_principal),
    settings: Settings = Depends(get_settings),
    llm: LangChainLLMClient = Depends(get_llm_client),
) -> ChatCompletionResponse:
    for message in payload.messages:
        if message.role == "user":
            assert_safe_user_text(message.content)

    if payload.model and payload.model != settings.llm_model:
        request_settings = settings.model_copy(update={"llm_model": payload.model})
        llm = LangChainLLMClient(request_settings)

    result = await llm.chat_completions(
        [
            ChatMessageInput(role=message.role, content=message.content)
            for message in payload.messages
        ]
    )
    return ChatCompletionResponse(
        data=ChatCompletionData(
            content=result.content,
            model=result.model,
            latency_ms=result.latency_ms,
            usage=ChatCompletionUsage(
                prompt_tokens=result.prompt_tokens,
                completion_tokens=result.completion_tokens,
                total_tokens=result.total_tokens,
            ),
        ),
        request_id=getattr(request.state, "request_id", None),
    )
