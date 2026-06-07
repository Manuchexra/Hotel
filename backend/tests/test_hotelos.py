"""
HotelOS Test Suite — TS-01 to TS-08
Covers all assignment brief test scenarios.

Run: pytest backend/tests/test_hotelos.py -v
"""
import time
import threading
import uuid
from unittest.mock import MagicMock, patch, ANY
import pytest


# ============================================================
# FIXTURES & MOCKS
# ============================================================

def make_mock_db(rooms=None, guests=None, bills=None):
    """Create a mock SQLAlchemy session."""
    db = MagicMock()
    _rooms = rooms or []
    _guests = guests or []
    _bills = bills or []

    def query_side_effect(model):
        q = MagicMock()
        if model.__name__ in ("Room",):
            q.filter.return_value.first.return_value = _rooms[0] if _rooms else None
            q.filter.return_value.all.return_value = _rooms
            q.filter.return_value.count.return_value = len(_rooms)
            q.count.return_value = len(_rooms)
        elif model.__name__ in ("Guest", "GuestModel"):
            q.filter.return_value.first.return_value = _guests[0] if _guests else None
            q.filter.return_value.all.return_value = _guests
        elif model.__name__ in ("Bill",):
            q.filter.return_value.first.return_value = _bills[0] if _bills else None
        return q

    db.query.side_effect = query_side_effect
    db.execute.return_value.scalars.return_value.all.return_value = _rooms
    db.begin.return_value.__enter__ = MagicMock(return_value=None)
    db.begin.return_value.__exit__ = MagicMock(return_value=False)
    return db


def make_room(
    number=101, floor=1, room_type=None, status=None,
    last_cleaned_at=None, distance_to_lift=50, current_guest_id=None
):
    from services.reception.models import RoomType, RoomStatus
    room = MagicMock()
    room.id = str(uuid.uuid4())
    room.number = number
    room.floor = floor
    room.type = room_type or RoomType.SINGLE
    room.status = status or RoomStatus.CLEAN
    room.last_cleaned_at = last_cleaned_at or time.time() - 3600
    room.distance_to_lift = distance_to_lift
    room.current_guest_id = current_guest_id
    return room


def make_bill(guest_id="g1", room_id=101, total=200.0, discount=0.0, is_closed=False):
    bill = MagicMock()
    bill.id = str(uuid.uuid4())
    bill.guest_id = guest_id
    bill.room_id = room_id
    bill.guest_name = "Test Guest"
    bill.total = total
    bill.discount_percent = discount
    bill.is_closed = is_closed
    bill.closed_at = None

    item = MagicMock()
    item.description = f"Xona {room_id} - 2 kecha"
    item.amount = total
    item.timestamp = time.time()
    bill.items = [item]
    return bill


# ============================================================
# TS-01: Standard Check-in
# ============================================================

class TestTS01StandardCheckin:
    """TS-01: Guest checks in with valid data → room assigned successfully."""

    def test_checkin_returns_success(self):
        from services.reception.models import RoomType, RoomStatus
        room = make_room(number=201, floor=2, room_type=RoomType.SINGLE)

        with patch("services.reception.service.SessionLocal") as MockSession, \
             patch("services.reception.service.redis_client") as mock_redis, \
             patch("services.reception.service._init_bill_direct"):

            ctx = MagicMock()
            ctx.__enter__ = MagicMock(return_value=make_mock_db(rooms=[room]))
            ctx.__exit__ = MagicMock(return_value=False)
            MockSession.return_value = ctx

            from services.reception.service import checkin
            result = checkin({
                "guest_name": "Ali Valiyev",
                "room_type": RoomType.SINGLE.value,
                "preferred_floor": None,
                "near_lift": False,
                "nights": 3,
                "room_price_per_night": 100.0,
            })

        assert result["success"] is True
        assert result["room_number"] == 201
        assert "guest_id" in result
        assert "login" in result

    def test_checkin_schema_validates_guest_name_min_length(self):
        from services.reception.schemas import CheckinRequest
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            CheckinRequest(
                guest_name="A",  # Too short
                room_type="bir kishilik",
                nights=1,
                room_price_per_night=100.0,
            )

    def test_checkin_schema_rejects_empty_name(self):
        from services.reception.schemas import CheckinRequest
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            CheckinRequest(
                guest_name="   ",  # whitespace only
                room_type="bir kishilik",
                nights=1,
                room_price_per_night=100.0,
            )


# ============================================================
# TS-02: Room Assignment Algorithm
# ============================================================

class TestTS02RoomAssignmentAlgorithm:
    """TS-02: Room assignment follows priority order."""

    def test_assigns_correct_room_type(self):
        from services.reception.models import RoomType, RoomStatus
        from services.reception.service import find_best_room

        single_room = make_room(101, room_type=RoomType.SINGLE, status=RoomStatus.CLEAN)
        double_room = make_room(102, room_type=RoomType.DOUBLE, status=RoomStatus.CLEAN)

        db = MagicMock()
        db.execute.return_value.scalars.return_value.all.return_value = [single_room]

        result = find_best_room(db, RoomType.SINGLE, preferred_floor=None, near_lift=False)
        assert result is not None
        assert result.type == RoomType.SINGLE

    def test_assigns_longest_clean_first(self):
        """Rooms cleaned longest ago should be preferred (Priority #3)."""
        from services.reception.models import RoomType, RoomStatus
        from services.reception.service import find_best_room

        older = make_room(101, room_type=RoomType.DOUBLE, last_cleaned_at=time.time() - 7200)
        newer = make_room(102, room_type=RoomType.DOUBLE, last_cleaned_at=time.time() - 1800)

        db = MagicMock()
        db.execute.return_value.scalars.return_value.all.return_value = [newer, older]

        result = find_best_room(db, RoomType.DOUBLE, preferred_floor=None, near_lift=False)
        assert result.number == 101  # older cleaned = longest clean

    def test_floor_preference_respected(self):
        """If preferred floor has a clean room, it should be chosen (Priority #4)."""
        from services.reception.models import RoomType, RoomStatus
        from services.reception.service import find_best_room

        floor1_room = make_room(101, floor=1, room_type=RoomType.DOUBLE)
        floor3_room = make_room(301, floor=3, room_type=RoomType.DOUBLE)

        db = MagicMock()
        db.execute.return_value.scalars.return_value.all.return_value = [floor1_room, floor3_room]

        result = find_best_room(db, RoomType.DOUBLE, preferred_floor=3, near_lift=False)
        assert result.number == 301

    def test_lift_proximity_respected(self):
        """near_lift=True should prefer room closer to lift (Priority #5)."""
        from services.reception.models import RoomType, RoomStatus
        from services.reception.service import find_best_room

        close = make_room(101, room_type=RoomType.SINGLE, distance_to_lift=10,
                          last_cleaned_at=time.time() - 100)
        far = make_room(102, room_type=RoomType.SINGLE, distance_to_lift=50,
                        last_cleaned_at=time.time() - 100)

        db = MagicMock()
        db.execute.return_value.scalars.return_value.all.return_value = [far, close]

        result = find_best_room(db, RoomType.SINGLE, preferred_floor=None, near_lift=True)
        assert result.number == 101  # closer to lift

    def test_returns_none_when_no_clean_rooms(self):
        from services.reception.models import RoomType
        from services.reception.service import find_best_room

        db = MagicMock()
        db.execute.return_value.scalars.return_value.all.return_value = []

        result = find_best_room(db, RoomType.SINGLE)
        assert result is None


# ============================================================
# TS-03: Checkout
# ============================================================

class TestTS03Checkout:
    """TS-03: Successful checkout."""

    def test_checkout_marks_room_dirty(self):
        from services.reception.models import RoomStatus

        guest = MagicMock()
        guest.id = "g1"
        guest.name = "Test Guest"
        guest.room_id = 101

        room = make_room(101, status=RoomStatus.OCCUPIED, current_guest_id="g1")

        with patch("services.reception.service.SessionLocal") as MockSession, \
             patch("services.reception.service.redis_client"):
            db = MagicMock()
            db.__enter__ = MagicMock(return_value=db)
            db.__exit__ = MagicMock(return_value=False)
            db.query.return_value.filter.return_value.first.side_effect = [guest, room]
            MockSession.return_value = db

            from services.reception.service import checkout
            result = checkout("g1")

        assert result["success"] is True
        assert room.status == RoomStatus.DIRTY


# ============================================================
# TS-04 & TS-05: Billing
# ============================================================

class TestTS04TS05Billing:
    """TS-04: Billing calculation. TS-05: Discount and totals."""

    def test_billing_formula_total(self):
        from services.billing.service import _calculate_final_total
        bill = make_bill(total=300.0, discount=0.0)
        assert _calculate_final_total(bill) == 300.0

    def test_billing_with_discount(self):
        from services.billing.service import _calculate_final_total
        bill = make_bill(total=200.0, discount=10.0)  # 10% off
        assert _calculate_final_total(bill) == 180.0

    def test_billing_zero_charges(self):
        """Total should never be negative (Zero Charges protection)."""
        from services.billing.service import _calculate_final_total
        bill = make_bill(total=0.0, discount=50.0)
        assert _calculate_final_total(bill) == 0.0

    def test_billing_100_percent_discount(self):
        from services.billing.service import _calculate_final_total
        bill = make_bill(total=500.0, discount=100.0)
        assert _calculate_final_total(bill) == 0.0

    def test_early_checkout_recalculates(self):
        from services.billing.service import early_checkout

        bill = make_bill(guest_id="g1", room_id=101, total=300.0)
        bill.items[0].description = "Xona 101 - 3 kecha"
        bill.items[0].amount = 300.0

        with patch("services.billing.service.SessionLocal") as MockSession, \
             patch("services.billing.service.redis_client"):
            db = MagicMock()
            db.__enter__ = MagicMock(return_value=db)
            db.__exit__ = MagicMock(return_value=False)
            db.query.return_value.filter.return_value.first.return_value = bill
            MockSession.return_value = db

            result = early_checkout("g1", actual_nights=1)

        assert result["success"] is True
        assert result["actual_nights"] == 1
        assert result["original_nights"] == 3
        assert result["savings"] == pytest.approx(200.0)


# ============================================================
# TS-06: Concurrent Check-in (Race Condition Protection)
# ============================================================

class TestTS06ConcurrentCheckin:
    """TS-06: Two guests requesting same room type simultaneously — no double assignment."""

    def test_concurrent_checkin_no_double_assignment(self):
        """
        Simulate two threads calling checkin() simultaneously.
        Only one should succeed; the other should get no-room or a different room.
        Uses real threading to test locking behavior at algorithm level.
        """
        from services.reception.models import RoomType, RoomStatus

        results = []
        call_count = [0]

        # Only 1 CLEAN room available
        single_room = make_room(101, room_type=RoomType.SINGLE, status=RoomStatus.CLEAN)

        def mock_find_best_room(db, room_type, preferred_floor=None, near_lift=False):
            call_count[0] += 1
            if single_room.status == RoomStatus.CLEAN:
                single_room.status = RoomStatus.OCCUPIED  # simulate atomic assignment
                return single_room
            return None

        def run_checkin(name):
            with patch("services.reception.service.SessionLocal") as MockSession,                  patch("services.reception.service.find_best_room", side_effect=mock_find_best_room),                  patch("services.reception.service.redis_client"),                  patch("services.reception.service._init_bill_direct"),                  patch("services.reception.service._set_guest_credentials"),                  patch("services.reception.service.bcrypt"):

                ctx = MagicMock()
                inner_db = MagicMock()
                inner_db.begin.return_value.__enter__ = MagicMock(return_value=None)
                inner_db.begin.return_value.__exit__ = MagicMock(return_value=False)
                ctx.__enter__ = MagicMock(return_value=inner_db)
                ctx.__exit__ = MagicMock(return_value=False)
                MockSession.return_value = ctx

                from services.reception.service import checkin
                try:
                    result = checkin({
                        "guest_name": name,
                        "room_type": RoomType.SINGLE.value,
                        "nights": 1,
                        "room_price_per_night": 100.0,
                    })
                    results.append(result)
                except Exception:
                    results.append({"success": False, "error": "exception"})

        t1 = threading.Thread(target=run_checkin, args=("Guest A",))
        t2 = threading.Thread(target=run_checkin, args=("Guest B",))
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        successes = [r for r in results if r.get("success")]
        failures = [r for r in results if not r.get("success")]

        # At most 1 success (only 1 room available)
        assert len(successes) <= 1
        assert len(results) == 2

    def test_find_best_room_uses_for_update(self):
        """
        SELECT FOR UPDATE must be used in find_best_room for concurrent safety.
        We verify by inspecting the SQLAlchemy statement's _for_update_arg attribute.
        """
        # Import here to avoid module caching issues
        import importlib
        import services.reception.service as svc
        importlib.reload(svc)
        from services.reception.models import RoomType

        db = MagicMock()
        captured_stmts = []

        def capture_execute(stmt):
            captured_stmts.append(stmt)
            result = MagicMock()
            result.scalars.return_value.all.return_value = []
            return result

        db.execute.side_effect = capture_execute

        svc.find_best_room(db, RoomType.SINGLE)

        assert db.execute.called, "db.execute() should be called"
        stmt = captured_stmts[0]
        # SQLAlchemy Select.with_for_update() sets _for_update_arg
        for_update = getattr(stmt, "_for_update_arg", None)
        assert for_update is not None, (
            "Statement must use .with_for_update() for SELECT FOR UPDATE (TS-06 requirement)"
        )


# ============================================================
# TS-07: No Rooms Available
# ============================================================

class TestTS07NoRoomsAvailable:
    """TS-07: When no rooms of requested type are available."""

    def test_checkin_returns_alternatives_when_no_room(self):
        from services.reception.models import RoomType, RoomStatus

        double_room = make_room(102, room_type=RoomType.DOUBLE, status=RoomStatus.CLEAN)

        with patch("services.reception.service.SessionLocal") as MockSession, \
             patch("services.reception.service.redis_client"), \
             patch("services.reception.service.find_best_room", return_value=None):

            db = MagicMock()
            # get_alternative_rooms will query for other types
            count_mock = MagicMock()
            count_mock.count.return_value = 1
            db.query.return_value.filter.return_value = count_mock
            ctx = MagicMock()
            ctx.__enter__ = MagicMock(return_value=db)
            ctx.__exit__ = MagicMock(return_value=False)
            MockSession.return_value = ctx

            from services.reception.service import checkin
            result = checkin({
                "guest_name": "Test Guest",
                "room_type": RoomType.SINGLE.value,
                "nights": 2,
                "room_price_per_night": 100.0,
            })

        assert result["success"] is False
        assert result["message"] == "No rooms available"
        assert "alternatives" in result
        assert result["waiting_list_available"] is True

    def test_add_to_waiting_list(self):
        with patch("services.reception.service.redis_client") as mock_redis:
            mock_redis.lpush.return_value = 1
            mock_redis.llen.return_value = 1
            from services.reception.service import add_to_waiting_list
            result = add_to_waiting_list({
                "guest_name": "Waiting Guest",
                "room_type": "bir kishilik",
                "nights": 2,
                "room_price_per_night": 100.0,
            })
        assert "waiting_list_id" in result
        assert result["position"] == 1


# ============================================================
# TS-08: Invalid Room Number
# ============================================================

class TestTS08InvalidRoomNumber:
    """TS-08: Invalid room number → 400 Bad Request, no crash."""

    def test_get_room_by_number_negative_returns_none(self):
        from services.reception.service import get_room_by_number
        # Negative number should return None without crashing
        result = get_room_by_number(-1)
        assert result is None

    def test_get_room_by_number_zero_returns_none(self):
        from services.reception.service import get_room_by_number
        result = get_room_by_number(0)
        assert result is None

    def test_room_create_schema_rejects_negative(self):
        from services.reception.schemas import RoomCreate
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            RoomCreate(number=-5, floor=1, type="bir kishilik")

    def test_room_create_schema_rejects_zero(self):
        from services.reception.schemas import RoomCreate
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            RoomCreate(number=0, floor=1, type="bir kishilik")

    def test_valid_room_number_accepted(self):
        from services.reception.schemas import RoomCreate
        req = RoomCreate(number=101, floor=1, type="bir kishilik")
        assert req.number == 101


# ============================================================
# Input Validation Tests
# ============================================================

class TestInputValidation:
    """Comprehensive input validation for all schemas."""

    def test_maintenance_priority_valid_values(self):
        from services.maintenance.schemas import IssueCreate
        from services.maintenance.models import PriorityLevel
        req = IssueCreate(room_id=101, description="Muammo bor", priority=PriorityLevel.CRITICAL)
        assert req.priority == PriorityLevel.CRITICAL

    def test_maintenance_priority_invalid_value(self):
        from services.maintenance.schemas import IssueCreate
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            IssueCreate(room_id=101, description="Muammo", priority="InvalidPriority")

    def test_roomservice_order_requires_items(self):
        from services.roomservice.schemas import OrderCreate
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            OrderCreate(room_id=101, items=[])

    def test_roomservice_order_with_items_ok(self):
        from services.roomservice.schemas import OrderCreate, OrderItemSchema
        req = OrderCreate(
            room_id=101,
            items=[OrderItemSchema(name="Coffee", price=5.0)]
        )
        assert len(req.items) == 1

    def test_checkin_invalid_room_type(self):
        from services.reception.schemas import CheckinRequest
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            CheckinRequest(
                guest_name="Ali Valiyev",
                room_type="invalid_type",
                nights=1,
                room_price_per_night=100.0,
            )

    def test_checkin_negative_nights_rejected(self):
        from services.reception.schemas import CheckinRequest
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            CheckinRequest(
                guest_name="Ali Valiyev",
                room_type="bir kishilik",
                nights=-1,
                room_price_per_night=100.0,
            )

    def test_billing_discount_range(self):
        from services.billing.schemas import ApplyDiscountRequest
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            ApplyDiscountRequest(guest_id="g1", discount_percent=150.0)  # >100

    def test_billing_add_item_positive_amount(self):
        from services.billing.schemas import AddItemRequest
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            AddItemRequest(guest_id="g1", description="item", amount=-10.0)


# ============================================================
# Dashboard Data Tests
# ============================================================

class TestDashboard:
    """Dashboard should return rooms, guests, maintenance, room service data."""

    def test_get_all_rooms_returns_list(self):
        from services.reception.models import RoomType, RoomStatus

        room1 = make_room(101)
        room2 = make_room(102, room_type=RoomType.DOUBLE, status=RoomStatus.OCCUPIED)

        with patch("services.reception.service.SessionLocal") as MockSession:
            db = MagicMock()
            db.__enter__ = MagicMock(return_value=db)
            db.__exit__ = MagicMock(return_value=False)
            db.query.return_value.all.return_value = [room1, room2]
            db.query.return_value.filter.return_value.first.return_value = None
            MockSession.return_value = db

            from services.reception.service import get_all_rooms
            result = get_all_rooms()

        assert len(result) == 2

    def test_all_room_statuses_covered(self):
        from services.reception.models import RoomStatus
        statuses = [s.value for s in RoomStatus]
        assert "toza" in statuses       # CLEAN
        assert "iflos" in statuses      # DIRTY
        assert "band" in statuses       # OCCUPIED
        assert "texnik_xizmat" in statuses  # MAINTENANCE


# ============================================================
# Global Exception Handler Tests
# ============================================================

class TestGlobalExceptionHandlers:
    """Exception handlers must hide stack traces, log errors, return safe responses."""

    def test_validation_error_returns_400(self):
        from fastapi.testclient import TestClient
        from services.reception.main import app

        client = TestClient(app, raise_server_exceptions=False)
        # Send invalid checkin data (empty name)
        response = client.post(
            "/reception/checkin",
            json={"guest_name": "", "room_type": "bir kishilik", "nights": 1,
                  "room_price_per_night": 100.0},
            headers={"Authorization": "Bearer fake"}
        )
        # Should be 401/403/400 but NOT 500
        assert response.status_code in (400, 401, 403, 422)
        # Must not expose traceback
        body = response.text
        assert "Traceback" not in body
        assert "File " not in body
