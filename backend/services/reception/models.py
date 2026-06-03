import time
import uuid
from enum import Enum
from typing import Optional
from sqlalchemy import Column, String, Integer, Float, Boolean, Enum as SQLEnum, ForeignKey
from common.database import Base

class RoomStatus(str, Enum):
    CLEAN = "toza"
    DIRTY = "iflos"
    CLEANING = "tozalanmoqda"
    MAINTENANCE = "texnik_xizmat"
    OCCUPIED = "band"

class RoomType(str, Enum):
    SINGLE = "bir kishilik"
    DOUBLE = "ikki kishilik"
    SUITE = "lyuks"
    ACCESSIBLE = "nogiron"

class Room(Base):
    __tablename__ = "rooms"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    number = Column(Integer, unique=True, nullable=False)
    floor = Column(Integer, nullable=False)
    type = Column(SQLEnum(RoomType, native_enum=False), nullable=False)
    status = Column(SQLEnum(RoomStatus, native_enum=False), nullable=False)
    last_cleaned_at = Column(Float, nullable=False)
    distance_to_lift = Column(Integer, nullable=False, default=999)
    current_guest_id = Column(String, ForeignKey("guests.id"), nullable=True)
    created_at = Column(Float, nullable=False, default=time.time)

class Guest(Base):
    __tablename__ = "guests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    room_type = Column(SQLEnum(RoomType, native_enum=False), nullable=False)
    preferred_floor = Column(Integer, nullable=True)
    near_lift = Column(Boolean, nullable=False, default=False)
    nights = Column(Integer, nullable=False)
    room_price_per_night = Column(Float, nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.number"), nullable=True)
    login = Column(String, nullable=True, unique=True)
    password_hash = Column(String, nullable=True)
    created_at = Column(Float, nullable=False, default=time.time)
