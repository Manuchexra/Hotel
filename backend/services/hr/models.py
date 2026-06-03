import time
import uuid
from sqlalchemy import Column, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from common.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    fullname = Column(String, nullable=False)
    role = Column(String, nullable=False)
    hourly_rate = Column(Float, nullable=False, default=0.0)
    monthly_salary = Column(Float, nullable=False, default=0.0)
    active = Column(Boolean, nullable=False, default=True)

    worklogs = relationship("WorkLog", back_populates="employee", cascade="all, delete-orphan")
    salaries = relationship("Salary", back_populates="employee", cascade="all, delete-orphan")


class WorkLog(Base):
    __tablename__ = "worklogs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False)
    date = Column(String, nullable=False)
    hours_worked = Column(Float, nullable=False, default=0.0)
    overtime_hours = Column(Float, nullable=False, default=0.0)
    bonus = Column(Float, nullable=False, default=0.0)

    employee = relationship("Employee", back_populates="worklogs")


class Salary(Base):
    __tablename__ = "salaries"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False)
    month = Column(String, nullable=False)
    total_hours = Column(Float, nullable=False)
    overtime_hours = Column(Float, nullable=False)
    bonus = Column(Float, nullable=False)
    gross_salary = Column(Float, nullable=False)
    tax = Column(Float, nullable=False, default=0.12)
    net_salary = Column(Float, nullable=False)
    created_at = Column(Float, nullable=False, default=time.time)

    employee = relationship("Employee", back_populates="salaries")
