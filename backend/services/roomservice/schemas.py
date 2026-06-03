from pydantic import BaseModel, Field
from typing import List, Optional
from .models import OrderStatus

class OrderItemSchema(BaseModel):
    name: str
    price: float = Field(gt=0)

class OrderCreate(BaseModel):
    room_id: int
    guest_id: Optional[str] = None
    items: List[OrderItemSchema]

class OrderStatusUpdate(BaseModel):
    status: OrderStatus

class OrderOut(BaseModel):
    id: str
    room_id: int
    items: List[OrderItemSchema]
    total_price: float
    status: OrderStatus