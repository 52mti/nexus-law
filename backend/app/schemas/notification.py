from pydantic import BaseModel, Field


class NotificationReadRequest(BaseModel):
    id_list: list[str] = Field(default_factory=list, max_length=100)
