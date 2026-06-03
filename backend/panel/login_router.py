from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from common.rbac import authenticate_user, login_response, require_role, get_current_user, create_access_token
from common.redis_client import get_redis
from common.config import settings
from common.password_utils import verify_password
from common.database import SessionLocal
from .message_service import (
    save_message,
    list_messages as db_list_messages,
    get_messages_for_user,
    mark_message_read as db_mark_message_read,
)


login_router = APIRouter(tags=["Auth"])
redis_client = get_redis()


class LoginRequest(BaseModel):
    username: str
    password: str


class GuestLoginRequest(BaseModel):
    login: str
    password: str


class UserOut(BaseModel):
    id: str
    username: str
    role: str
    fullname: str
    avatar_url: str
    email: str
    created_at: str
    last_login: str
    is_active: bool
    active: bool
    payment_card: Optional[str] = None


class UserCreateRequest(BaseModel):
    username: str
    password: str
    role: str
    fullname: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = True
    payment_card: Optional[str] = None


class UserUpdateRequest(BaseModel):
    password: Optional[str] = None
    role: Optional[str] = None
    fullname: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None
    payment_card: Optional[str] = None


class BlockRequest(BaseModel):
    blocked: bool


class MessageCreateRequest(BaseModel):
    to: str
    text: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
    username: Optional[str] = None


@login_router.post(
    "/login",
    summary="Login va token olish",
    description="Username va parol bilan kirish. Muvaffaqiyatli bo'lsa JWT token qaytaradi.",
)
def login(req: LoginRequest):
    role = authenticate_user(req.username, req.password)
    if role is None:
        raise HTTPException(status_code=401, detail="Xato login yoki parol")
    return login_response(req.username, role)


@login_router.post(
    "/guest/login",
    summary="Mehmon login",
    description="Login va parol bilan mehmon kirishi. Guest roli bilan JWT token qaytaradi."
)
def guest_login(req: GuestLoginRequest):
    # Guest modeli DB dagi guests jadvalidan o'qiladi
    from services.reception.models import Guest as GuestModel

    db = SessionLocal()
    try:
        guest = db.query(GuestModel).filter(GuestModel.login == req.login).first()
        if guest is None:
            raise HTTPException(status_code=401, detail="Login yoki parol xato")
        if not guest.password_hash:
            raise HTTPException(status_code=401, detail="Bu mehmon uchun login tizimi sozlanmagan")
        if not verify_password(req.password, guest.password_hash):
            raise HTTPException(status_code=401, detail="Login yoki parol xato")
        token = create_access_token(data={
            "sub": str(guest.id),
            "role": "guest",
            "room": guest.room_id,
            "name": guest.name,
        })
        return {
            "access_token": token,
            "token_type": "bearer",
            "role": "guest",
            "guest_id": str(guest.id),
            "guest_name": guest.name,
            "room": guest.room_id,
            "login": guest.login,
        }
    finally:
        db.close()


@login_router.post(
    "/change-password",
    summary="Parolni o'zgartirish",
)
def change_password(req: PasswordChangeRequest, current_user: dict = Depends(get_current_user)):
    target_username = req.username or current_user["username"]
    if req.username and current_user["role"] != "manager":
        raise HTTPException(status_code=403, detail="Faqat manager boshqa foydalanuvchilar parolini o'zgartirishi mumkin")
    user_data = settings.users.get(target_username)
    if not user_data:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    if current_user["role"] != "manager":
        if not verify_password(req.current_password, user_data["password_hash"]):
            raise HTTPException(status_code=401, detail="Joriy parol noto'g'ri")
    settings.change_user_password(target_username, req.new_password)
    return {"status": "success", "message": "Parol muvaffaqiyatli o'zgartirildi"}


@login_router.post(
    "/users",
    response_model=UserOut,
    summary="Foydalanuvchi yaratish (Role: manager)",
)
def create_user(req: UserCreateRequest, _=Depends(require_role("manager"))):
    profile = {
        "fullname": req.fullname or req.username.title(),
        "avatar_url": f"https://ui-avatars.com/api/?name={req.username.title()}&background=0f2b1d&color=fff&size=128",
        "email": req.email or f"{req.username}@hotelos.uz",
        "created_at": datetime.now().strftime("%Y-%m-%d"),
        "last_login": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "is_active": req.is_active if req.is_active is not None else True,
        "payment_card": req.payment_card,
    }
    if not settings.add_user(req.username, req.password, req.role, profile):
        raise HTTPException(status_code=400, detail="Foydalanuvchi mavjud")
    return build_user_out(req.username, settings.users[req.username])


@login_router.put(
    "/users/{username}",
    response_model=UserOut,
    summary="Foydalanuvchi yangilash (Role: manager)",
)
def update_user(username: str, req: UserUpdateRequest, _=Depends(require_role("manager"))):
    profile_updates = {}
    if req.fullname is not None:
        profile_updates["fullname"] = req.fullname
    if req.email is not None:
        profile_updates["email"] = req.email
    if req.is_active is not None:
        profile_updates["is_active"] = req.is_active
    if req.payment_card is not None:
        profile_updates["payment_card"] = req.payment_card
    if not settings.update_user(username, req.password, req.role, profile_updates):
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    return build_user_out(username, settings.users[username])


@login_router.delete(
    "/users/{username}",
    summary="Foydalanuvchini o'chirish (Role: manager)",
)
def delete_user(username: str, _=Depends(require_role("manager"))):
    if not settings.delete_user(username):
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    return {"status": "deleted"}


def build_user_out(username: str, data: dict) -> UserOut:
    profile = settings.user_profiles.get(username, {})
    is_active = profile.get("is_active", True)
    return UserOut(
        id=username,
        username=username,
        role=data["role"],
        fullname=profile.get("fullname", username.title()),
        avatar_url=profile.get("avatar_url",
            f"https://ui-avatars.com/api/?name={username.title()}&background=0f2b1d&color=fff&size=128"),
        email=profile.get("email", f"{username}@hotelos.uz"),
        created_at=profile.get("created_at", "2024-01-01"),
        last_login=profile.get("last_login", "2026-01-01 00:00:00"),
        is_active=is_active,
        active=is_active,
        payment_card=profile.get("payment_card"),
    )


@login_router.get(
    "/users",
    response_model=List[UserOut],
    summary="Barcha foydalanuvchilar ro'yxati (Role: hr)",
)
def list_users(_=Depends(require_role("hr"))):
    return [build_user_out(u, d) for u, d in settings.users.items()]


@login_router.get(
    "/users/messages",
    summary="Mening xabarlarim",
)
def get_my_messages(current_user: dict = Depends(get_current_user)):
    return {"messages": get_messages_for_user(current_user["username"])}


@login_router.put(
    "/users/messages/{message_id}/read",
    summary="Xabarni o'qilgan qilish",
)
def mark_my_message_read(message_id: str, current_user: dict = Depends(get_current_user)):
    if not db_mark_message_read(message_id, current_user["username"]):
        raise HTTPException(status_code=404, detail="Xabar topilmadi")
    return {"success": True}


@login_router.get(
    "/users/{username}",
    response_model=UserOut,
    summary="Foydalanuvchi ma'lumotlarini olish (Role: hr)",
)
def get_user(username: str, _=Depends(require_role("hr"))):
    data = settings.users.get(username)
    if not data:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    return build_user_out(username, data)


@login_router.put(
    "/users/{username}/block",
    response_model=UserOut,
    summary="Foydalanuvchini bloklash/ochish (Role: hr)",
)
def block_user(username: str, req: BlockRequest, _=Depends(require_role("hr"))):
    data = settings.users.get(username)
    if not data:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    settings.update_user(username, profile_updates={"is_active": not req.blocked})
    return build_user_out(username, settings.users[username])


@login_router.get(
    "/users/{username}/stats",
    summary="Foydalanuvchi statistikasi (Role: hr)",
)
def user_stats(username: str, _=Depends(require_role("hr"))):
    if username not in settings.users:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    return {"checkins": 0, "cleanings": 0, "orders": 0, "issues": 0}


@login_router.get(
    "/admin/messages",
    summary="Xabarlar ro'yxati (Role: manager)",
)
def list_messages(_=Depends(require_role("manager"))):
    return db_list_messages()


@login_router.post(
    "/admin/messages",
    summary="Xabar yuborish (Role: manager)",
)
def send_message(req: MessageCreateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "manager":
        raise HTTPException(status_code=403, detail="Role manager required")
    if req.to not in settings.users:
        raise HTTPException(status_code=404, detail="Qabul qiluvchi topilmadi")
    from_u = current_user["username"]
    from_p = settings.user_profiles.get(from_u, {})
    to_p = settings.user_profiles.get(req.to, {})
    message = save_message(
        sender=from_u,
        sender_name=from_p.get("fullname", from_u),
        recipient=req.to,
        recipient_name=to_p.get("fullname", req.to),
        text=req.text,
    )
    redis_client.publish("staff.message", message)
    return message


@login_router.put(
    "/admin/messages/{message_id}/read",
    summary="Xabarni o'qilgan qilish (Role: manager)",
)
def mark_message_read(message_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "manager":
        raise HTTPException(status_code=403, detail="Role manager required")
    if not db_mark_message_read(message_id):
        raise HTTPException(status_code=404, detail="Xabar topilmadi")
    return {"success": True}
