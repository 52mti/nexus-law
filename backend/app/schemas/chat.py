from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1)


class ChatCompletionRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)
    model: str | None = Field(
        default=None,
        description="Optional override; defaults to Settings.llm_model",
    )


class ChatCompletionUsage(BaseModel):
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None


class ChatCompletionData(BaseModel):
    role: Literal["assistant"] = "assistant"
    content: str
    model: str
    latency_ms: float
    usage: ChatCompletionUsage


class ChatCompletionResponse(BaseModel):
    success: bool = True
    data: ChatCompletionData
    error: None = None
    request_id: str | None = None
