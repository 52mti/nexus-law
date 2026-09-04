from typing import Literal

from pydantic import BaseModel, Field


class TokenRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=128, examples=["user-123"])
    tier: Literal["normal", "vip"] = "normal"


class TokenData(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    tier: Literal["normal", "vip"]
    user_id: str
    expires_in_hours: int


class TokenResponse(BaseModel):
    success: bool = True
    data: TokenData
    error: None = None
    request_id: str | None = None
