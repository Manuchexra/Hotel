from fastapi import APIRouter, Depends, HTTPException
from .schemas import OrderCreate, OrderStatusUpdate, OrderOut
from .service import create_order, update_order_status, get_orders_by_room, get_all_orders
from common.rbac import get_current_user, require_role

router = APIRouter(prefix="/roomservice", tags=["Room Service"])

@router.post("/orders/create", summary="Yangi buyurtma yaratish (Role: roomservice, manager)", description="Xona xizmatiga yangi buyurtma berish. Faqat roomservice va manager uchun.")
def api_create_order(req: OrderCreate, _=Depends(require_role("roomservice"))):
    result = create_order(req.room_id, req.guest_id, req.items)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.post("/guest/order", summary="Mehmon buyurtma yaratish", description="Mehmon xona xizmatiga buyurtma beradi. Guest roli uchun.")
def guest_create_order(
    req: OrderCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "guest":
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    # room_id: avval token dan, keyin request body dan olishga urinish
    room_id = current_user.get("room") or req.room_id
    if not room_id:
        raise HTTPException(status_code=400, detail="Xona aniqlanmadi")
    guest_id = current_user.get("sub") or current_user.get("username")
    result = create_order(int(room_id), guest_id, req.items)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.put("/orders/{order_id}/status", summary="Buyurtma holatini o'zgartirish (Role: roomservice, manager)", description="Buyurtma holatini yangilash. Faqat roomservice va manager uchun.")
def api_update_status(order_id: str, req: OrderStatusUpdate, _=Depends(require_role("roomservice"))):
    result = update_order_status(order_id, req.status)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result

@router.get("/orders/room/{room_id}")
def api_get_orders_by_room(room_id: int, current_user: dict = Depends(get_current_user)):
    # Ruxsat: roomservice, receptionist, manager, guest (faqat o'z xona uchun)
    if current_user["role"] not in ["roomservice", "receptionist", "manager", "guest"]:
        raise HTTPException(status_code=403, detail="Ruxsat etilmagan")
    if current_user["role"] == "guest" and current_user.get("room") != room_id:
        raise HTTPException(status_code=403, detail="Faqat o'z xonasining buyurtmalarini ko'rish mumkin")
    return {"orders": get_orders_by_room(room_id)}

@router.get("/orders", summary="Barcha buyurtmalar ro'yxati (Role: roomservice, manager)", description="Barcha buyurtmalarni ko'rish. Roomservice va manager uchun.")
def api_get_all_orders(_=Depends(require_role("roomservice"))):
    return {"orders": get_all_orders()}