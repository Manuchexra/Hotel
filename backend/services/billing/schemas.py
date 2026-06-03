from pydantic import BaseModel, Field
from typing import List, Optional


class AddItemRequest(BaseModel):
    guest_id: str
    description: str
    amount: float = Field(gt=0)

class ApplyDiscountRequest(BaseModel):
    guest_id: str
    discount_percent: float = Field(ge=0, le=100)

class FinalizeBillRequest(BaseModel):
    guest_id: str

class BillItemOut(BaseModel):
    description: str
    amount: float
    timestamp: float

class BillOut(BaseModel):
    guest_id: str
    room_id: int
    guest_name: str
    items: List[BillItemOut]
    total: float
    discount_percent: float
    final_total: float
    is_closed: bool


class BillInitRequest(BaseModel):
    guest_id: str
    guest_name: str
    room_id: int
    room_price_per_night: float
    nights: int
