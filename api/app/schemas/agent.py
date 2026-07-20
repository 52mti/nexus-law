from typing import Any

from pydantic import BaseModel, Field


class AgentRunRequest(BaseModel):
    input: str = Field(min_length=1)
    conversation_id: str | None = None
    user_external_id: str | None = Field(default=None, max_length=128)
    title: str | None = Field(default=None, max_length=255)
    debug: bool = False


class ToolTraceItem(BaseModel):
    tool_call_id: str | None = None
    name: str | None = None
    args: dict[str, Any] = Field(default_factory=dict)
    result: Any = None


class AgentRunData(BaseModel):
    conversation_id: str
    answer: str
    model: str
    latency_ms: float
    iterations: int = 0
    tool_trace: list[ToolTraceItem] | None = None


class AgentRunResponse(BaseModel):
    success: bool = True
    data: AgentRunData
    error: None = None
    request_id: str | None = None
