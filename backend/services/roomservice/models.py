import time
import uuid
from typing import Optional
from enum import Enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Enum as SQLEnum, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from common.database import Base

class OrderStatus(str, Enum):
    RECEIVED = "Qabul qilindi"
    PREPARING = "Tayyorlanmoqda"
    DELIVERING = "Yetkazilmoqda"
    DELIVERED = "Yetkazildi"

class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    room_id = Column(Integer, nullable=False)
    guest_id = Column(String, nullable=True)
    total_price = Column(Float, nullable=False)
    status = Column(SQLEnum(OrderStatus, native_enum=False), nullable=False, default=OrderStatus.RECEIVED)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(Float, nullable=False, default=time.time)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String, ForeignKey("orders.id"), nullable=False)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
