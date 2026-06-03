from pydantic import BaseModel
from .models import CleaningStatus
from datetime import datetime

class StartCleaningRequest(BaseModel):
    room_id: int

class FinishCleaningRequest(BaseModel):
    room_id: int

class TaskOut(BaseModel):
    id: str
    room_id: int
    status: CleaningStatus

class HistoryOut(BaseModel):
    id: str
    room_id: int
    cleaned_by: str
    started_at: datetime
    finished_at: datetime
    duration_minutes: int