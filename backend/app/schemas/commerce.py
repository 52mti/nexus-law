from typing import Literal

from pydantic import BaseModel, Field


class OrderCreateRequest(BaseModel):
    product_type: Literal["plan", "points"]
    product_id: str = Field(min_length=1, max_length=36)
    channel: str | None = Field(default="mock", max_length=32)


class PaymentCallbackRequest(BaseModel):
    order_id: str = Field(min_length=1, max_length=36)
    channel: str | None = Field(default=None, max_length=32)
    amount: str | None = None
    sign: str | None = None
    timestamp: str | None = None
