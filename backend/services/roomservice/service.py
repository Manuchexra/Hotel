from typing import List, Optional
from datetime import datetime
from common.database import SessionLocal
from common.redis_client import get_redis
from .models import Order, OrderItem, OrderStatus
from .schemas import OrderItemSchema

redis_client = get_redis()


def subscribe_to_events():
    """Qabul qilish kerak bo‘lgan xabarlar (agar kerak bo‘lsa)"""
    pass


def create_order(room_id: int, guest_id: Optional[str], items_schema: List[OrderItemSchema]) -> dict:
    with SessionLocal() as db:
        items = [OrderItem(name=item.name, price=item.price) for item in items_schema]
        total = sum(item.price for item in items)
        order = Order(
            room_id=room_id,
            guest_id=guest_id,
            total_price=total,
            status=OrderStatus.RECEIVED,
        )
        order.items = items
        db.add(order)
        db.commit()
        db.refresh(order)

        # BUG FIX #5: Billing faqat DELIVERED paytida ishga tushishi kerak,
        # yaratilgan paytda emas. Shuning uchun bu yerda faqat status xabarini yuboramiz.
        redis_client.publish("order.status.updated", {
            "order_id": order.id,
            "room_id": order.room_id,
            "status": order.status.value,
            "total_price": order.total_price
        })

        return {
            "success": True,
            "order_id": order.id,
            "total_price": order.total_price,
            "status": order.status.value
        }


def update_order_status(order_id: str, new_status: OrderStatus) -> dict:
    with SessionLocal() as db:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            return {"success": False, "message": "Buyurtma topilmadi"}
        order.status = new_status
        order.updated_at = datetime.utcnow()
        db.commit()

        redis_client.publish("order.status.updated", {
            "order_id": order.id,
            "room_id": order.room_id,
            "status": order.status.value,
            "total_price": order.total_price
        })
        # BUG FIX #5: Billing xabari faqat yetkazilganda (DELIVERED) yuboriladi
        if new_status == OrderStatus.DELIVERED and order.guest_id:
            redis_client.publish("room_service.order_completed", {
                "order_id": order.id,
                "guest_id": order.guest_id,
                "room_id": order.room_id,
                "total_price": order.total_price,
                "items": [{"name": i.name, "price": i.price} for i in order.items]
            })
        return {"success": True, "order_id": order_id, "status": new_status.value}


def get_orders_by_room(room_id: int) -> List[dict]:
    with SessionLocal() as db:
        orders = db.query(Order).filter(Order.room_id == room_id).all()
        return [
            {
                "id": o.id,
                "items": [{"name": i.name, "price": i.price} for i in o.items],
                "total_price": o.total_price,
                "status": o.status.value
            }
            for o in orders
        ]


def get_all_orders() -> List[dict]:
    with SessionLocal() as db:
        orders = db.query(Order).all()
        return [
            {
                "id": o.id,
                "room_id": o.room_id,
                "guest_id": o.guest_id,
                "items": [{"name": i.name, "price": i.price} for i in o.items],
                "total_price": o.total_price,
                "status": o.status.value,
                "created_at": o.created_at,
                "updated_at": o.updated_at.isoformat(),
            }
            for o in orders
        ]
