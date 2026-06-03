# services/maintenance/router.py
from fastapi import APIRouter, Depends, HTTPException
from common.rbac import require_role, get_current_user
from .schemas import IssueCreate, GuestIssueCreate, IssueAssign, IssueResolve, PriorityQueueOut, PriorityLimitsUpdate
from .service import (
    create_issue,
    assign_issue,
    resolve_issue,
    get_all_issues as get_issues_from_db,
    get_priority_queue,
    get_performance_stats,
    get_priority_limits,
    set_priority_limits,
)

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])

# ----------------------------------------------
# Endpointlar (faqat maintenance va manager uchun)
# ----------------------------------------------
@router.post("/issues/create", summary="Yangi texnik muammo yaratish", description="Muammoni ustuvorlik bilan yaratadi va navbatga qo'shadi.")
def api_create_issue(req: IssueCreate, _=Depends(require_role("maintenance"))):
    result = create_issue(req.room_id, req.description, req.priority)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post("/guest/issue", summary="Mehmon texnik muammo haqida xabar", description="Mehmon xona texnik muammosi haqida xabar qiladi.")
def guest_create_issue(req: GuestIssueCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "guest":
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    # room_id token'dan olish, agar body'da kelmasa yoki noto'g'ri bo'lsa
    room_id = current_user.get("room") or req.room_id
    if not room_id:
        raise HTTPException(status_code=400, detail="Xona aniqlanmadi")
    result = create_issue(int(room_id), req.description, req.priority)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.put("/issues/{issue_id}/assign", summary="Muammoni texnik xodimga tayinlash", description="Muammoni ma'lum bir texnikka biriktirish.")
def api_assign_issue(issue_id: str, req: IssueAssign, _=Depends(require_role("maintenance"))):
    result = assign_issue(issue_id, req.technician_name)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result

@router.put("/issues/{issue_id}/resolve", summary="Muammoni hal qilingan deb belgilash", description="Muammo tugatilganini belgilaydi va xona holatini yangilaydi.")
def api_resolve_issue(issue_id: str, _=Depends(require_role("maintenance"))):
    result = resolve_issue(issue_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result

@router.get("/priority/queue", summary="Ustuvorlik navbatini ko'rish", description="Hali tayinlanmagan muammolarni prioritet va vaqt bo'yicha qaytaradi.")
def api_get_priority_queue(_=Depends(require_role("maintenance"))):
    return {"queue": get_priority_queue()}


@router.get("/priority/limits", summary="Ustuvorlik vaqt chegaralarini olish", description="Har bir prioritet uchun maksimal hal qilish vaqti (soat).")
def api_get_priority_limits(_=Depends(require_role("maintenance"))):
    return {"limits": get_priority_limits()}


@router.put("/priority/limits", summary="Ustuvorlik vaqt chegaralarini saqlash", description="Muddat o'tgan ochiq muammolar avtomatik yuqori prioritetga ko'tariladi.")
def api_set_priority_limits(req: PriorityLimitsUpdate, _=Depends(require_role("maintenance"))):
    limits = set_priority_limits(req.model_dump())
    return {"success": True, "limits": limits}


@router.get("/performance", summary="Xodim samaradorligi", description="Texnik xodimlar bo'yicha hal qilish statistikasi.")
def api_get_performance(period: str = "all", _=Depends(require_role("maintenance"))):
    return {"technicians": get_performance_stats(period)}


# -------------------------------------------------
# Barcha muammolarni ko'rish (manager va maintenance uchun farqli)
# -------------------------------------------------
@router.get("/issues", summary="Muammolar ro'yxati", description="Barcha muammolar tarixi. Maintenance va manager uchun.")
def get_all_issues_endpoint(_=Depends(require_role("maintenance"))):
    return {"issues": get_issues_from_db()}

@router.get("/issues/all", summary="Barcha muammolar", description="Barcha muammolarni ko'rish")
def get_all_issues_guest(_=Depends(get_current_user)):
    return {"issues": get_issues_from_db()}
