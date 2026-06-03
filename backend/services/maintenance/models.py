import time
import uuid
from typing import Optional
from enum import Enum
from sqlalchemy import Column, String, Integer, Float, Enum as SQLEnum
from common.database import Base

class PriorityLevel(str, Enum):
    CRITICAL = "Kritik"
    HIGH = "Yuqori"
    NORMAL = "Normal"
    LOW = "Past"

# Raqamli qiymatlar: Kritik=4 > Yuqori=3 > Normal=2 > Past=1
PRIORITY_VALUES = {
    PriorityLevel.CRITICAL: 4,
    PriorityLevel.HIGH: 3,
    PriorityLevel.NORMAL: 2,
    PriorityLevel.LOW: 1
}

class IssueStatus(str, Enum):
    NEW = "yangi"
    ASSIGNED = "tayinlangan"
    RESOLVED = "hal qilingan"

class Issue(Base):
    __tablename__ = "issues"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    room_id = Column(Integer, nullable=False)
    description = Column(String, nullable=False)
    priority = Column(SQLEnum(PriorityLevel, native_enum=False), nullable=False)
    status = Column(SQLEnum(IssueStatus, native_enum=False), nullable=False, default=IssueStatus.NEW)
    assigned_to = Column(String, nullable=True)
    created_at = Column(Float, nullable=False, default=time.time)
    resolved_at = Column(Float, nullable=True)
