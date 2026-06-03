from typing import List, Dict
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_meta: Dict[int, dict] = {}  # id(websocket) -> {username, role}

    async def connect(self, websocket: WebSocket, username: str = None, role: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.user_meta[id(websocket)] = {"username": username or "", "role": role or ""}

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        self.user_meta.pop(id(websocket), None)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

    async def broadcast_to_role(self, role: str, message: dict):
        """Berilgan rol uchun va manager/admin barcha ulangan foydalanuvchilarga yuborish."""
        for connection in self.active_connections:
            meta = self.user_meta.get(id(connection), {})
            conn_role = meta.get("role", "")
            if conn_role == role or conn_role in ("manager", "admin"):
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

    async def send_to_user(self, username: str, message: dict):
        """Muayyan foydalanuvchiga yuborish."""
        for connection in self.active_connections:
            meta = self.user_meta.get(id(connection), {})
            if meta.get("username") == username:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass


manager = ConnectionManager()
