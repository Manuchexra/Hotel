import time
import uuid
from typing import Optional
from enum import Enum
from sqlalchemy import Column, String, Integer, Float, Enum as SQLEnum
from common.database import Base

class CleaningStatus(str, Enum):
    PENDING = "kutmoqda"
    IN_PROGRESS = "tozalanmoqda"
    DONE = "tozalandi"

class CleaningTask(Base):
    __tablename__ = "cleaning_tasks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    room_id = Column(Integer, nullable=False)
    status = Column(SQLEnum(CleaningStatus, native_enum=False), nullable=False, default=CleaningStatus.PENDING)
    assigned_to = Column(String, nullable=True)
    started_at = Column(Float, nullable=True)
    finished_at = Column(Float, nullable=True)
    created_at = Column(Float, nullable=False, default=time.time)

class CleaningHistory(Base):
    __tablename__ = "cleaning_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    room_id = Column(Integer, nullable=False)
    cleaned_by = Column(String, nullable=True)
    started_at = Column(Float, nullable=False)
    finished_at = Column(Float, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    created_at = Column(Float, nullable=False, default=time.time)
