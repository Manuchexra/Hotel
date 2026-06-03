import time
import uuid
from typing import Optional
from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, text
from sqlalchemy.orm import relationship
from common.database import Base

class Bill(Base):
    __tablename__ = "bills"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    guest_id = Column(String, nullable=False, index=True)
    room_id = Column(Integer, nullable=False)
    guest_name = Column(String, nullable=False)
    total = Column(Float, nullable=False, default=0.0, server_default=text("0.0"))
    discount_percent = Column(Float, nullable=False, default=0.0, server_default=text("0.0"))
    is_closed = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    closed_at = Column(Float, nullable=True)
    created_at = Column(Float, nullable=False, default=time.time)

    items = relationship("BillItem", back_populates="bill", cascade="all, delete-orphan")

class BillItem(Base):
    __tablename__ = "bill_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    bill_id = Column(String, ForeignKey("bills.id"), nullable=False)
    description = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    timestamp = Column(Float, nullable=False, default=time.time)

    bill = relationship("Bill", back_populates="items")
