import os
import datetime
import time
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, Request, BackgroundTasks, HTTPException, Header
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from slowapi.util import get_remote_address

from database import (
    get_db, Booking as DBBooking, Meeting, User, Notification, 
    AvailabilitySlot, DateAvailabilitySignal
)
from api.limiter import limiter
from auth import get_current_user, require_admin
import email_service
import calendar_service
import meeting_booking_service
from services.meeting_service import MeetingService
from api.helpers import (
    IST, to_local, parse_dt_to_ist, meeting_to_dict, 
    create_notification, log_status_change
)
from api.schemas import (
    BookingOut, BookingCreate, MeetingCreate, RescheduleRequest, 
    AvailabilityCreate, ScheduleMeetingRequest
)

router = APIRouter(prefix="", tags=["Meetings & Bookings"])

# ── Legacy Bookings Routes ────────────────────────────────────────────────
@router.get("/api/bookings", response_model=List[BookingOut])
async def get_bookings(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(DBBooking)
    if status:
        q = q.filter(DBBooking.status == status)
    return q.all()

@router.post("/api/bookings", response_model=BookingOut)
async def create_booking_legacy(booking: BookingCreate, db: Session = Depends(get_db)):
    try:
        booking_time = parse_dt_to_ist(booking.time)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format.")
    db_booking = DBBooking(
        client_name=booking.client_name,
        type=booking.type,
        time=booking_time,
        status=booking.status,
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return BookingOut(
        id=db_booking.id,
        client_name=db_booking.client_name,
        type=db_booking.type,
        time=db_booking.time.isoformat(),
        status=db_booking.status,
    )

@router.put("/api/bookings/{booking_id}/status")
async def update_booking_status(booking_id: int, status: str, db: Session = Depends(get_db)):
    db_booking = db.query(DBBooking).filter(DBBooking.id == booking_id).first()
    if not db_booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    db_booking.status = status
    db.commit()
    db.refresh(db_booking)
    return db_booking


# ── Meetings Routes ────────────────────────────────────────────────────────
@router.get("/api/meetings")
async def get_meetings(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Meeting).filter(Meeting.deleted_at == None)
    if current_user.role != "admin":
        q = q.filter(Meeting.client_id == current_user.id)
    if status:
        q = q.filter(Meeting.status == status)
    meetings = q.order_by(Meeting.created_at.desc()).all()
    return [meeting_to_dict(m) for m in meetings]

@router.post("/api/meetings")
async def create_meeting(
    req: MeetingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start = parse_dt_to_ist(req.start_time)
    end = parse_dt_to_ist(req.end_time)

    # Validate all Sisu booking rules via MeetingService (SOLID: SRP)
    MeetingService.validate_meeting_rules(
        db=db,
        client_id=current_user.id,
        title=req.title,
        description=req.description,
        start=start,
        end=end,
        duration_minutes=req.duration_minutes
    )

    meeting = Meeting(
        client_id=current_user.id,
        title=req.title,
        description=req.description,
        reason=req.reason,
        meeting_type=req.meeting_type,
        priority=req.priority,
        start_time=start,
        end_time=end,
        duration_minutes=req.duration_minutes,
        preferred_communication=req.preferred_communication,
        phone=req.phone,
        status="pending",
    )
    db.add(meeting)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.query(Meeting).filter(
            Meeting.client_id == current_user.id,
            Meeting.start_time == start,
            Meeting.deleted_at == None
        ).first()
        return {
            "success": False,
            "message": "Duplicate request detected. This slot is already booked.",
            "booking_id": existing.id if existing else None,
            "duplicate": True
        }
    db.refresh(meeting)

    log_status_change(db, meeting.id, None, "pending", current_user.email)

    local_start = to_local(start)
    meeting_dict = {
        "title": meeting.title,
        "date": local_start.strftime("%B %d, %Y"),
        "time": f"{local_start.strftime('%I:%M %p')} IST",
        "type": meeting.meeting_type,
        "duration": f"{meeting.duration_minutes} mins",
        "priority": meeting.priority,
    }
    try:
        email_service.send_booking_received(current_user.email, current_user.name, meeting_dict)
    except Exception as email_err:
        print(f"[Email Send Error] {email_err}")
    create_notification(
        db, current_user.id, "booking_received",
        "Meeting request submitted",
        f"Your request for '{meeting.title}' has been received and is pending review.",
        meeting.id,
    )

    return meeting_to_dict(meeting)


@router.get("/api/meetings/available-slots")
async def get_available_slots(
    from_time: Optional[str] = None,
    duration: int = 60,
    count: int = 3,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if from_time:
        after = parse_dt_to_ist(from_time)
    else:
        after = datetime.datetime.now(IST).replace(tzinfo=None)

    slots = meeting_booking_service.find_next_available_slots(
        db, after=after, duration_minutes=duration, count=count
    )
    return {"available_slots": slots, "from": after.isoformat(), "duration_minutes": duration}


@router.get("/api/meetings/{meeting_id}")
async def get_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.deleted_at == None).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if current_user.role != "admin" and meeting.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return meeting_to_dict(meeting)


@router.delete("/api/meetings/{meeting_id}")
async def cancel_meeting(
    meeting_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.deleted_at == None).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if current_user.role != "admin" and meeting.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    old_status = meeting.status
    meeting.status = "cancelled"
    db.commit()

    log_status_change(db, meeting.id, old_status, "cancelled", current_user.email)

    if meeting.google_event_id:
        try:
            calendar_service.delete_event(meeting.google_event_id)
        except Exception as e:
            print(f"[Calendar Delete Error] {e}")

    client = db.query(User).filter(User.id == meeting.client_id).first()
    if client:
        meeting_dict = {
            "title": meeting.title,
            "date": meeting.start_time.strftime("%B %d, %Y"),
            "time": f"{meeting.start_time.strftime('%I:%M %p')} IST",
            "type": meeting.meeting_type,
            "duration": f"{meeting.duration_minutes} mins",
        }
        try:
            email_service.send_cancellation(client.email, client.name, meeting_dict)
        except Exception as email_err:
            print(f"[Email Send Error] {email_err}")
        create_notification(db, client.id, "cancelled", "Meeting cancelled", f"Your meeting '{meeting.title}' has been cancelled.", meeting.id)

    return {"message": "Meeting cancelled"}


@router.put("/api/meetings/{meeting_id}/reschedule")
async def client_reschedule_request(
    meeting_id: int,
    req: RescheduleRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.deleted_at == None).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if current_user.role != "admin" and meeting.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    start = parse_dt_to_ist(req.new_start_time)
    end = parse_dt_to_ist(req.new_end_time)

    if start < datetime.datetime.now():
        raise HTTPException(status_code=400, detail="Cannot reschedule to a past date")

    # Use MeetingService to validate slots & conflicts
    MeetingService.validate_meeting_rules(
        db=db,
        client_id=current_user.id,
        title=meeting.title,
        start=start,
        end=end,
        duration_minutes=meeting.duration_minutes,
        meeting_id_to_exclude=meeting.id
    )

    old_status = meeting.status
    old_start = meeting.start_time
    old_end = meeting.end_time

    meeting.start_time = start
    meeting.end_time = end
    meeting.status = "reschedule_requested"
    
    orig_time_str = f"[Reschedule Request] Original: {old_start.strftime('%b %d, %Y at %I:%M %p')} IST"
    reason_str = f"Reason: {req.reason}" if req.reason else "No reason provided."
    resched_note = f"{orig_time_str} · {reason_str}"
    if meeting.notes:
        meeting.notes = f"{resched_note}\n\n{meeting.notes}"
    else:
        meeting.notes = resched_note

    db.commit()

    log_status_change(db, meeting.id, old_status, "reschedule_requested", current_user.email, req.reason)

    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        create_notification(
            db, admin.id, "reschedule_requested",
            "Reschedule Requested",
            f"{current_user.name} has requested to reschedule '{meeting.title}' to {start.strftime('%B %d, %I:%M %p')}.",
            meeting.id
        )

    return meeting_to_dict(meeting)


@router.put("/api/meetings/{meeting_id}/confirm-reschedule")
async def client_confirm_reschedule(
    meeting_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.deleted_at == None).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if current_user.role != "admin" and meeting.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if meeting.status != "reschedule_proposed":
        raise HTTPException(status_code=400, detail="No reschedule proposal exists for this meeting")

    old_status = meeting.status
    meeting.status = "rescheduled"

    meeting_booking_service.mark_slot_as_booked(db, meeting.start_time, meeting.end_time)

    client_email = current_user.email
    client_name = current_user.name
    local_start = to_local(meeting.start_time)

    if meeting.google_event_id:
        try:
            calendar_service.update_event(
                meeting.google_event_id,
                start=meeting.start_time,
                end=meeting.end_time,
            )
        except Exception as cal_err:
            print(f"[Calendar Update Error] {cal_err}")
            
        try:
            new_dict = {
                "title": meeting.title,
                "date": local_start.strftime("%B %d, %Y"),
                "time": f"{local_start.strftime('%I:%M %p')} IST",
                "type": meeting.meeting_type,
                "duration": f"{meeting.duration_minutes} mins",
            }
            old_dict = {
                "title": meeting.title,
                "date": "Previously Scheduled Time",
                "time": "Previous Slot",
                "type": meeting.meeting_type,
                "duration": f"{meeting.duration_minutes} mins",
            }
            email_service.send_meeting_rescheduled(
                client_email, client_name, old_dict, new_dict
            )
        except Exception as email_err:
            print(f"[Email Send Error] {email_err}")
    else:
        try:
            res = meeting_booking_service.handle_approved_meeting_native(meeting, client_name, client_email)
            if res.get("success"):
                meeting.google_event_id = res.get("google_event_id")
                meeting.meet_link = res.get("meet_link")
                db.commit()
                db.refresh(meeting)
            else:
                print(f"[Google Reschedule Sync Error] Direct sync returned failure: {res.get('error')}")
        except Exception as err:
            print(f"[Google Reschedule Sync Error] Direct sync failed: {err}")

    db.commit()
    log_status_change(db, meeting.id, old_status, "rescheduled", current_user.email)

    create_notification(
        db, current_user.id, "rescheduled", "Meeting Reschedule Confirmed! ",
        f"Your meeting '{meeting.title}' has been successfully locked in for {local_start.strftime('%B %d at %I:%M %p')} IST.",
        meeting.id
    )

    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        create_notification(
            db, admin.id, "rescheduled", "Client Accepted Reschedule",
            f"{client_name} has accepted the proposed reschedule for '{meeting.title}' to {local_start.strftime('%B %d at %I:%M %p')} IST.",
            meeting.id
        )

    return meeting_to_dict(meeting)


@router.get("/api/meetings/{meeting_id}/zapier")
async def get_meeting_zapier_payload(
    meeting_id: int,
    x_zapier_secret: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    secret = os.getenv("ZAPIER_SECRET")
    if secret and x_zapier_secret != secret:
        raise HTTPException(status_code=401, detail="Invalid Zapier Secret")

    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    client = db.query(User).filter(User.id == meeting.client_id).first()
    client_name = client.name if client else "Client"
    client_email = client.email if client else ""
    
    return meeting_booking_service.build_zapier_payload(meeting, client_name, client_email)


# ── Notifications Routes ───────────────────────────────────────────────────
@router.get("/api/notifications")
async def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(50).all()
    return [
        {
            "id": n.id,
            "type": n.type,
            "title": n.title,
            "message": n.message,
            "meeting_id": n.meeting_id,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifs
    ]

@router.put("/api/notifications/{notif_id}/read")
async def mark_notification_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notif = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"message": "Marked as read"}

@router.put("/api/notifications/read-all")
async def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"message": "All marked as read"}


# ── Availability Routes ────────────────────────────────────────────────────
@router.get("/api/availability")
async def get_availability(db: Session = Depends(get_db)):
    slots = db.query(AvailabilitySlot).filter(AvailabilitySlot.is_booked == False).all()
    return [
        {
            "id": s.id,
            "start_time": s.start_time.isoformat(),
            "end_time": s.end_time.isoformat(),
            "recurring": s.recurring,
            "day_of_week": s.day_of_week,
        }
        for s in slots
    ]

@router.post("/api/availability")
async def create_availability(
    req: AvailabilityCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    slot = AvailabilitySlot(
        start_time=parse_dt_to_ist(req.start_time),
        end_time=parse_dt_to_ist(req.end_time),
        recurring=req.recurring,
        day_of_week=req.day_of_week,
    )
    db.add(slot)
    db.commit()
    return {"message": "Slot created"}

@router.put("/api/availability/{slot_id}")
async def update_availability(
    slot_id: int,
    req: AvailabilityCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    slot = db.query(AvailabilitySlot).filter(AvailabilitySlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    slot.start_time = parse_dt_to_ist(req.start_time)
    slot.end_time = parse_dt_to_ist(req.end_time)
    slot.recurring = req.recurring
    slot.day_of_week = req.day_of_week
    db.commit()
    return {"message": "Slot updated", "id": slot.id}

@router.delete("/api/availability/{slot_id}")
async def delete_availability(
    slot_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    slot = db.query(AvailabilitySlot).filter(AvailabilitySlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    db.delete(slot)
    db.commit()
    return {"message": "Slot deleted"}

@router.get("/api/availability/free-slots")
async def get_free_slots(date: str, duration: int = 60, db: Session = Depends(get_db)):
    dt_str = date.split('T')[0]
    sig = db.query(DateAvailabilitySignal).filter(DateAvailabilitySignal.date == dt_str).first()
    
    if sig and sig.signal == "red":
        return []

    blocked_slots = []
    if sig and sig.signal == "yellow" and sig.custom_slots:
        for slot_str in sig.custom_slots.split(","):
            if "-" in slot_str:
                try:
                    b_s_str, b_e_str = slot_str.strip().split("-")
                    b_start = datetime.datetime.strptime(b_s_str, "%H:%M").time()
                    b_end = datetime.datetime.strptime(b_e_str, "%H:%M").time()
                    blocked_slots.append((b_start, b_end))
                except Exception:
                    pass

    try:
        dt = datetime.datetime.fromisoformat(date)
        slots = calendar_service.get_free_slots(dt, duration)
    except Exception as e:
        dt = datetime.datetime.fromisoformat(date)
        slots = []
        c = dt.replace(hour=11, minute=0, second=0, microsecond=0)
        end_time = dt.replace(hour=19, minute=0, second=0, microsecond=0)
        while c + datetime.timedelta(minutes=duration) <= end_time:
            se = c + datetime.timedelta(minutes=duration)
            slots.append({
                "start": c.strftime("%H:%M"),
                "end": se.strftime("%H:%M"),
                "label": f"{c.strftime('%I:%M %p')} - {se.strftime('%I:%M %p')} IST",
            })
            c += datetime.timedelta(minutes=30)
            
    day_start = dt.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + datetime.timedelta(days=1)
    
    local_meetings = db.query(Meeting).filter(
        Meeting.start_time >= day_start,
        Meeting.start_time < day_end,
        Meeting.status.in_(["pending", "approved", "rescheduled", "reschedule_proposed", "reschedule_requested"]),
        Meeting.deleted_at == None
    ).all()

    available_slots = []
    for slot in slots:
        try:
            slot_start_time = datetime.datetime.strptime(slot["start"], "%H:%M").time()
            slot_end_time = datetime.datetime.strptime(slot["end"], "%H:%M").time()
            
            blocked = False
            for b_start, b_end in blocked_slots:
                if slot_start_time < b_end and slot_end_time > b_start:
                    blocked = True
                    break
            if blocked:
                continue
            
            slot_start_dt = datetime.datetime.combine(dt.date(), slot_start_time).replace(tzinfo=IST)
            slot_end_dt = datetime.datetime.combine(dt.date(), slot_end_time).replace(tzinfo=IST)
                
            conflict = False
            for m in local_meetings:
                m_start = to_local(m.start_time)
                m_end = to_local(m.end_time)
                
                if slot_start_dt < m_end and slot_end_dt > m_start:
                    conflict = True
                    break
                    
            if not conflict:
                available_slots.append(slot)
        except Exception as e:
            available_slots.append(slot)
            
    return available_slots

@router.get("/api/availability/calendar-signals")
async def get_calendar_signals(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(DateAvailabilitySignal)
    if month is not None and year is not None:
        start_date = datetime.date(year, month, 1)
        end_date = datetime.date(year, month % 12 + 1, 1) - datetime.timedelta(days=1)
        
        query = query.filter(
            DateAvailabilitySignal.date >= start_date.isoformat(),
            DateAvailabilitySignal.date <= end_date.isoformat()
        )
    
    signals = query.all()
    return {
        s.date: {
            "signal": s.signal,
            "custom_slots": s.custom_slots.split(",") if s.custom_slots else []
        }
        for s in signals
    }


# ── Dashboard Stats Route ──────────────────────────────────────────────────
_stats_cache = {}

@router.get("/api/dashboard/stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cache_key = f"stats_{current_user.id}_{current_user.role}"
    now = time.time()
    
    if cache_key in _stats_cache:
        cached_data, timestamp = _stats_cache[cache_key]
        if now - timestamp < 60:
            return cached_data

    if current_user.role == "admin":
        total = db.query(Meeting).filter(Meeting.deleted_at == None).count()
        pending = db.query(Meeting).filter(Meeting.status == "pending", Meeting.deleted_at == None).count()
        approved = db.query(Meeting).filter(Meeting.status == "approved", Meeting.deleted_at == None).count()
        rejected = db.query(Meeting).filter(Meeting.status == "rejected", Meeting.deleted_at == None).count()
        cancelled = db.query(Meeting).filter(Meeting.status == "cancelled", Meeting.deleted_at == None).count()
        approval_rate = round((approved / total * 100) if total > 0 else 0, 1)
        res = {
            "total_meetings": total,
            "pending_requests": pending,
            "approved_meetings": approved,
            "rejected_meetings": rejected,
            "cancelled_meetings": cancelled,
            "approval_rate": f"{approval_rate}%",
            "efficiency": f"{100 - round((cancelled / total * 100) if total > 0 else 0, 1)}%",
            "total_bookings": total,
        }
    else:
        total = db.query(Meeting).filter(Meeting.client_id == current_user.id, Meeting.deleted_at == None).count()
        pending = db.query(Meeting).filter(Meeting.client_id == current_user.id, Meeting.status == "pending", Meeting.deleted_at == None).count()
        approved = db.query(Meeting).filter(Meeting.client_id == current_user.id, Meeting.status == "approved", Meeting.deleted_at == None).count()
        unread = db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).count()
        res = {
            "total_meetings": total,
            "pending_requests": pending,
            "approved_meetings": approved,
            "unread_notifications": unread,
            "total_bookings": total,
        }
    
    _stats_cache[cache_key] = (res, now)
    return res


# ── Webhook Scheduling Route ───────────────────────────────────────────────
@router.post("/api/meetings/schedule")
@limiter.limit("1/5seconds")
async def schedule_meeting(
    request: Request,
    payload: ScheduleMeetingRequest
):
    if not payload.title or not payload.description or not payload.start_time or not payload.end_time or not payload.attendee_email:
        return JSONResponse(status_code=400, content={"success": False, "error": "Missing required fields", "code": "VALIDATION_ERROR"})
        
    if not re.match(r"[^@]+@[^@]+\.[^@]+", payload.attendee_email):
        return JSONResponse(status_code=400, content={"success": False, "error": "Invalid email format", "code": "VALIDATION_ERROR"})
        
    try:
        start_dt = datetime.datetime.fromisoformat(payload.start_time.replace("Z", "+00:00"))
        end_dt = datetime.datetime.fromisoformat(payload.end_time.replace("Z", "+00:00"))
    except ValueError:
        return JSONResponse(status_code=400, content={"success": False, "error": "Invalid ISO 8601 timestamp format", "code": "VALIDATION_ERROR"})
        
    if end_dt <= start_dt:
        return JSONResponse(status_code=400, content={"success": False, "error": "end_time must be after start_time", "code": "VALIDATION_ERROR"})
        
    import google_integration
    attendee_name = payload.attendee_name or payload.attendee_email.split("@")[0]
    start_ist = start_dt.astimezone(IST)
    end_ist = end_dt.astimezone(IST)
    
    start_iso = start_ist.strftime("%Y-%m-%dT%H:%M:%S+05:30")
    end_iso = end_ist.strftime("%Y-%m-%dT%H:%M:%S+05:30")
    
    try:
        cal_resp = google_integration.create_calendar_event(
            title=payload.title,
            description=payload.description or "",
            start_iso=start_iso,
            end_iso=end_iso,
            attendee_email=payload.attendee_email,
            attendee_name=attendee_name
        )
        if not cal_resp.get("success"):
            return JSONResponse(status_code=500, content={"success": False, "error": cal_resp.get("error"), "code": "CALENDAR_CREATION_FAILED"})
            
        mail_resp = google_integration.send_gmail_confirmation(
            title=payload.title,
            description=payload.description or "",
            attendee_email=payload.attendee_email,
            attendee_name=attendee_name,
            meet_link=cal_resp.get("meet_link") or "",
            calendar_link=cal_resp.get("calendar_link") or ""
        )
        if not mail_resp.get("success"):
            print(f"[schedule_meeting] Failed to send Gmail confirmation: {mail_resp.get('error')}")
            
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e), "code": "SYNC_FAILED"})
        
    return {
        "success": True,
        "message": "Meeting scheduled. Calendar invite and email sent to attendee.",
        "scheduled_for": start_dt.isoformat()
    }
