import json
import os
import threading
from dotenv import load_dotenv
from .password_utils import hash_password

load_dotenv()

DEFAULT_SECRET_KEY = "your-secret-key-change-me"
_WEAK_KEYS = {
    DEFAULT_SECRET_KEY,
    "your-secret-key-change-in-production-2026",
    "secret",
    "changeme",
}


class Settings:
    _instance = None
    _lock = threading.Lock()

    # Redis
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))

    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", DEFAULT_SECRET_KEY)
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    # Test users string: "username:password:role,username2:password2:role2"
    USERS_STR: str = os.getenv(
        "USERS",
        "admin:admin123:manager,reception:rec123:receptionist,house:house123:housekeeping,"
        "rs:rs123:roomservice,mtc:mtc123:maintenance,hr:hr123:hr",
    )
    USER_STORE_PATH: str = os.getenv(
        "USER_STORE_PATH",
        os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "data", "users.json")),
    )

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return
        self._initialized = True
        self._users = None
        self._user_profiles = None
        self._validate_secret_key()
        self._load_user_store()

    def _validate_secret_key(self):
        if self.SECRET_KEY in _WEAK_KEYS or len(self.SECRET_KEY) < 32:
            raise RuntimeError(
                "SECRET_KEY xavfsiz emas yoki default qiymatda. "
                "Ishlab chiqarishdan oldin .env faylida kuchli SECRET_KEY belgilang "
                "(kamida 32 belgi, `python -c \"import secrets; print(secrets.token_hex(32))\"`)"
            )

    def _build_users_from_env(self) -> dict:
        users_dict = {}
        for item in self.USERS_STR.split(","):
            if ":" in item:
                username, password, role = item.split(":", 2)
                users_dict[username] = {"password_hash": hash_password(password), "role": role}
        return users_dict

    def _default_profiles(self) -> dict:
        return {
            "admin": {
                "fullname": "Administrator",
                "avatar_url": "https://ui-avatars.com/api/?name=Administrator&background=0f2b1d&color=fff&size=128",
                "email": "admin@hotelos.uz",
                "created_at": "2024-01-15",
                "last_login": "2026-05-28 10:30:00",
                "is_active": True,
            },
            "reception": {
                "fullname": "Qabulxona Xodimi",
                "avatar_url": "https://ui-avatars.com/api/?name=Reception&background=0f2b1d&color=fff&size=128",
                "email": "reception@hotelos.uz",
                "created_at": "2024-02-10",
                "last_login": "2026-05-28 09:15:00",
                "is_active": True,
            },
            "house": {
                "fullname": "Tozalash Xodimi",
                "avatar_url": "https://ui-avatars.com/api/?name=Housekeeping&background=0f2b1d&color=fff&size=128",
                "email": "house@hotelos.uz",
                "created_at": "2024-02-10",
                "last_login": "2026-05-27 16:45:00",
                "is_active": True,
            },
            "rs": {
                "fullname": "Xona Xizmati Xodimi",
                "avatar_url": "https://ui-avatars.com/api/?name=Room+Service&background=0f2b1d&color=fff&size=128",
                "email": "roomservice@hotelos.uz",
                "created_at": "2024-03-01",
                "last_login": "2026-05-28 08:20:00",
                "is_active": True,
            },
            "mtc": {
                "fullname": "Texnik Xodim",
                "avatar_url": "https://ui-avatars.com/api/?name=Maintenance&background=0f2b1d&color=fff&size=128",
                "email": "maintenance@hotelos.uz",
                "created_at": "2024-03-01",
                "last_login": "2026-05-27 14:10:00",
                "is_active": True,
            },
            "hr": {
                "fullname": "HR Mutaxassisi",
                "avatar_url": "https://ui-avatars.com/api/?name=HR&background=0f2b1d&color=fff&size=128",
                "email": "hr@hotelos.uz",
                "created_at": "2024-03-01",
                "last_login": "2026-05-28 11:00:00",
                "is_active": True,
            },
        }

    def _sync_user_profiles(self) -> bool:
        defaults = self._default_profiles()
        changed = False
        for username in self._users:
            if username not in self._user_profiles:
                self._user_profiles[username] = defaults.get(
                    username,
                    {
                        "fullname": username.title(),
                        "avatar_url": f"https://ui-avatars.com/api/?name={username.title()}&background=0f2b1d&color=fff&size=128",
                        "email": f"{username}@hotelos.uz",
                        "created_at": "2024-01-01",
                        "last_login": "2026-01-01 00:00:00",
                        "is_active": True,
                    },
                )
                changed = True
        for username in list(self._user_profiles):
            if username not in self._users:
                del self._user_profiles[username]
                changed = True
        return changed

    def _save_user_store(self):
        directory = os.path.dirname(self.USER_STORE_PATH)
        if directory:
            os.makedirs(directory, exist_ok=True)
        with open(self.USER_STORE_PATH, "w", encoding="utf-8") as f:
            json.dump({"users": self._users, "profiles": self._user_profiles}, f, indent=2)

    def _load_user_store(self):
        if os.path.isfile(self.USER_STORE_PATH):
            with open(self.USER_STORE_PATH, encoding="utf-8") as f:
                data = json.load(f)
            self._users = data.get("users", {})
            self._user_profiles = data.get("profiles", {})
            changed = False
            env_users = self._build_users_from_env()
            for username, user_data in env_users.items():
                if username not in self._users:
                    self._users[username] = user_data
                    changed = True
            if self._sync_user_profiles():
                changed = True
            if changed:
                self._save_user_store()
            return

        self._users = self._build_users_from_env()
        self._user_profiles = {}
        self._sync_user_profiles()
        self._save_user_store()

    @property
    def users(self) -> dict:
        """Return dict of {username: {"password_hash": hash, "role": role}}"""
        return self._users

    def change_user_password(self, username: str, new_password: str) -> bool:
        if username in self.users:
            self.users[username]["password_hash"] = hash_password(new_password)
            self._save_user_store()
            return True
        return False

    def add_user(self, username: str, password: str, role: str, profile: dict = None) -> bool:
        if username in self.users:
            return False
        self.users[username] = {"password_hash": hash_password(password), "role": role}
        if profile:
            self.user_profiles[username] = profile
        else:
            self._sync_user_profiles()
        self._save_user_store()
        return True

    def update_user(self, username: str, password: str = None, role: str = None, profile_updates: dict = None) -> bool:
        if username not in self.users:
            return False
        if password is not None:
            self.users[username]["password_hash"] = hash_password(password)
        if role is not None:
            self.users[username]["role"] = role
        if profile_updates:
            self.user_profiles[username] = {
                **self.user_profiles.get(username, {}),
                **profile_updates,
            }
        self._save_user_store()
        return True

    def delete_user(self, username: str) -> bool:
        if username not in self.users:
            return False
        del self.users[username]
        if username in self.user_profiles:
            del self.user_profiles[username]
        self._save_user_store()
        return True

    @property
    def user_profiles(self) -> dict:
        """Return enriched user profile metadata for admin UIs."""
        if self._sync_user_profiles():
            self._save_user_store()
        return self._user_profiles


def get_settings() -> Settings:
    return Settings()


settings = get_settings()
