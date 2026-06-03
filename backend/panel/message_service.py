import uuid
from datetime import datetime, timezone
from typing import List, Optional
from common.database import SessionLocal
from .models import Message


def _message_to_dict(message: Message) -> dict:
    return {
        "id": message.id,
        "from": message.sender,
        "fromName": message.sender_name,
        "to": message.recipient,
        "toName": message.recipient_name,
        "text": message.text,
        "timestamp": message.timestamp,
        "read": message.read,
    }


def save_message(sender: str, sender_name: str, recipient: str, recipient_name: str, text: str) -> dict:
    message = Message(
        id=str(uuid.uuid4()),
        sender=sender,
        sender_name=sender_name,
        recipient=recipient,
        recipient_name=recipient_name,
        text=text,
        timestamp=datetime.now(timezone.utc).isoformat(),
        read=False,
    )
    with SessionLocal() as db:
        db.add(message)
        db.commit()
        db.refresh(message)
    return _message_to_dict(message)


def list_messages() -> List[dict]:
    with SessionLocal() as db:
        messages = db.query(Message).order_by(Message.timestamp.desc()).all()
        return [_message_to_dict(m) for m in messages]


def get_messages_for_user(username: str) -> List[dict]:
    with SessionLocal() as db:
        messages = (
            db.query(Message)
            .filter(Message.recipient == username)
            .order_by(Message.timestamp.desc())
            .all()
        )
        return [_message_to_dict(m) for m in messages]


def mark_message_read(message_id: str, username: Optional[str] = None) -> bool:
    with SessionLocal() as db:
        message = db.query(Message).filter(Message.id == message_id).first()
        if not message:
            return False
        if username is not None and message.recipient != username:
            return False
        message.read = True
        db.commit()
        return True
