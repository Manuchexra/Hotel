import redis
import json
import threading
from typing import Callable, Any
from .config import settings

class RedisClient:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        self.pool = redis.ConnectionPool(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            decode_responses=True
        )
        self.client = redis.Redis(connection_pool=self.pool)
        self.pubsub = self.client.pubsub()
        self._running = False
        self._thread = None

    def publish(self, channel: str, message: dict):
        """Publish JSON message to Redis channel"""
        try:
            self.client.publish(channel, json.dumps(message))
        except Exception as e:
            print(f"Redis publish error: {e}")

    def subscribe(self, channel: str, callback: Callable[[dict], Any]):
        """Subscribe to a Redis channel and run callback in background thread"""
        def handler(msg):
            if msg.get("type") != "message":
                return
            data = msg.get("data")
            if not isinstance(data, str):
                return
            callback(json.loads(data))

        self.pubsub.subscribe(**{channel: handler})
        if not self._running:
            self._running = True
            self._thread = threading.Thread(target=self._run_listener, daemon=True)
            self._thread.start()

    def _run_listener(self):
        for message in self.pubsub.listen():
            if message['type'] == 'message':
                # callback already handled via subscribe's callable
                pass

    def close(self):
        self._running = False
        self.pubsub.close()
        self.client.close()

# Singleton instance
def get_redis() -> RedisClient:
    return RedisClient()