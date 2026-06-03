from fastapi import APIRouter, Depends, HTTPException
from .schemas import AddItemRequest, ApplyDiscountRequest, FinalizeBillRequest, BillOut, BillInitRequest
from .service import get_bill, add_manual_item, apply_discount, finalize_bill, init_bill
from common.rbac import require_role, get_current_user

router = APIRouter(prefix="/billing", tags=["Billing"])

# BUG FIX #1: /guest/bill aniq yo'l /{guest_id} dan AVVAL bo'lishi kerak,
# aks holda FastAPI "guest" ni guest_id sifatida tutib qoladi.

@router.post(
    "/init",
    summary="Billing yozuvini yaratish (Reception tomonidan chaqiriladi)",
    description="Check-in paytida billing yozuvini to'g'ridan-to'g'ri yaratish. Redis race condition'ni oldini oladi."
)
def api_init_bill(req: BillInitRequest):
    result = init_bill(
        guest_id=req.guest_id,
        guest_name=req.guest_name,
        room_id=req.room_id,
        room_price_per_night=req.room_price_per_night,
        nights=req.nights,
    )
    return result



@router.get(
    "/guest/bill",
    response_model=BillOut,
    summary="Mehmon o'z hisobini ko'rish",
    description="Mehmon faqat o'z hisobini ko'radi."
)
def guest_get_bill(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "guest":
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    guest_id = current_user.get("sub") or current_user.get("username")
    if not guest_id:
        raise HTTPException(status_code=400, detail="Mehmon aniqlanmadi")
    bill = get_bill(guest_id)
    if not bill:
        raise HTTPException(status_code=404, detail="Hisob topilmadi")
    return bill


@router.get(
    "/{guest_id}",
    response_model=BillOut,
    summary="Mehmon hisobini ko'rish (Role: receptionist, manager)",
    description="Joriy hisobni qaytaradi. Receptionist va manager uchun."
)
def api_get_bill(guest_id: str, _=Depends(require_role("receptionist"))):
    bill = get_bill(guest_id)
    if not bill:
        raise HTTPException(status_code=404, detail="Hisob topilmadi")
    return bill


@router.post(
    "/add",
    summary="Hisobga qo'shimcha to'lov qo'shish (Role: receptionist, manager)",
    description="Qo'lda to'lov qo'shish (masalan, minibar). Receptionist va manager uchun."
)
def api_add_item(req: AddItemRequest, _=Depends(require_role("receptionist"))):
    result = add_manual_item(req.guest_id, req.description, req.amount)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post(
    "/discount",
    summary="Chegirma qo'llash (Role: manager)",
    description="Faqat manager chegirma qo'llashi mumkin."
)
def api_apply_discount(req: ApplyDiscountRequest, _=Depends(require_role("manager"))):
    result = apply_discount(req.guest_id, req.discount_percent)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post(
    "/finalize",
    summary="Hisobni yopish (Role: receptionist, manager)",
    description="Mehmon check-out paytida hisobni yakunlash."
)
def api_finalize_bill(req: FinalizeBillRequest, _=Depends(require_role("receptionist"))):
    result = finalize_bill(req.guest_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result
