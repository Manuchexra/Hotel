from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from common.rbac import require_role
from .schemas import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeOut,
    WorkLogCreate,
    WorkLogOut,
    SalaryCalculateRequest,
    SalaryOut,
)
from .service import (
    get_employees,
    create_employee,
    get_employee,
    update_employee,
    delete_employee,
    add_worklog,
    get_worklogs,
    calculate_salary,
    get_salaries,
)

router = APIRouter(prefix="/hr", tags=["HR"])


@router.on_event("startup")
def startup():
    from common.database import init_db

    init_db()


@router.get("/employees", response_model=List[EmployeeOut], summary="Barcha xodimlar ro'yxati")
def api_get_employees(_=Depends(require_role("hr"))):
    return get_employees()


@router.post("/employees", response_model=EmployeeOut, summary="Yangi xodim qo'shish")
def api_create_employee(req: EmployeeCreate, _=Depends(require_role("hr"))):
    return create_employee(req.dict())


@router.get("/employees/{employee_id}", response_model=EmployeeOut, summary="Xodim ma'lumotini olish")
def api_get_employee(employee_id: str, _=Depends(require_role("hr"))):
    employee = get_employee(employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.put("/employees/{employee_id}", response_model=EmployeeOut, summary="Xodim ma'lumotlarini yangilash")
def api_update_employee(employee_id: str, req: EmployeeUpdate, _=Depends(require_role("hr"))):
    employee = update_employee(employee_id, req.dict(exclude_none=True))
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.delete("/employees/{employee_id}", summary="Xodimni o'chirish")
def api_delete_employee(employee_id: str, _=Depends(require_role("hr"))):
    success = delete_employee(employee_id)
    if not success:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"success": True}


@router.post("/employees/{employee_id}/worklogs", response_model=WorkLogOut, summary="Xodim uchun ish vaqtini qo'shish")
def api_add_worklog(employee_id: str, req: WorkLogCreate, _=Depends(require_role("hr"))):
    log = add_worklog(employee_id, req.dict())
    if not log:
        raise HTTPException(status_code=404, detail="Employee not found")
    return log


@router.get("/worklogs", response_model=List[WorkLogOut], summary="Ish vaqtini ko'rish")
def api_get_worklogs(employee_id: Optional[str] = None, _=Depends(require_role("hr"))):
    return get_worklogs(employee_id)


@router.post("/salaries/calculate", response_model=SalaryOut, summary="Maoshni hisoblash")
def api_calculate_salary(req: SalaryCalculateRequest, _=Depends(require_role("hr"))):
    salary = calculate_salary(req.employee_id, req.month)
    if not salary:
        raise HTTPException(status_code=404, detail="Employee not found")
    return salary


@router.get("/salaries", response_model=List[SalaryOut], summary="Maosh yozuvlarini ko'rish")
def api_get_salaries(employee_id: Optional[str] = None, _=Depends(require_role("hr"))):
    return get_salaries(employee_id)
