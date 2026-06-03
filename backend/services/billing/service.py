import time
from typing import Optional
from common.database import SessionLocal
from common.redis_client import get_redis
from .models import Bill, BillItem

redis_client = get_redis()

_events_subscribed = False


def subscribe_to_events():
    global _events_subscribed
    if _events_subscribed:
        return
    _events_subscribed = True

    def on_guest_checked_in(message: dict):
        guest_id = message.get("guest_id")
        room_id = message.get("room_id")
        price_per_night = message.get("room_price_per_night")
        nights = message.get("nights")
        if guest_id and room_id is not None and price_per_night is not None and nights is not None:
            total_room_cost = price_per_night * nights
            guest_name = message.get("guest_name", f"Guest_{guest_id}")
            with SessionLocal() as db:
                bill = db.query(Bill).filter(Bill.guest_id == guest_id).first()
                if not bill:
                    bill = Bill(guest_id=guest_id, room_id=room_id, guest_name=guest_name, total=0.0, discount_percent=0.0, is_closed=False)
                    db.add(bill)
                    db.flush()
                item = BillItem(description=f"Xona {room_id} - {nights} kecha", amount=total_room_cost, timestamp=time.time(), bill=bill)
                bill.items.append(item)
                bill.total = (bill.total or 0.0) + total_room_cost
                db.commit()
            redis_client.publish("billing.bill_updated", {"guest_id": guest_id, "new_total": bill.total})

    def on_order_completed(message: dict):
        guest_id = message.get("guest_id")
        total_price = message.get("total_price")
        items = message.get("items", [])
        if guest_id and total_price is not None:
            with SessionLocal() as db:
                bill = db.query(Bill).filter(Bill.guest_id == guest_id).first()
                if bill:
                    for itm in items:
                        item = BillItem(description=f"Xona xizmati: {itm['name']}", amount=itm['price'], timestamp=time.time(), bill=bill)
                        bill.items.append(item)
                    bill.total = (bill.total or 0.0) + total_price
                    db.commit()
                    redis_client.publish("billing.bill_updated", {"guest_id": guest_id, "new_total": bill.total})
                else:
                    print(f"Bill not found for guest {guest_id}")

    def on_late_checkout(message: dict):
        guest_id = message.get("guest_id")
        extra_charge = message.get("extra_charge", 30)
        if guest_id:
            with SessionLocal() as db:
                bill = db.query(Bill).filter(Bill.guest_id == guest_id).first()
                if bill:
                    item = BillItem(description="Kech chiqish to‘lovi", amount=extra_charge, timestamp=time.time(), bill=bill)
                    bill.items.append(item)
                    bill.total = (bill.total or 0.0) + extra_charge
                    db.commit()
                    redis_client.publish("billing.bill_updated", {"guest_id": guest_id, "new_total": bill.total})

    def on_finalize_request(message: dict):
        guest_id = message.get("guest_id")
        if guest_id:
            finalize_bill(guest_id)

    redis_client.subscribe("guest.checked_in", on_guest_checked_in)
    redis_client.subscribe("room_service.order_completed", on_order_completed)
    redis_client.subscribe("late_checkout.requested", on_late_checkout)
    redis_client.subscribe("billing.finalize_request", on_finalize_request)


def init_bill(guest_id: str, guest_name: str, room_id: int,
              room_price_per_night: float, nights: int) -> dict:
    """
    Mehmon check-in paytida billing yozuvini yaratish.
    Redis event'ni kutmasdan bevosita chaqiriladi (race condition oldini olish).
    """
    total_room_cost = room_price_per_night * nights
    with SessionLocal() as db:
        existing = db.query(Bill).filter(Bill.guest_id == guest_id).first()
        if existing:
            return {"success": True, "already_exists": True}
        bill = Bill(guest_id=guest_id, room_id=room_id, guest_name=guest_name, total=0.0, discount_percent=0.0, is_closed=False)
        db.add(bill)
        db.flush()  # bill.id ni olish uchun
        item = BillItem(
            description=f"Xona {room_id} - {nights} kecha",
            amount=total_room_cost,
            timestamp=time.time(),
            bill=bill
        )
        bill.items.append(item)
        bill.total = (bill.total or 0.0) + total_room_cost
        db.commit()
    redis_client.publish("billing.bill_updated", {"guest_id": guest_id, "new_total": total_room_cost})
    return {"success": True, "already_exists": False}



def get_bill(guest_id: str) -> Optional[dict]:
    with SessionLocal() as db:
        bill = db.query(Bill).filter(Bill.guest_id == guest_id).first()
        if not bill:
            return None
        final_total = (bill.total or 0.0) * (1 - (bill.discount_percent or 0.0) / 100)
        return {
            "guest_id": bill.guest_id,
            "room_id": bill.room_id,
            "guest_name": bill.guest_name,
            "items": [{"description": i.description, "amount": i.amount, "timestamp": i.timestamp} for i in bill.items],
            "total": bill.total,
            "discount_percent": bill.discount_percent,
            "final_total": final_total,
            "is_closed": bill.is_closed
        }


def add_manual_item(guest_id: str, description: str, amount: float) -> dict:
    with SessionLocal() as db:
        bill = db.query(Bill).filter(Bill.guest_id == guest_id).first()
        if not bill:
            return {"success": False, "message": "Hisob topilmadi"}
        if bill.is_closed:
            return {"success": False, "message": "Hisob allaqachon yopilgan"}
        item = BillItem(description=description, amount=amount, timestamp=time.time(), bill=bill)
        bill.items.append(item)
        bill.total = (bill.total or 0.0) + amount
        db.commit()
        redis_client.publish("billing.bill_updated", {"guest_id": guest_id, "new_total": bill.total})
        return {"success": True, "new_total": bill.total}


def apply_discount(guest_id: str, discount_percent: float) -> dict:
    with SessionLocal() as db:
        bill = db.query(Bill).filter(Bill.guest_id == guest_id).first()
        if not bill:
            return {"success": False, "message": "Hisob topilmadi"}
        if bill.is_closed:
            return {"success": False, "message": "Hisob allaqachon yopilgan"}
        bill.discount_percent = discount_percent
        final_total = (bill.total or 0.0) * (1 - discount_percent / 100)
        db.commit()
        redis_client.publish("billing.bill_updated", {"guest_id": guest_id, "new_total": final_total})
        return {"success": True, "discount_applied": discount_percent, "final_total": final_total}


def finalize_bill(guest_id: str) -> dict:
    with SessionLocal() as db:
        bill = db.query(Bill).filter(Bill.guest_id == guest_id).first()
        if not bill:
            return {"success": False, "message": "Hisob topilmadi"}
        if bill.is_closed:
            return {"success": False, "message": "Hisob allaqachon yopilgan"}
        final_total = (bill.total or 0.0) * (1 - (bill.discount_percent or 0.0) / 100)
        bill.is_closed = True
        bill.closed_at = time.time()
        db.commit()
        redis_client.publish("billing.final_bill", {
            "guest_id": guest_id,
            "guest_name": bill.guest_name,
            "room_id": bill.room_id,
            "final_total": final_total,
            "items_count": len(bill.items)
        })
        return {"success": True, "final_total": final_total}


subscribe_to_events()
