from fastapi import Depends, HTTPException, status
from common.rbac import get_current_user
from .service import get_room_by_number, get_guest_by_id

async def valid_room_number(room_number: int):
    room = get_room_by_number(room_number)
    if not room:
        raise HTTPException(status_code=404, detail=f"Xona {room_number} topilmadi")
    return room

async def valid_guest_id(guest_id: str):
    guest = get_guest_by_id(guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail=f"Mehmon {guest_id} topilmadi")
    return guest