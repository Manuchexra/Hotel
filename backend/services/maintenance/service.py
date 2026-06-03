import time
from typing import List, Optional
from .models import Issue, PriorityLevel, IssueStatus, PRIORITY_VALUES
from common.database import SessionLocal
from common.redis_client import get_redis

redis_client = get_redis()

priority_limits_hours: dict = {
    PriorityLevel.CRITICAL: 1,
    PriorityLevel.HIGH: 4,
    PriorityLevel.NORMAL: 24,
    PriorityLevel.LOW: 72,
}

PRIORITY_ESCALATION = {
    PriorityLevel.LOW: PriorityLevel.NORMAL,
    PriorityLevel.NORMAL: PriorityLevel.HIGH,
    PriorityLevel.HIGH: PriorityLevel.CRITICAL,
    PriorityLevel.CRITICAL: PriorityLevel.CRITICAL,
}

LIMIT_KEY_TO_LEVEL = {
    "kritik": PriorityLevel.CRITICAL,
    "yuqori": PriorityLevel.HIGH,
    "normal": PriorityLevel.NORMAL,
    "past": PriorityLevel.LOW,
}

LEVEL_TO_LIMIT_KEY = {v: k for k, v in LIMIT_KEY_TO_LEVEL.items()}


def get_priority_limits() -> dict:
    return {LEVEL_TO_LIMIT_KEY[level]: hours for level, hours in priority_limits_hours.items()}


def set_priority_limits(limits: dict) -> dict:
    for key, hours in limits.items():
        level = LIMIT_KEY_TO_LEVEL.get(key)
        if level is not None and hours > 0:
            priority_limits_hours[level] = float(hours)
    apply_priority_escalation()
    return get_priority_limits()


def apply_priority_escalation():
    now = time.time()
    with SessionLocal() as db:
        issues = db.query(Issue).filter(Issue.status == IssueStatus.NEW).all()
        for issue in issues:
            limit_hours = priority_limits_hours.get(issue.priority, 24)
            age_hours = (now - issue.created_at) / 3600
            if age_hours <= limit_hours:
                continue
            new_priority = PRIORITY_ESCALATION.get(issue.priority, issue.priority)
            if new_priority == issue.priority:
                continue
            old_priority = issue.priority
            issue.priority = new_priority
            db.commit()
            redis_client.publish("issue.priority.escalated", {
                "issue_id": issue.id,
                "room_id": issue.room_id,
                "old_priority": old_priority.value,
                "new_priority": new_priority.value,
            })


def create_issue(room_id: int, description: str, priority: PriorityLevel) -> dict:
    issue = Issue(
        room_id=room_id,
        description=description,
        priority=priority,
        status=IssueStatus.NEW,
    )
    with SessionLocal() as db:
        db.add(issue)
        db.commit()
        db.refresh(issue)
    redis_client.publish("issue.created", {
        "issue_id": issue.id,
        "room_id": room_id,
        "priority": priority.value,
        "description": description
    })
    return {"success": True, "issue_id": issue.id}


def get_next_issue() -> Optional[Issue]:
    apply_priority_escalation()
    with SessionLocal() as db:
        issues = db.query(Issue).filter(Issue.status == IssueStatus.NEW).all()
        issues.sort(key=lambda i: (-PRIORITY_VALUES[i.priority], i.created_at))
        return issues[0] if issues else None


def assign_issue(issue_id: str, technician_name: str) -> dict:
    with SessionLocal() as db:
        issue = db.query(Issue).filter(Issue.id == issue_id).first()
        if not issue:
            return {"success": False, "message": "Muammo topilmadi"}
        if issue.status != IssueStatus.NEW:
            return {"success": False, "message": f"Muammo allaqachon {issue.status.value} holatida"}
        issue.status = IssueStatus.ASSIGNED
        issue.assigned_to = technician_name
        room_id = issue.room_id
        db.commit()
    redis_client.publish("issue.assigned", {
        "issue_id": issue_id,
        "room_id": room_id,
        "technician": technician_name
    })
    return {"success": True, "issue_id": issue_id, "assigned_to": technician_name}


def resolve_issue(issue_id: str) -> dict:
    with SessionLocal() as db:
        issue = db.query(Issue).filter(Issue.id == issue_id).first()
        if not issue:
            return {"success": False, "message": "Muammo topilmadi"}
        if issue.status == IssueStatus.RESOLVED:
            return {"success": False, "message": "Muammo allaqachon hal qilingan"}
        issue.status = IssueStatus.RESOLVED
        issue.resolved_at = time.time()
        room_id = issue.room_id
        db.commit()
    redis_client.publish("issue.resolved", {
        "issue_id": issue_id,
        "room_id": room_id
    })
    redis_client.publish("room.status.update", {"room_id": room_id, "status": "toza"})
    return {"success": True, "issue_id": issue_id}


def get_all_issues() -> List[dict]:
    apply_priority_escalation()
    with SessionLocal() as db:
        issues = db.query(Issue).all()
        return [
            {
                "id": i.id,
                "room_id": i.room_id,
                "description": i.description,
                "priority": i.priority.value,
                "status": i.status.value,
                "assigned_to": i.assigned_to,
                "created_at": i.created_at,
                "resolved_at": i.resolved_at,
            }
            for i in issues
        ]


def get_performance_stats(period: str = "all") -> List[dict]:
    now = time.time()
    period_seconds = {
        "week": 7 * 24 * 3600,
        "month": 30 * 24 * 3600,
    }
    with SessionLocal() as db:
        query = db.query(Issue)
        if period in period_seconds:
            cutoff = now - period_seconds[period]
            query = query.filter(Issue.created_at >= cutoff)
        issues = query.all()

    tech_map: dict = {}
    for issue in issues:
        tech = issue.assigned_to or "Tayinlanmagan"
        if tech not in tech_map:
            tech_map[tech] = {"assigned": 0, "resolved": 0, "total_time": 0.0}
        if issue.status in (IssueStatus.ASSIGNED, IssueStatus.RESOLVED):
            tech_map[tech]["assigned"] += 1
        if issue.status == IssueStatus.RESOLVED and issue.resolved_at:
            tech_map[tech]["resolved"] += 1
            tech_map[tech]["total_time"] += (issue.resolved_at - issue.created_at) / 3600

    return [
        {
            "technician": name,
            "assigned": stats["assigned"],
            "resolved": stats["resolved"],
            "avg_time": round(stats["total_time"] / stats["resolved"], 1) if stats["resolved"] else 0,
        }
        for name, stats in tech_map.items()
    ]


def get_priority_queue() -> List[dict]:
    apply_priority_escalation()
    with SessionLocal() as db:
        issues = db.query(Issue).filter(Issue.status == IssueStatus.NEW).all()
        issues.sort(key=lambda i: (-PRIORITY_VALUES[i.priority], i.created_at))
        return [
            {
                "id": i.id,
                "room_id": i.room_id,
                "description": i.description,
                "priority": i.priority.value,
                "created_at": i.created_at
            }
            for i in issues
        ]
