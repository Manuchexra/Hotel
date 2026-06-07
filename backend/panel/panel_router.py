import json
import asyncio
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketException, status
from pydantic import BaseModel

from common.rbac import decode_token, get_current_user, require_role, create_access_token
from common.redis_client import get_redis
from common.config import settings
from .message_service import (
    save_message,
    get_messages_for_user,
    mark_message_read as db_mark_message_read,
)
from .websocket_manager import manager
from sqlalchemy.orm import Session
from common.database import get_db


router = APIRouter(tags=["Messages"])
redis_client = get_redis()

_notification_subscribed = False


async def get_current_user_ws(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION, reason="Token missing"
        )
    try:
        payload = decode_token(token)
        username = payload.get("sub")
        role = payload.get("role")
        if not username or not role:
            raise WebSocketException(
                code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token"
            )
        return {"username": username, "role": role}
    except Exception:
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token"
        )


@router.on_event("startup")
async def startup_subscribe_notifications():
    """Redis kanallarini tinglash va WebSocket orqali uzatish."""
    global _notification_subscribed
    if _notification_subscribed:
        return
    _notification_subscribed = True

    loop = asyncio.get_event_loop()

    def on_staff_notification(message: dict):
        role = message.get("role")
        payload = {"channel": "staff.notification", "data": message}
        if role:
            asyncio.run_coroutine_threadsafe(
                manager.broadcast_to_role(role, payload), loop
            )
        else:
            asyncio.run_coroutine_threadsafe(
                manager.broadcast(payload), loop
            )

    def on_staff_message(message: dict):
        """Xususiy xabarni faqat qabul qiluvchiga yuborish."""
        data = message.get("data", {})
        recipient = data.get("to")
        if recipient:
            asyncio.run_coroutine_threadsafe(
                manager.send_to_user(recipient, message), loop
            )
        else:
            asyncio.run_coroutine_threadsafe(
                manager.broadcast(message), loop
            )

    def on_staff_broadcast(message: dict):
        """Hammaga bildirishnoma yuborish."""
        asyncio.run_coroutine_threadsafe(
            manager.broadcast(message), loop
        )

    def on_cleaning_queue(message: dict):
        payload = {"channel": "cleaning.queue.updated", "data": message}
        asyncio.run_coroutine_threadsafe(
            manager.broadcast_to_role("housekeeping", payload), loop
        )

    def on_issue_created(message: dict):
        """Yangi muammo yaratilganda maintenance va receptionga bildirishnoma yuborish."""
        payload = {
            "channel": "issue.created",
            "data": {
                **message,
                "title": "🔧 Yangi Xona Muammosi",
                "message": f"{message.get('room_id')}-xonada yangi muammo: {message.get('description')} (Ustuvorlik: {message.get('priority')})",
                "level": "warning" if message.get("priority") in ("Kritik", "Yuqori") else "info",
                "role": "maintenance",
            }
        }
        # Maintenance va Reception ko'rishi kerak
        asyncio.run_coroutine_threadsafe(
            manager.broadcast_to_role("maintenance", payload), loop
        )
        asyncio.run_coroutine_threadsafe(
            manager.broadcast_to_role("reception", payload), loop
        )

    def on_issue_assigned(message: dict):
        """Muammo tayinlanganda maintenance xodimlariga bildirishnoma yuborish."""
        payload = {
            "channel": "issue.assigned",
            "data": {
                **message,
                "title": "👤 Muammo Tayinlandi",
                "message": f"{message.get('room_id')}-xonadagi muammo {message.get('technician')} ga tayinlandi",
                "level": "info",
                "role": "maintenance",
            }
        }
        asyncio.run_coroutine_threadsafe(
            manager.broadcast_to_role("maintenance", payload), loop
        )

    redis_client.subscribe("staff.notification", on_staff_notification)
    redis_client.subscribe("staff.message", on_staff_message)
    redis_client.subscribe("staff.broadcast", on_staff_broadcast)
    redis_client.subscribe("cleaning.queue.updated", on_cleaning_queue)
    redis_client.subscribe("billing.bill_updated", lambda m: asyncio.run_coroutine_threadsafe(
        manager.broadcast({"channel": "billing.bill_updated", "data": m}), loop
    ))
    redis_client.subscribe("room.status.updated", lambda m: asyncio.run_coroutine_threadsafe(
        manager.broadcast({"channel": "room.status.updated", "data": m}), loop
    ))
    redis_client.subscribe("issue.created", on_issue_created)
    redis_client.subscribe("issue.assigned", on_issue_assigned)


@router.websocket("/ws/panel")
async def websocket_panel(websocket: WebSocket):
    """WebSocket ulanish - RBAC bilan himoyalangan. Token query param orqali beriladi."""
    user = await get_current_user_ws(websocket)
    await manager.connect(websocket, user["username"], user["role"])
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                continue
            
            # WebSocket orqali kelgan xabarlarni redis'ga yuborish (agar kerak bo'lsa)
            if payload.get("type") == "staff_message" and isinstance(payload.get("data"), dict):
                # Bu yerda legacy websocket chat logikasi bo'lishi mumkin
                # Lekin biz hozir HTTP API orqali xabar yuboryapmiz
                pass
    except Exception:
        manager.disconnect(websocket)

