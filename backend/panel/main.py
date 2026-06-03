from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .panel_router import router
from .login_router import login_router
import threading
from common.redis_client import get_redis
from .websocket_manager import manager
import json
import asyncio

app = FastAPI(title="HotelOS Panel")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(login_router)
app.include_router(router)


from common.database import init_db

redis_client = get_redis()

_loop = None


def redis_listener():
    pubsub = redis_client.client.pubsub()
    channels = [
        "room.status.update",
        "order.status.updated",
        "issue.created",
        "issue.resolved",
        "billing.bill_updated",
        "cleaning.queue.updated",
        "staff.message",
    ]
    pubsub.subscribe(*channels)
    for message in pubsub.listen():
        if message["type"] == "message":
            channel = message.get("channel")
            if isinstance(channel, bytes):
                try:
                    channel = channel.decode()
                except Exception:
                    channel = str(channel)
            if not isinstance(channel, str):
                channel = str(channel)
            try:
                data = json.loads(message["data"])
            except (json.JSONDecodeError, TypeError):
                data = message["data"]
            if _loop and _loop.is_running():
                asyncio.run_coroutine_threadsafe(
                    manager.broadcast({"channel": channel, "data": data}),
                    _loop,
                )


@app.on_event("startup")
async def startup_event():
    global _loop
    _loop = asyncio.get_event_loop()
    init_db()
    thread = threading.Thread(target=redis_listener, daemon=True)
    thread.start()


@app.get("/health")
def health():
    return {"status": "ok"}
