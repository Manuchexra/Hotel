from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from .schemas import CheckinRequest, CheckoutRequest, RoomOut, GuestOut, RoomCreate, RoomUpdate, RoomStatusUpdate
from .service import (
    checkin, checkout, get_all_rooms, get_all_guests,
    get_room_by_number, get_guest_by_id, update_room_status,
    create_room, update_room, delete_room, find_best_room
)
from .dependencies import valid_room_number, valid_guest_id
from common.rbac import require_role, get_current_user
from .models import RoomStatus

router = APIRouter(prefix="/reception", tags=["Reception"])

@router.on_event("startup")
def startup():
    from common.database import init_db
    from .service import init_rooms

    init_db()
    init_rooms()

# 1. Check-in
@router.post("/checkin", summary="Mehmonni joylashtirish (Role: receptionist, manager)", description="Mehmonni ro'yxatdan o'tkazish va mos xona tayinlash. Faqat receptionist va manager ruxsatiga ega.")
def api_checkin(req: CheckinRequest, _=Depends(require_role("receptionist"))):
    result = checkin(req.dict())
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

# 2. Check-out
@router.post("/checkout", summary="Mehmonni chiqarish (Role: receptionist, manager)", description="Mehmonni chiqarish va xonani bo'shatilgan deb belgilash. Faqat receptionist va manager ruxsatiga ega.")
def api_checkout(req: CheckoutRequest, _=Depends(require_role("receptionist"))):
    result = checkout(req.guest_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result


@router.post("/guest/checkout", summary="Mehmon chiqarishi", description="Mehmon o'z xonasidan chiqadi.")
def guest_checkout(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "guest":
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    guest_id = current_user.get("sub") or current_user.get("username")
    if not guest_id:
        raise HTTPException(status_code=400, detail="Mehmon aniqlanmadi")
    result = checkout(guest_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result


# 3. Barcha xonalar
@router.get("/rooms", response_model=List[RoomOut], summary="Xonalar holatini ko'rish (Role: receptionist, manager)", description="Barcha xonalar holatini ko'rish. Faqat receptionist va manager ruxsatiga ega.")
def api_rooms(_=Depends(require_role("receptionist"))):
    return get_all_rooms()

# 4. Bitta xona
@router.get("/rooms/{room_number}", response_model=RoomOut, summary="Bitta xona ma'lumotlarini ko'rish (Role: receptionist, manager)")
def api_room(room_number: int, room=Depends(valid_room_number), _=Depends(require_role("receptionist"))):
    return RoomOut(
        id=room.id,
        number=room.number,
        floor=room.floor,
        type=room.type,
        status=room.status,
        current_guest_name=None  # qo'shimcha
    )

# 5. Barcha mehmonlar
@router.get("/guests", response_model=List[GuestOut], summary="Barcha mehmonlarni ko'rish (Role: receptionist, manager)")
def api_guests(room: Optional[int] = None, name: Optional[str] = None, _=Depends(require_role("receptionist"))):
    guests = get_all_guests()
    
    # Filter by room if provided
    if room is not None:
        guests = [g for g in guests if g.room_id == room]
        
    # Filter by name (partial/case-insensitive) if provided
    if name is not None:
        guests = [g for g in guests if name.lower() in g.name.lower()]
        
    return [GuestOut(id=g.id, name=g.name, room_type=g.room_type, nights=g.nights, room_id=g.room_id) for g in guests]

# 6. Bitta mehmon
@router.get("/guests/{guest_id}", response_model=GuestOut, summary="Bitta mehmon ma'lumotlarini ko'rish (Role: receptionist, manager)")
def api_guest(guest=Depends(valid_guest_id), _=Depends(require_role("receptionist"))):
    return GuestOut(id=guest.id, name=guest.name, room_type=guest.room_type, nights=guest.nights, room_id=guest.room_id)

# 7. (Faqat manager) Xona holatini o'zgartirish – favqulodda
@router.put("/rooms/{room_number}/status", summary="Xona holatini o'zgartirish (Role: manager)", description="Faqat manager xona holatini o'zgartirishi mumkin.")
def api_update_room_status(room_number: int, req: RoomStatusUpdate, _=Depends(require_role("manager"))):
    # BUG FIX #3: new_status endi query param emas, request body orqali keladi
    success = update_room_status(room_number, req.new_status)
    if not success:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"success": True, "room": room_number, "status": req.new_status.value}


@router.post("/rooms", response_model=RoomOut, summary="Xona qo'shish (Role: manager)", description="Yangi xona qo'shish. Faqat manager uchun.")
def api_create_room(req: RoomCreate, _=Depends(require_role("manager"))):
    room = create_room(req.dict())
    if not room:
        raise HTTPException(status_code=400, detail="Bu xona raqami allaqachon mavjud")
    return RoomOut(
        id=room.id,
        number=room.number,
        floor=room.floor,
        type=room.type,
        status=room.status,
        current_guest_name=None
    )


@router.put("/rooms/{room_number}", response_model=RoomOut, summary="Xona ma'lumotlarini tahrirlash (Role: manager)", description="Xona ma'lumotlarini tahrirlash. Faqat manager uchun.")
def api_update_room(room_number: int, req: RoomUpdate, _=Depends(require_role("manager"))):
    room = update_room(room_number, req.dict(exclude_none=True))
    if not room:
        raise HTTPException(status_code=404, detail="Room not found yoki xona band")
    return RoomOut(
        id=room.id,
        number=room.number,
        floor=room.floor,
        type=room.type,
        status=room.status,
        current_guest_name=None
    )


@router.delete("/rooms/{room_number}", summary="Xona o'chirish (Role: manager)", description="Bo'sh xonani o'chirish. Faqat manager uchun.")
def api_delete_room(room_number: int, _=Depends(require_role("manager"))):
    success = delete_room(room_number)
    if not success:
        raise HTTPException(status_code=400, detail="Room topilmadi yoki xona band")
    return {"success": True, "room": room_number}
