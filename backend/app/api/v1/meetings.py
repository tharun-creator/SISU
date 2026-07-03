import datetime
import time
from typing import Optional
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, Header, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from slowapi.util import get_remote_address

from app.database import get_db
from app.models.meeting import Meeting, Booking, AvailabilitySlot, DateAvailabilitySignal
from app.models.notification import Notification
from app.models.user import User
from app.dependencies import get_current_user, require_admin, require_verified_user
from app.services.meeting_service import MeetingService
from app.services.calendar_service import CalendarService
from app.services.email_service import EmailService
from app.services.notification_service import NotificationService
from app.api.limiter import limiter
from app.api.helpers import (
    IST, to_local, parse_dt_to_ist, meeting_to_dict, 
    log_status_change
)
from app.schemas.meeting import (
    MeetingCreate, RescheduleRequest, AvailabilityCreate, ScheduleMeetingRequest
)

router = APIRouter(prefix="/meetings", tags=["Meetings & Bookings"], dependencies=[Depends(require_verified_user)])

@router.get("")
async def get_meetings(status: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Meeting).filter(Meeting.deleted_at == None)
    if current_user.role not in ["admin", "super_admin"]:
        q = q.filter(Meeting.client_id == current_user.id)
    if status:
        q = q.filter(Meeting.status == status)
    meetings = q.order_by(Meeting.created_at.desc()).all()
    return {
        "success": True,
        "data": [meeting_to_dict(m) for m in meetings]
    }

@router.post("")
async def create_meeting(req: MeetingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    start = parse_dt_to_ist(req.start_time)
    end = parse_dt_to_ist(req.end_time)

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
            "error": {
                "code": "DUPLICATE_BOOKING",
                "message": "Duplicate request detected. This slot is already booked."
            },
            "data": {
                "booking_id": existing.id if existing else None,
                "duplicate": True
            }
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
    
    EmailService.send_booking_received(current_user.email, current_user.name, meeting_dict)
    
    # Notify admin about new booking
    import os
    from app.core.logging import logger
    admin_emails_env = os.getenv("ADMIN_EMAILS", "tharunriot@gmail.com")
    admin_emails = [email.strip().lower() for email in admin_emails_env.split(",") if email.strip()]
    for admin_email in admin_emails:
        try:
            EmailService.send_email(
                to=admin_email,
                subject=f"New Booking Request: {meeting.title} - SISU",
                html=f"""
                <div style="font-family: sans-serif; color: #374151; max-width: 600px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
                  <h2 style="color: #111827;">New Booking Request Received</h2>
                  <p>A new mentorship session request has been submitted and is pending your review.</p>
                  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                  <p><strong>Client Name:</strong> {current_user.name}</p>
                  <p><strong>Client Email:</strong> {current_user.email}</p>
                  <p><strong>Agenda:</strong> {meeting.title}</p>
                  <p><strong>Proposed Date:</strong> {local_start.strftime('%B %d, %Y')}</p>
                  <p><strong>Proposed Time:</strong> {local_start.strftime('%I:%M %p')} IST</p>
                  <p><strong>Duration:</strong> {meeting.duration_minutes} minutes</p>
                  <p><strong>Preferred Channel:</strong> {meeting.preferred_communication}</p>
                  {f'<p><strong>Phone:</strong> {meeting.phone}</p>' if meeting.phone else ''}
                  <div style="margin-top: 24px;">
                    <a href="{settings.FRONTEND_URL}/admin/pending" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Review in Admin Dashboard</a>
                  </div>
                </div>
                """
            )
        except Exception as admin_email_err:
            logger.error(f"Failed to send booking notification to admin {admin_email}: {admin_email_err}")

    NotificationService.create_notification(
        db, current_user.id, "booking_received",
        "Meeting request submitted",
        f"Your request for '{meeting.title}' has been received and is pending review.",
        meeting.id
    )

    return {
        "success": True,
        "data": meeting_to_dict(meeting)
    }

@router.get("/available-slots")
async def get_available_slots(from_time: Optional[str] = None, duration: int = 60, count: int = 3, db: Session = Depends(get_db)):
    if from_time:
        after = parse_dt_to_ist(from_time)
    else:
        after = datetime.datetime.now(IST).replace(tzinfo=None)

    slots = MeetingService.find_next_available_slots(db, after=after, duration_minutes=duration, count=count)
    return {
        "success": True,
        "data": {
            "available_slots": slots, 
            "from": after.isoformat(), 
            "duration_minutes": duration
        }
    }

@router.get("/stats")
async def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Stats logic
    if current_user.role in ["admin", "super_admin"]:
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
    return {
        "success": True,
        "data": res
    }

@router.get("/{meeting_id}")
async def get_meeting(meeting_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.deleted_at == None).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if current_user.role not in ["admin", "super_admin"] and meeting.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return {
        "success": True,
        "data": meeting_to_dict(meeting)
    }

@router.delete("/{meeting_id}")
async def cancel_meeting(meeting_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.deleted_at == None).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if current_user.role not in ["admin", "super_admin"] and meeting.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    old_status = meeting.status
    meeting.status = "cancelled"
    db.commit()

    log_status_change(db, meeting.id, old_status, "cancelled", current_user.email)

    if meeting.google_event_id:
        try:
            CalendarService.delete_event(meeting.google_event_id)
        except Exception as e:
            logger.error(f"[Calendar Delete Error] {e}")

    client = db.query(User).filter(User.id == meeting.client_id).first()
    if client:
        meeting_dict = {
            "title": meeting.title,
            "date": meeting.start_time.strftime("%B %d, %Y"),
            "time": f"{meeting.start_time.strftime('%I:%M %p')} IST",
            "type": meeting.meeting_type,
            "duration": f"{meeting.duration_minutes} mins",
        }
        EmailService.send_cancellation(client.email, client.name, meeting_dict)
        NotificationService.create_notification(db, client.id, "cancelled", "Meeting cancelled", f"Your meeting '{meeting.title}' has been cancelled.", meeting.id)

    return {
        "success": True,
        "data": {"message": "Meeting cancelled"}
    }

@router.put("/{meeting_id}/reschedule")
async def client_reschedule_request(meeting_id: int, req: RescheduleRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.deleted_at == None).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if current_user.role not in ["admin", "super_admin"] and meeting.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    start = parse_dt_to_ist(req.new_start_time)
    end = parse_dt_to_ist(req.new_end_time)

    if start < datetime.datetime.now():
        raise HTTPException(status_code=400, detail="Cannot reschedule to a past date")

    MeetingService.validate_meeting_rules(
        db=db,
        client_id=current_user.id,
        title=meeting.title,
        description=meeting.description,
        start=start,
        end=end,
        duration_minutes=meeting.duration_minutes,
        meeting_id_to_exclude=meeting.id
    )

    old_status = meeting.status
    old_start = meeting.start_time

    meeting.start_time = start
    meeting.end_time = end
    meeting.status = "reschedule_requested"
    
    orig_time_str = f"[Reschedule Request] Original: {old_start.strftime('%b %d, %Y at %I:%M %p')} IST"
    reason_str = f"Reason: {req.reason}" if req.reason else "No reason provided."
    resched_note = f"{orig_time_str} · {reason_str}"
    meeting.notes = f"{resched_note}\n\n{meeting.notes}" if meeting.notes else resched_note

    db.commit()
    log_status_change(db, meeting.id, old_status, "reschedule_requested", current_user.email, req.reason)

    admins = db.query(User).filter(User.role.in_(["admin", "super_admin"])).all()
    for admin in admins:
        NotificationService.create_notification(
            db, admin.id, "reschedule_requested",
            "Reschedule Requested",
            f"{current_user.name} has requested to reschedule '{meeting.title}' to {start.strftime('%B %d, %I:%M %p')}.",
            meeting.id
        )

    return {
        "success": True,
        "data": meeting_to_dict(meeting)
    }

@router.put("/{meeting_id}/confirm-reschedule")
async def client_confirm_reschedule(meeting_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.deleted_at == None).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if current_user.role not in ["admin", "super_admin"] and meeting.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if meeting.status != "reschedule_proposed":
        raise HTTPException(status_code=400, detail="No reschedule proposal exists for this meeting")

    old_status = meeting.status
    meeting.status = "rescheduled"

    MeetingService.mark_slot_as_booked(db, meeting.start_time, meeting.end_time)

    client_email = current_user.email
    client_name = current_user.name
    local_start = to_local(meeting.start_time)

    try:
        res = MeetingService.handle_approved_meeting_native(db, meeting, client_name, client_email)
        if res.get("success"):
            meeting.google_event_id = res.get("google_event_id")
            meeting.meet_link = res.get("meet_link")
            db.commit()
            db.refresh(meeting)
    except Exception as err:
        logger.error(f"[Google Reschedule Sync Error] Direct sync failed: {err}")

    db.commit()
    log_status_change(db, meeting.id, old_status, "rescheduled", current_user.email)

    NotificationService.create_notification(
        db, current_user.id, "rescheduled", "Meeting Reschedule Confirmed! ",
        f"Your meeting '{meeting.title}' has been successfully locked in for {local_start.strftime('%B %d at %I:%M %p')} IST.",
        meeting.id
    )

    admins = db.query(User).filter(User.role.in_(["admin", "super_admin"])).all()
    for admin in admins:
        NotificationService.create_notification(
            db, admin.id, "rescheduled", "Client Accepted Reschedule",
            f"{client_name} has accepted the proposed reschedule for '{meeting.title}' to {local_start.strftime('%B %d at %I:%M %p')} IST.",
            meeting.id
        )

    return {
        "success": True,
        "data": meeting_to_dict(meeting)
    }


