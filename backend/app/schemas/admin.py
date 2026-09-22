from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.account import LoginRequest

AdminLoginRequest = LoginRequest


class IdRequest(BaseModel):
    id: str = Field(min_length=1, max_length=36)


class UserStatusUpdateRequest(BaseModel):
    id: str = Field(min_length=1, max_length=36)
    status: Literal["active", "disabled"]


class UserRolesAssignRequest(BaseModel):
    id: str = Field(min_length=1, max_length=36)
    role_codes: list[str] = Field(min_length=1)


class UserPointsAdjustRequest(BaseModel):
    id: str = Field(min_length=1, max_length=36)
    change: int
    remark: str | None = Field(default=None, max_length=512)


class RoleCreateRequest(BaseModel):
    code: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=64)
    description: str | None = None


class RoleUpdateRequest(BaseModel):
    id: str = Field(min_length=1, max_length=36)
    name: str | None = Field(default=None, max_length=64)
    description: str | None = None


class RolePermissionsBindRequest(BaseModel):
    id: str = Field(min_length=1, max_length=36)
    permission_codes: list[str] = Field(default_factory=list)


class PromptCreateRequest(BaseModel):
    agent_id: str = Field(min_length=1, max_length=36)
    scene: str = Field(min_length=1, max_length=64)
    content: str = Field(min_length=1)
    is_active: bool = False


class PromptUpdateRequest(BaseModel):
    id: str = Field(min_length=1, max_length=36)
    content: str | None = None


class PlanCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    type: str = Field(min_length=1, max_length=32)
    price: str
    period: str | None = None
    benefits: dict[str, Any] | None = None
    is_active: bool = True


class PlanUpdateRequest(BaseModel):
    id: str = Field(min_length=1, max_length=36)
    name: str | None = Field(default=None, max_length=128)
    type: str | None = Field(default=None, max_length=32)
    price: str | None = None
    period: str | None = None
    benefits: dict[str, Any] | None = None


class PlanStatusUpdateRequest(BaseModel):
    id: str = Field(min_length=1, max_length=36)
    is_active: bool


class AgentCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    code: str = Field(min_length=1, max_length=64)
    description: str | None = None
    tool_whitelist: list[str] | None = None
    dataset_ids: list[str] | None = None
    temperature: float | None = 0.2
    is_active: bool = True
    graph_code: str = Field(default="legal_qa_react", min_length=1, max_length=64)


class AgentUpdateRequest(BaseModel):
    id: str = Field(min_length=1, max_length=36)
    name: str | None = Field(default=None, max_length=128)
    description: str | None = None
    tool_whitelist: list[str] | None = None
    dataset_ids: list[str] | None = None
    temperature: float | None = None
    is_active: bool | None = None


class AgentRolesBindRequest(BaseModel):
    id: str = Field(min_length=1, max_length=36)
    role_codes: list[str] = Field(default_factory=list)


class DatasetCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    title: str | None = Field(default=None, max_length=255)
    description: str | None = None
    region: str | None = Field(default=None, max_length=64)
    visibility: str | None = None


class DatasetUpdateRequest(BaseModel):
    id: str = Field(min_length=1, max_length=36)
    title: str | None = Field(default=None, max_length=255)
    description: str | None = None
    region: str | None = Field(default=None, max_length=64)
    visibility: str | None = None


class ChunkItem(BaseModel):
    id: str | None = None
    content: str = Field(min_length=1)


class DocumentChunksUpdateRequest(BaseModel):
    id: str = Field(min_length=1, max_length=36)
    chunks: list[ChunkItem]


class DocumentChunksPreviewRequest(BaseModel):
    id: str = Field(min_length=1, max_length=36)
    chunk_size: int = Field(default=800, ge=50, le=8000)
    chunk_overlap: int = Field(default=120, ge=0, le=4000)
    separators: list[str] | None = None


class DocumentChunksImportRequest(BaseModel):
    id: str = Field(min_length=1, max_length=36)
    chunks: list[ChunkItem]
    title: str | None = Field(default=None, max_length=512)
    law_level: str | None = Field(default=None, max_length=64)
    region: str | None = Field(default=None, max_length=64)
    effective_at: str | None = None
    expired_at: str | None = None
