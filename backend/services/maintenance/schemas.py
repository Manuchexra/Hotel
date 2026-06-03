from pydantic import BaseModel, Field
from typing import Optional
from .models import PriorityLevel, IssueStatus

class IssueCreate(BaseModel):
    room_id: int = Field(gt=0)
    description: str = Field(min_length=3, max_length=500)
    priority: PriorityLevel

class IssueAssign(BaseModel):
    technician_name: str

class IssueResolve(BaseModel):
    resolution_notes: Optional[str] = None

class IssueOut(BaseModel):
    id: str
    room_id: int
    description: str
    priority: PriorityLevel
    status: IssueStatus
    assigned_to: Optional[str]
    created_at: float

class PriorityLimitsUpdate(BaseModel):
    kritik: float = Field(gt=0)
    yuqori: float = Field(gt=0)
    normal: float = Field(gt=0)
    past: float = Field(gt=0)


class PriorityQueueOut(BaseModel):
    queue: list[IssueOut]

class GuestIssueCreate(BaseModel):
    room_id: Optional[int] = None
    description: str = Field(min_length=3, max_length=500)
    priority: PriorityLevel
