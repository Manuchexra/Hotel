# services/roomservice/dependencies.py
from fastapi import HTTPException, status

def validate_order_id(order_id: str):
    # Kelajakda foydalanish uchun
    pass