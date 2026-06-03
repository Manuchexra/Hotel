from typing import Optional
from pydantic import BaseModel
from .models import RoomType, RoomStatus

class CheckinRequest(BaseModel):
    guest_name: str
    room_type: str
    preferred_floor: Optional[int] = None
    near_lift: bool = False
    nights: int
    room_price_per_night: float

class CheckoutRequest(BaseModel):
    guest_id: str

class RoomOut(BaseModel):
    id: str
    number: int
    floor: int
    type: str
    status: RoomStatus
    current_guest_name: Optional[str] = None

    class Config:
        from_attributes = True

class GuestOut(BaseModel):
    id: str
    name: str
    room_type: str
    nights: int
    room_id: Optional[int] = None

    class Config:
        from_attributes = True

class RoomCreate(BaseModel):
    number: int
    floor: int
    type: str
    status: RoomStatus = RoomStatus.CLEAN

class RoomUpdate(BaseModel):
    floor: Optional[int] = None
    type: Optional[str] = None
    status: Optional[RoomStatus] = None

# BUG FIX #3: Xona holatini yangilash uchun request body schemasi
class RoomStatusUpdate(BaseModel):
    new_status: RoomStatus
