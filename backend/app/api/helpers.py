import datetime
from sqlalchemy.orm import Session
from app.models.meeting import Meeting, MeetingStatusLog
from app.models.notification import Notification

IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

def to_local(dt: datetime.datetime) -> datetime.datetime:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=IST)
    return dt.astimezone(IST)

def parse_dt_to_ist(s: str) -> datetime.datetime:
    try:
        if s.endswith('Z'):
            s = s.replace('Z', '+00:00')
        dt = datetime.datetime.fromisoformat(s)
        if dt.tzinfo is not None:
            return dt.astimezone(IST).replace(tzinfo=None)
        return dt
    except Exception:
        try:
            return datetime.datetime.strptime(s[:19], "%Y-%m-%dT%H:%M:%S")
        except:
            return datetime.datetime.now()

def meeting_to_dict(m: Meeting) -> dict:
    local_start = to_local(m.start_time)
    local_end = to_local(m.end_time)
    client_name = m.client.name if m.client else "Unknown"
    company_name = m.client.company if m.client and m.client.company else "Unknown Company"
    return {
        "id": m.id,
        "client_id": m.client_id,
        "client_name": client_name,
        "client_email": m.client.email if m.client else "",
        "client_is_priority": getattr(m.client, "is_priority", False) if m.client else False,
        "title": m.title,
        "description": m.description,
        "reason": m.reason,
        "meeting_type": m.meeting_type,
        "status": m.status,
        "priority": m.priority,
        "start_time": local_start.isoformat() if local_start else None,
        "end_time": local_end.isoformat() if local_end else None,
        "display_date": local_start.strftime("%b %d, %Y") if local_start else "N/A",
        "display_time": f"{local_start.strftime('%I:%M %p')} IST" if local_start else "N/A",
        "duration_minutes": m.duration_minutes,
        "google_event_id": m.google_event_id,
        "meet_link": m.meet_link,
        "notes": m.notes,
        "admin_notes": m.admin_notes,
        "preferred_communication": m.preferred_communication,
        "phone": m.phone,
        "otter_notes": m.otter_notes,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
    }

def create_notification(db: Session, user_id: int, ntype: str, title: str, message: str, meeting_id: int = None):
    notif = Notification(
        user_id=user_id,
        type=ntype,
        title=title,
        message=message,
        meeting_id=meeting_id,
    )
    db.add(notif)
    db.commit()

def log_status_change(db: Session, meeting_id: int, old: str, new: str, changed_by: str, note: str = None):
    log = MeetingStatusLog(
        meeting_id=meeting_id,
        old_status=old,
        new_status=new,
        changed_by=changed_by,
        note=note,
    )
    db.add(log)
    db.commit()
