from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class EmployeeCreate(BaseModel):
    fullname: str
    role: str
    hourly_rate: float = 0.0
    monthly_salary: float = 0.0
    active: bool = True


class EmployeeUpdate(BaseModel):
    fullname: Optional[str] = None
    role: Optional[str] = None
    hourly_rate: Optional[float] = None
    monthly_salary: Optional[float] = None
    active: Optional[bool] = None


class EmployeeOut(BaseModel):
    id: str
    fullname: str
    role: str
    hourly_rate: float
    monthly_salary: float
    active: bool

    class Config:
        from_attributes = True


class WorkLogCreate(BaseModel):
    date: str
    hours_worked: float
    overtime_hours: float = 0.0
    bonus: float = 0.0


class WorkLogOut(BaseModel):
    id: str
    employee_id: str
    date: str
    hours_worked: float
    overtime_hours: float
    bonus: float

    class Config:
        from_attributes = True


class SalaryCalculateRequest(BaseModel):
    employee_id: str
    month: str


class SalaryOut(BaseModel):
    id: str
    employee_id: str
    month: str
    total_hours: float
    overtime_hours: float
    bonus: float
    gross_salary: float
    tax: float
    net_salary: float
    created_at: float

    class Config:
        from_attributes = True
