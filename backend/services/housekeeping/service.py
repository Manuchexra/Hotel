import time
from typing import List, Optional
from datetime import datetime, date, timedelta
from common.database import SessionLocal
from common.redis_client import get_redis
from .models import CleaningTask, CleaningStatus, CleaningHistory
import uuid

redis_client = get_redis()

cleaning_schedule: List[dict] = []


def _seed_schedule():
    if cleaning_schedule:
        return
    now = datetime.now()
    cleaning_schedule.extend([
        {"id": str(uuid.uuid4()), "room_id": 101, "scheduled_date": now.isoformat(), "shift": "morning", "priority": "normal", "status": "scheduled", "assigned_to": None},
        {"id": str(uuid.uuid4()), "room_id": 102, "scheduled_date": now.isoformat(), "shift": "afternoon", "priority": "high", "status": "scheduled", "assigned_to": "house"},
    ])

_seed_schedule()


def subscribe_to_events():
    def on_room_vacated(message: dict):
        room_id = message.get("room_id") or message.get("room_number")
        if room_id:
            add_to_queue(int(room_id))

    def on_room_status(message: dict):
        room_id = message.get("room_id") or message.get("room_number")
        status = message.get("status") or message.get("new_status") or message.get("newStatus")
        if not room_id:
            return
        if status in ("iflos", "DIRTY", "dirty"):
            add_to_queue(int(room_id))
        if status in ("toza", "CLEAN", "clean"):
            _ensure_today_cleaned()

    redis_client.subscribe("room.vacated", on_room_vacated)
    redis_client.subscribe("room.status.updated", on_room_status)
    redis_client.subscribe("room.status.update", on_room_status)
    redis_client.subscribe("room.updated", on_room_status)


def add_to_queue(room_id: int):
    with SessionLocal() as db:
        existing = db.query(CleaningTask).filter(CleaningTask.room_id == room_id, CleaningTask.status != CleaningStatus.DONE).first()
        if existing:
            return
        task = CleaningTask(room_id=room_id, status=CleaningStatus.PENDING)
        db.add(task)
        db.commit()
    redis_client.publish("cleaning.queue.updated", {"queue": get_pending_queue()})
    # Housekeeping xodimlarga bildirishnoma
    redis_client.publish("staff.notification", {
        "role": "housekeeping",
        "title": "Yangi tozalash vazifasi",
        "message": f"{room_id}-xona tozalash navbatiga qo'shildi",
        "room_id": room_id,
        "level": "info"
    })


def start_cleaning(room_id: int) -> dict:
    with SessionLocal() as db:
        task = db.query(CleaningTask).filter(CleaningTask.room_id == room_id, CleaningTask.status != CleaningStatus.DONE).first()
        if not task:
            task = CleaningTask(room_id=room_id, status=CleaningStatus.PENDING)
            db.add(task)
        if task.status == CleaningStatus.IN_PROGRESS:
            db.commit()
            return {"success": True, "room_id": room_id, "status": "tozalanmoqda", "message": "Allaqachon tozalanmoqda"}
        task.status = CleaningStatus.IN_PROGRESS
        task.started_at = time.time()
        db.commit()
    redis_client.publish("room.status.update", {"room_id": room_id, "status": "tozalanmoqda"})
    redis_client.publish("cleaning.queue.updated", {"queue": get_pending_queue()})
    return {"success": True, "room_id": room_id, "status": "tozalanmoqda"}


def finish_cleaning(room_id: int, cleaned_by: Optional[str] = None) -> dict:
    with SessionLocal() as db:
        task = db.query(CleaningTask).filter(CleaningTask.room_id == room_id, CleaningTask.status != CleaningStatus.DONE).first()
        if not task:
            task = CleaningTask(room_id=room_id, status=CleaningStatus.IN_PROGRESS, started_at=time.time())
            db.add(task)
        task.status = CleaningStatus.DONE
        task.finished_at = time.time()
        if cleaned_by:
            task.assigned_to = cleaned_by
        started = task.started_at or time.time()
        duration_minutes = int((task.finished_at - started) / 60)
        history_record = CleaningHistory(
            room_id=room_id,
            cleaned_by=cleaned_by or task.assigned_to,
            started_at=started,
            finished_at=task.finished_at,
            duration_minutes=max(0, duration_minutes),
        )
        db.add(history_record)
        db.commit()
    redis_client.publish("room.status.update", {"room_id": room_id, "status": "toza"})
    redis_client.publish("room.cleaning.updated", {"room_id": room_id, "status": "clean"})
    redis_client.publish("housekeeping.cleaned.updated", {"room_id": room_id})
    redis_client.publish("cleaning.queue.updated", {"queue": get_pending_queue()})
    return {"success": True, "room_id": room_id, "status": "toza"}


def get_pending_queue() -> List[int]:
    with SessionLocal() as db:
        tasks = db.query(CleaningTask).filter(CleaningTask.status == CleaningStatus.PENDING).all()
        return [t.room_id for t in tasks]


def get_cleaned_rooms() -> List[int]:
    today_start = datetime.combine(date.today(), datetime.min.time()).timestamp()
    with SessionLocal() as db:
        records = db.query(CleaningHistory).filter(CleaningHistory.finished_at >= today_start).all()
        return [record.room_id for record in records]


def _ensure_today_cleaned():
    return


def get_history() -> List[dict]:
    from common.config import settings

    def resolve_cleaner(name_or_username: Optional[str]) -> Optional[str]:
        if not name_or_username:
            return None
        profile = settings.user_profiles.get(name_or_username)
        if profile and profile.get("fullname"):
            return profile.get("fullname")
        return name_or_username

    with SessionLocal() as db:
        records = db.query(CleaningHistory).order_by(CleaningHistory.finished_at.desc()).all()
        return [
            {
                "id": record.id,
                "room_id": record.room_id,
                "cleaned_by": resolve_cleaner(record.cleaned_by),
                "started_at": datetime.fromtimestamp(record.started_at).isoformat(),
                "finished_at": datetime.fromtimestamp(record.finished_at).isoformat(),
                "duration_minutes": record.duration_minutes
            }
            for record in records
        ]


def get_schedule() -> List[dict]:
    return [
        {
            "id": entry.get("id"),
            "room_id": entry.get("room_id"),
            "scheduled_date": entry.get("scheduled_date"),
            "shift": entry.get("shift"),
            "priority": entry.get("priority"),
            "status": entry.get("status"),
            "assigned_to": entry.get("assigned_to")
        }
        for entry in cleaning_schedule
    ]


def get_stats(period: str = "day") -> dict:
    now = datetime.now()
    days = 1
    if period == "week":
        days = 7
    elif period == "month":
        days = 30
    start_cutoff = now - timedelta(days=days)
    start_cutoff_ts = start_cutoff.timestamp()
    with SessionLocal() as db:
        relevant = db.query(CleaningHistory).filter(CleaningHistory.finished_at >= start_cutoff_ts).all()
    total_rooms_cleaned = len(relevant)
    avg_time = int(sum(r.duration_minutes for r in relevant) / len(relevant)) if relevant else 0
    labels = []
    values = []
    for i in range(days):
        day = (start_cutoff + timedelta(days=i)).date()
        labels.append(day.isoformat())
        count = sum(1 for r in relevant if datetime.fromtimestamp(r.finished_at).date() == day)
        values.append(count)
    most_cleaned_day = labels[values.index(max(values))] if any(values) else None
    return {
        "total_rooms_cleaned": total_rooms_cleaned,
        "average_time_per_room": avg_time,
        "most_cleaned_day": most_cleaned_day,
        "chart_data": {"labels": labels, "values": values}
    }

subscribe_to_events()
