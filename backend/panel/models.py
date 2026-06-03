import time
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean
from common.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"
    username = Column(String, primary_key=True)
    first_name = Column(String)
    role = Column(String)
    password_hash = Column(String)

    

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    sender = Column(String, nullable=False)
    sender_name = Column(String, nullable=False)
    recipient = Column(String, nullable=False, index=True)
    recipient_name = Column(String, nullable=False)
    text = Column(String, nullable=False)
    timestamp = Column(String, nullable=False, default=_now_iso)
    read = Column(Boolean, nullable=False, default=False)


