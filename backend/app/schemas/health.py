from pydantic import BaseModel, Field


class HealthData(BaseModel):
    status: str = Field(examples=["ok"])
    app_name: str
    env: str


class HealthResponse(BaseModel):
    success: bool = True
    data: HealthData
    error: None = None
    request_id: str | None = None
