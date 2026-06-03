import time
import uuid
from datetime import datetime
from typing import List, Optional
from common.database import SessionLocal
from .models import Employee, WorkLog, Salary


def get_employees() -> List[Employee]:
    with SessionLocal() as db:
        return db.query(Employee).all()


def get_employee(employee_id: str) -> Optional[Employee]:
    with SessionLocal() as db:
        return db.query(Employee).filter(Employee.id == employee_id).first()


def create_employee(data: dict) -> Employee:
    employee = Employee(
        id=str(uuid.uuid4()),
        fullname=data["fullname"],
        role=data["role"],
        hourly_rate=data.get("hourly_rate", 0.0),
        monthly_salary=data.get("monthly_salary", 0.0),
        active=data.get("active", True),
    )
    with SessionLocal() as db:
        db.add(employee)
        db.commit()
        db.refresh(employee)
        return employee


def update_employee(employee_id: str, updates: dict) -> Optional[Employee]:
    with SessionLocal() as db:
        employee = db.query(Employee).filter(Employee.id == employee_id).first()
        if not employee:
            return None
        for key, value in updates.items():
            if value is not None and hasattr(employee, key):
                setattr(employee, key, value)
        db.commit()
        db.refresh(employee)
        return employee


def delete_employee(employee_id: str) -> bool:
    with SessionLocal() as db:
        employee = db.query(Employee).filter(Employee.id == employee_id).first()
        if not employee:
            return False
        db.delete(employee)
        db.commit()
        return True


def add_worklog(employee_id: str, worklog_data: dict) -> Optional[WorkLog]:
    if not get_employee(employee_id):
        return None
    worklog = WorkLog(
        id=str(uuid.uuid4()),
        employee_id=employee_id,
        date=worklog_data["date"],
        hours_worked=worklog_data["hours_worked"],
        overtime_hours=worklog_data.get("overtime_hours", 0.0),
        bonus=worklog_data.get("bonus", 0.0),
    )
    with SessionLocal() as db:
        db.add(worklog)
        db.commit()
        db.refresh(worklog)
        return worklog


def get_worklogs(employee_id: Optional[str] = None) -> List[WorkLog]:
    with SessionLocal() as db:
        query = db.query(WorkLog)
        if employee_id:
            query = query.filter(WorkLog.employee_id == employee_id)
        return query.all()


def calculate_salary(employee_id: str, month: str) -> Optional[Salary]:
    with SessionLocal() as db:
        employee = db.query(Employee).filter(Employee.id == employee_id).first()
        if not employee:
            return None
        worklogs = db.query(WorkLog).filter(WorkLog.employee_id == employee_id).all()
        month_logs = [log for log in worklogs if log.date.startswith(month)]
        total_hours = sum(log.hours_worked for log in month_logs)
        overtime = sum(log.overtime_hours for log in month_logs)
        bonus = sum(log.bonus for log in month_logs)
        if employee.hourly_rate > 0:
            gross = total_hours * employee.hourly_rate + overtime * employee.hourly_rate * 1.5 + bonus
        else:
            gross = employee.monthly_salary + bonus
        tax = gross * 0.12
        net = gross - tax
        salary = Salary(
            id=str(uuid.uuid4()),
            employee_id=employee_id,
            month=month,
            total_hours=total_hours,
            overtime_hours=overtime,
            bonus=bonus,
            gross_salary=gross,
            tax=tax,
            net_salary=net,
            created_at=datetime.now().timestamp(),
        )
        db.add(salary)
        db.commit()
        db.refresh(salary)
        return salary


def get_salaries(employee_id: Optional[str] = None) -> List[Salary]:
    with SessionLocal() as db:
        query = db.query(Salary)
        if employee_id:
            query = query.filter(Salary.employee_id == employee_id)
        return query.all()
