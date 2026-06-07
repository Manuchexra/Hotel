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



@app.on_event("startup")
async def startup_event():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}
