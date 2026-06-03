import time
import uuid
from typing import List, Optional
from common.database import SessionLocal
from common.redis_client import get_redis
from .models import Room, Guest, RoomStatus, RoomType, Guest as GuestModel
from .schemas import RoomOut
import bcrypt
from sqlalchemy.orm import Session

redis_client = get_redis()


def init_rooms():
    with SessionLocal() as db:
        if db.query(Room).count():
            return
        default_rooms = []
        room_type_cycle = [
            RoomType.SINGLE, RoomType.DOUBLE, RoomType.DOUBLE,
            RoomType.SUITE, RoomType.ACCESSIBLE, RoomType.DOUBLE,
            RoomType.SINGLE, RoomType.SUITE, RoomType.DOUBLE, RoomType.ACCESSIBLE,
        ]
        for floor in range(1, 6):
            for num in range(1, 11):
                room_number = floor * 100 + num
                room_type = room_type_cycle[(num - 1) % len(room_type_cycle)]
                near_lift = num <= 2
                default_rooms.append(Room(
                    number=room_number,
                    floor=floor,
                    type=room_type,
                    status=RoomStatus.CLEAN,
                    last_cleaned_at=time.time(),
                    distance_to_lift=10 if near_lift else 50,
                ))
        db.add_all(default_rooms)
        db.commit()


def get_room_by_number(number: int) -> Optional[Room]:
    with SessionLocal() as db:
        return db.query(Room).filter(Room.number == number).first()


def get_guest_by_id(guest_id: str) -> Optional[GuestModel]:
    with SessionLocal() as db:
        return db.query(GuestModel).filter(GuestModel.id == guest_id).first()


def get_all_guests() -> List[GuestModel]:
    with SessionLocal() as db:
        return db.query(GuestModel).all()


def update_room_status(room_number: int, new_status: RoomStatus) -> bool:
    with SessionLocal() as db:
        room = db.query(Room).filter(Room.number == room_number).first()
        if not room:
            return False
        room.status = new_status
        if new_status == RoomStatus.CLEAN:
            room.last_cleaned_at = time.time()
        if new_status == RoomStatus.DIRTY:
            redis_client.publish("room.vacated", {"room_id": room_number})
        redis_client.publish("room.status.updated", {
            "room_number": room_number,
            "new_status": new_status.value
        })
        db.commit()
        return True


def create_room(room_data: dict) -> Optional[Room]:
    with SessionLocal() as db:
        existing = db.query(Room).filter(Room.number == room_data["number"]).first()
        if existing:
            return None
        room = Room(
            number=room_data["number"],
            floor=room_data["floor"],
            type=room_data["type"],
            status=room_data.get("status", RoomStatus.CLEAN),
            last_cleaned_at=time.time(),
            distance_to_lift=room_data.get("distance_to_lift", 999),
        )
        db.add(room)
        db.commit()
        db.refresh(room)
        redis_client.publish("room.created", {
            "room_number": room.number,
            "floor": room.floor,
            "type": room.type.value,
            "status": room.status.value
        })
        return room


def update_room(room_number: int, updates: dict) -> Optional[Room]:
    with SessionLocal() as db:
        room = db.query(Room).filter(Room.number == room_number).first()
        if not room:
            return None
        if updates.get("floor") is not None:
            room.floor = updates["floor"]
        if updates.get("type") is not None:
            room.type = updates["type"]
        if updates.get("distance_to_lift") is not None:
            room.distance_to_lift = updates["distance_to_lift"]
        if updates.get("status") is not None:
            room.status = updates["status"]
            if room.status == RoomStatus.CLEAN:
                room.last_cleaned_at = time.time()
            if room.status == RoomStatus.DIRTY:
                redis_client.publish("room.vacated", {"room_id": room.number})
        db.commit()
        redis_client.publish("room.updated", {
            "room_number": room.number,
            "floor": room.floor,
            "type": room.type.value,
            "status": room.status.value,
            "distance_to_lift": room.distance_to_lift
        })
        return room


def delete_room(room_number: int) -> bool:
    with SessionLocal() as db:
        room = db.query(Room).filter(Room.number == room_number).first()
        if not room or room.current_guest_id is not None:
            return False
        db.delete(room)
        db.commit()
        redis_client.publish("room.deleted", {"room_number": room_number})
        return True


def find_best_room(db, guest: GuestModel) -> Optional[Room]:
    eligible = db.query(Room).filter(Room.status == RoomStatus.CLEAN, Room.type == guest.room_type).all()
    if not eligible:
        return None
    if guest.preferred_floor is not None:
        same_floor = [r for r in eligible if r.floor == guest.preferred_floor]
        if same_floor:
            eligible = same_floor
    if guest.near_lift:
        chosen = min(eligible, key=lambda r: (-r.last_cleaned_at, r.distance_to_lift))
    else:
        chosen = max(eligible, key=lambda r: r.last_cleaned_at)
    return chosen


def _set_guest_credentials(guest: GuestModel, room_number: int):
    """Mehmon uchun login va parol o'rnatish (agar yo'q bo'lsa)."""
    if not guest.login:
        guest.login = f"guest_{room_number}"
        plain_password = f"room{room_number}"
        salt = bcrypt.gensalt()
        guest.password_hash = bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")



def _init_bill_direct(guest_id: str, guest_name: str, room_id: int,
                      room_price_per_night: float, nights: int):
    """
    Billing servisiga to'g'ridan-to'g'ri HTTP so'rov yuborish.
    Redis pub/sub race condition'ni oldini oladi.
    """
    import time as _time
    try:
        import requests as _req
        for attempt in range(3):
            try:
                resp = _req.post(
                    "http://billing:8000/billing/init",
                    json={
                        "guest_id": guest_id,
                        "guest_name": guest_name,
                        "room_id": room_id,
                        "room_price_per_night": room_price_per_night,
                        "nights": nights,
                    },
                    timeout=5,
                )
                if resp.status_code in (200, 201):
                    return
            except Exception as e:
                print(f"[reception] billing init attempt {attempt+1} failed: {e}")
            _time.sleep(1)
    except Exception as e:
        print(f"[reception] billing init error: {e}")
        # Redis event zaxira sifatida ishlaydi


def checkin(guest_data: dict) -> dict:
    if "guest_name" in guest_data and "name" not in guest_data:
        guest_data["name"] = guest_data.pop("guest_name")
    # FIX: SQLAlchemy default= faqat INSERT paytida ishga tushadi, shuning uchun
    # guest.id = None bo'ladi va room.current_guest_id = None sifatida saqlanadi.
    # Yechim: UUID ni oldindan yaratamiz.
    if "id" not in guest_data or not guest_data.get("id"):
        guest_data["id"] = str(uuid.uuid4())
    guest = Guest(**guest_data)
    with SessionLocal() as db:
        room = find_best_room(db, guest)
        if not room:
            return {"success": False, "message": "Xona mavjud emas"}
        room.status = RoomStatus.OCCUPIED
        room.current_guest_id = guest_data["id"]  # FIX: None emas, haqiqiy UUID
        guest.room_id = room.number
        _set_guest_credentials(guest, room.number)
        db.add(guest)
        db.commit()
        db.refresh(guest)
        event_data = {
            "guest_id": guest.id,
            "guest_name": guest.name,
            "room_id": room.number,
            "room_price_per_night": guest.room_price_per_night,
            "nights": guest.nights,
        }
        redis_client.publish("guest.checked_in", event_data)
        # Billingni to'g'ridan-to'g'ri ham xabardor qilish (race condition oldini olish)
        _init_bill_direct(
            guest_id=guest.id,
            guest_name=guest.name,
            room_id=room.number,
            room_price_per_night=guest.room_price_per_night,
            nights=guest.nights,
        )
        return {
            "success": True,
            "guest_id": guest.id,
            "guest_name": guest.name,
            "room_number": room.number,
            "room_type": room.type.value,
            "floor": room.floor,
            "login": guest.login,
            "password": f"room{room.number}",
        }


def checkout(guest_id: str) -> dict:
    with SessionLocal() as db:
        guest = db.query(GuestModel).filter(GuestModel.id == guest_id).first()
        if not guest:
            return {"success": False, "message": "Mehmon topilmadi"}
        room = db.query(Room).filter(Room.number == guest.room_id).first()
        if not room:
            return {"success": False, "message": "Xona topilmadi"}
        room.status = RoomStatus.DIRTY
        room.current_guest_id = None
        guest_name_saved = guest.name
        room_number_saved = room.number
        redis_client.publish("room.vacated", {"room_id": room.number, "guest_id": guest_id})
        redis_client.publish("billing.finalize_request", {"guest_id": guest_id})
        # Housekeeping xodimlariga bildirishnoma
        redis_client.publish("staff.notification", {
            "role": "housekeeping",
            "title": "Xona tozalash kerak",
            "message": f"{room_number_saved}-xona bo'shadi. Mehmon {guest_name_saved} chiqdi. Tozalash kerak!",
            "room_id": room_number_saved,
            "level": "warning"
        })
        db.delete(guest)
        db.commit()
        return {"success": True, "guest_name": guest_name_saved, "room_number": room_number_saved}


def get_all_rooms() -> List[RoomOut]:
    with SessionLocal() as db:
        rooms = db.query(Room).all()
        result = []
        for r in rooms:
            current_guest = db.query(GuestModel).filter(GuestModel.id == r.current_guest_id).first() if r.current_guest_id else None
            result.append(RoomOut(
                id=r.id,
                number=r.number,
                floor=r.floor,
                type=r.type,
                status=r.status,
                current_guest_name=current_guest.name if current_guest else None,
            ))
        return result


def create_guest(db: Session, room_id: int, guest_name: str) -> dict:
    login = f"guest_{room_id}"
    plain_password = f"room{room_id}"
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")

    new_guest = GuestModel(
        room_id=room_id,
        name=guest_name,
        login=login,
        password_hash=password_hash,
        room_type=RoomType.SINGLE,
        nights=1,
        room_price_per_night=0.0,
    )
    db.add(new_guest)
    db.commit()
    db.refresh(new_guest)
    return {
        "login": login,
        "password": plain_password,
        "id": str(new_guest.id),
    }
