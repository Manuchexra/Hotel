"""
conftest.py — sys.path and mocking setup for HotelOS tests.
"""
import sys
import os
import types
from unittest.mock import MagicMock

# Add backend/ to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# ── Mock SQLAlchemy Base (must be a real class so type hints work) ──────────
from sqlalchemy.orm import declarative_base
_Base = declarative_base()

# ── common.database ─────────────────────────────────────────────────────────
common_db_mod = types.ModuleType("common.database")
common_db_mod.Base = _Base
common_db_mod.SessionLocal = MagicMock
common_db_mod.get_db = MagicMock()
common_db_mod.init_db = MagicMock()
common_db_mod.wait_for_db = MagicMock()
sys.modules["common.database"] = common_db_mod

# ── common.redis_client ──────────────────────────────────────────────────────
_mock_redis = MagicMock()
_mock_redis.publish = MagicMock()
_mock_redis.subscribe = MagicMock()
_mock_redis.lpush = MagicMock(return_value=1)
_mock_redis.llen = MagicMock(return_value=1)
_mock_redis.lrange = MagicMock(return_value=[])

redis_mod = types.ModuleType("common.redis_client")
redis_mod.get_redis = MagicMock(return_value=_mock_redis)
sys.modules["common.redis_client"] = redis_mod

# ── common.rbac ──────────────────────────────────────────────────────────────
def _require_role_dep(role):
    def dep():
        return None
    return dep

rbac_mod = types.ModuleType("common.rbac")
rbac_mod.require_role = _require_role_dep
rbac_mod.get_current_user = MagicMock()
rbac_mod.decode_token = MagicMock()
rbac_mod.create_access_token = MagicMock()
sys.modules["common.rbac"] = rbac_mod

# ── common.config ────────────────────────────────────────────────────────────
config_mod = types.ModuleType("common.config")
config_mod.settings = MagicMock()
sys.modules["common.config"] = config_mod

# ── common.broker_client ─────────────────────────────────────────────────────
sys.modules["common.broker_client"] = types.ModuleType("common.broker_client")

# ── services (top-level package) ─────────────────────────────────────────────
# Ensure the `services` namespace package is recognised so sub-packages resolve.
if "services" not in sys.modules:
    _svc_pkg = types.ModuleType("services")
    _svc_pkg.__path__ = [os.path.join(os.path.dirname(__file__), "..", "services")]
    _svc_pkg.__package__ = "services"
    sys.modules["services"] = _svc_pkg

# ── common (parent package) ──────────────────────────────────────────────────
common_mod = types.ModuleType("common")
common_mod.database = common_db_mod
common_mod.redis_client = redis_mod
common_mod.rbac = rbac_mod
common_mod.config = config_mod
sys.modules["common"] = common_mod
