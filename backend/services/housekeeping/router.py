from fastapi import APIRouter, Depends, HTTPException
from .schemas import StartCleaningRequest, FinishCleaningRequest, TaskOut
from .service import start_cleaning, finish_cleaning, get_pending_queue, get_cleaned_rooms, get_history, get_schedule, get_stats
from common.rbac import require_role

router = APIRouter(prefix="/housekeeping", tags=["Housekeeping"])

@router.post("/start", summary="Xonani tozalashni boshlash (Role: housekeeping, manager)", description="Tozalanmoqda holatiga o'tkazish. Faqat housekeeping va manager uchun.")
def api_start_cleaning(req: StartCleaningRequest, _=Depends(require_role("housekeeping"))):
    result = start_cleaning(req.room_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.post("/finish", summary="Xonani tozalashni tugatish (Role: housekeeping, manager)", description="Xonani toza holatiga o'tkazish. Faqat housekeeping va manager uchun.")
def api_finish_cleaning(req: FinishCleaningRequest, current_user=Depends(require_role("housekeeping"))):
    result = finish_cleaning(req.room_id, cleaned_by=current_user.get("username"))
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.get("/queue", summary="Tozalash navbatini ko'rish (Role: housekeeping, manager)", description="Ifloslangan xonalar ro'yxati. Faqat housekeeping va manager uchun.")
def api_get_queue(_=Depends(require_role("housekeeping"))):
    return {"pending_rooms": get_pending_queue()}

@router.get("/cleaned", summary="Bugungi tozalangan xonalar ro'yxati (Role: housekeeping, manager)", description="Tozalangan xonalar ro'yxati. Faqat housekeeping va manager uchun.")
def api_get_cleaned(_=Depends(require_role("housekeeping"))):
    return {"cleaned_rooms": get_cleaned_rooms()}

@router.get("/history", summary="Tozalash tarixi (Role: housekeeping, manager)", description="Hammasini tozalash tarixi timestamp va davom etish vaqti bilan. Faqat housekeeping va manager uchun.")
def api_get_history(_=Depends(require_role("housekeeping"))):
    return get_history()


@router.get("/schedule", summary="Tozalash jadvali (Role: housekeeping, manager)", description="Bugungi yoki belgilangan sanaga tozalash jadvali. Faqat housekeeping va manager uchun.")
def api_get_schedule(_=Depends(require_role("housekeeping"))):
    return get_schedule()


@router.get("/stats", summary="Tozalash statistikasi (Role: housekeeping, manager)", description="Tozalash statistikasi: kunlik/haftalik/oylik. Faqat housekeeping va manager uchun.")
def api_get_stats(period: str = "day", _=Depends(require_role("housekeeping"))):
    return get_stats(period)