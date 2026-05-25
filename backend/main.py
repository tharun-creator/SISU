"""
main.py — Sisu Executive Meeting Platform — FastAPI Backend
"""
from fastapi import FastAPI, HTTPException, Depends, Request, BackgroundTasks, Header
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import datetime
import asyncio
import os
import requests
import time
import re
import secrets
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import get_db, Booking as DBBooking, Meeting, User, Notification, MeetingStatusLog, AvailabilitySlot, PasswordResetToken, DateAvailabilitySignal, AdminEmail
from llm import generate_chat_response
import auth
from auth import get_current_user, require_admin, RegisterRequest, LoginRequest
import email_service
import calendar_service
import meeting_booking_service

import logging

# ── Logging Setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler("backend.log")]
)
logger = logging.getLogger("sisu-api")

# ── App Setup ─────────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Sisu Executive Booking API", version="2.0.0")
app.state.limiter = limiter

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Our team has been notified."}
    )

app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic Models ────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    message: str
    history: Optional[List[dict]] = None # List of {"role": "user"|"assistant", "content": "..."}

class ChatResponse(BaseModel):
    response: str
    error: Optional[str] = None

class BookingBase(BaseModel):
    client_name: str
    type: str
    time: str
    status: str = "pending"

class BookingCreate(BookingBase):
    pass

class BookingOut(BookingBase):
    id: int
    class Config:
        from_attributes = True

class ScheduleMeetingRequest(BaseModel):
    title: str
    description: str
    start_time: str
    end_time: str
    attendee_email: str
    attendee_name: Optional[str] = None
    google_meet: bool = True

class MeetingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    reason: Optional[str] = None
    meeting_type: str = "Mentorship Session"
    priority: str = "normal"
    start_time: str
    end_time: str
    duration_minutes: int = 60
    preferred_communication: str = "video"
    google_meet: bool = True
    phone: Optional[str] = None

class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    admin_notes: Optional[str] = None
    priority: Optional[str] = None
    meet_link: Optional[str] = None
    phone: Optional[str] = None
    otter_notes: Optional[str] = None

class MeetingStatusUpdate(BaseModel):
    status: str
    admin_notes: Optional[str] = None
    meet_link: Optional[str] = None
    new_start_time: Optional[str] = None
    new_end_time: Optional[str] = None

class AvailabilityCreate(BaseModel):
    start_time: str
    end_time: str
    recurring: bool = False
    day_of_week: Optional[int] = None

class RescheduleRequest(BaseModel):
    new_start_time: str
    new_end_time: str
    reason: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    password: str

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    timezone: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class DateSignalRequest(BaseModel):
    date: str  # "YYYY-MM-DD"
    signal: str  # "green" | "yellow" | "red"
    custom_slots: Optional[str] = None  # Comma-separated slots, e.g. "09:00-10:00,10:00-11:00"

class UserCreateRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "client"

class UserPromoteRequest(BaseModel):
    email: str

class UserDemoteRequest(BaseModel):
    email: str

class UserStatusUpdateRequest(BaseModel):
    is_active: bool


# ── Timezone Setup ────────────────────────────────────────────────────────────
IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

def to_local(dt: datetime.datetime) -> datetime.datetime:
    """Ensure datetime is in IST context. If naive, assume it's already IST."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        # If naive, we treat it as IST (since we store IST in DB now)
        return dt.replace(tzinfo=IST)
    return dt.astimezone(IST)

# ── Helpers ────────────────────────────────────────────────────────────────────
def parse_dt_to_ist(s: str) -> datetime.datetime:
    """Parse ISO string and return a naive IST datetime for storage.
    If input is UTC aware (ends in Z), it converts to IST.
    If input is already naive, it assumes it's already IST."""
    try:
        # Handle 'Z' suffix for fromisoformat compat
        if s.endswith('Z'):
            s = s.replace('Z', '+00:00')
        
        dt = datetime.datetime.fromisoformat(s)
        
        if dt.tzinfo is not None:
            # Convert aware (likely UTC) to IST and make naive
            return dt.astimezone(IST).replace(tzinfo=None)
        
        # Already naive, assume IST context
        return dt
    except Exception:
        # Last resort fallback
        try:
            return datetime.datetime.strptime(s[:19], "%Y-%m-%dT%H:%M:%S")
        except:
            return datetime.datetime.now() # Should not happen with valid inputs

def meeting_to_dict(m: Meeting) -> dict:
    """Simple serializer for Meeting model."""
    local_start = to_local(m.start_time)
    local_end = to_local(m.end_time)
    return {
        "id": m.id,
        "client_id": m.client_id,
        "client_name": m.client.name if m.client else "Unknown",
        "client_email": m.client.email if m.client else "",
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

def send_zapier_webhook_sync(payload: dict) -> dict:
    webhook_url = os.environ.get("ZAPIER_WEBHOOK_URL")
    if not webhook_url or "YOUR_ID" in webhook_url:
        raise Exception("Zapier webhook URL not configured.")
    
    max_retries = int(os.environ.get("WEBHOOK_MAX_RETRIES", "3"))
    timeout = int(os.environ.get("WEBHOOK_TIMEOUT", "10"))
    
    for attempt in range(max_retries):
        start_time_req = time.time()
        try:
            print(f"[{datetime.datetime.now().isoformat()}] Webhook POST to Zapier (Attempt {attempt+1})")
            print(f"  Payload: title={payload.get('title')}, attendee={payload.get('attendee_email')}, start={payload.get('start_time')}")
            response = requests.post(webhook_url, json=payload, timeout=timeout)
            duration = time.time() - start_time_req
            print(f"  Status: {response.status_code}")
            print(f"  Response: {response.text}")
            print(f"  Duration: {duration:.2f}s")
            
            response.raise_for_status()
            return response.json() if response.text else {"success": True}
        except requests.exceptions.RequestException as e:
            duration = time.time() - start_time_req
            print(f"  Error: {e}")
            print(f"  Duration: {duration:.2f}s")
            if attempt == max_retries - 1:
                raise Exception(f"Webhook failed after {max_retries} attempts: {e}")
            time.sleep(2 ** attempt)

def trigger_zapier_webhook(payload: dict):
    try:
        send_zapier_webhook_sync(payload)
    except Exception as e:
        print(f"Background webhook error: {e}")

# ── Auth Routes ────────────────────────────────────────────────────────────────
@app.post("/api/auth/register")
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    return auth.register_user(req, db)

@app.post("/api/auth/login")
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    return auth.login_user(req, db)

@app.get("/api/auth/me")
async def me(current_user: User = Depends(get_current_user)):
    return auth.user_to_dict(current_user)

@app.post("/api/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if user:
        # Invalidate existing active tokens
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.is_used == False
        ).update({"is_used": True})
        
        # Create a new secure token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=60)
        
        reset_token_obj = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires_at,
            is_used=False
        )
        db.add(reset_token_obj)
        db.commit()
        
        # Build reset link
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        reset_link = f"{frontend_url.rstrip('/')}/reset-password?token={token}"
        
        # Send password reset email
        background_tasks.add_task(
            email_service.send_password_reset,
            user.email, user.name, reset_link
        )
        
    return {"detail": "If an account exists, a link has been sent."}

@app.post("/api/auth/reset-password")
async def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == req.token
    ).first()
    
    if not reset_token or reset_token.is_used or reset_token.expires_at < datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.password_hash = auth.hash_password(req.password)
    reset_token.is_used = True
    db.commit()
    
    return {"detail": "Your password has been reset successfully."}

@app.put("/api/auth/update-profile")
async def update_profile(
    req: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if req.name is not None:
        name_val = req.name.strip()
        if not name_val:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        current_user.name = name_val
    if req.phone is not None:
        current_user.phone = req.phone.strip()
    if req.company is not None:
        current_user.company = req.company.strip()
    if req.job_title is not None:
        current_user.job_title = req.job_title.strip()
    if req.timezone is not None:
        current_user.timezone = req.timezone.strip()
    
    db.commit()
    db.refresh(current_user)
    return auth.user_to_dict(current_user)

@app.put("/api/auth/change-password")
async def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not auth.verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")
        
    current_user.password_hash = auth.hash_password(req.new_password)
    db.commit()
    return {"detail": "Password updated successfully"}


# ── Chat Route ─────────────────────────────────────────────────────────────────
@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatMessage, current_user: User = Depends(get_current_user)):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    try:
        response_text = await generate_chat_response(
            request.message, request.history, user_name=current_user.name, user_id=current_user.id
        )
        return ChatResponse(response=response_text)
    except Exception as e:
        return ChatResponse(response="", error=str(e))

# ── Legacy Bookings Routes (backwards compat) ─────────────────────────────────
@app.get("/api/bookings", response_model=List[BookingOut])
async def get_bookings(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(DBBooking)
    if status:
        q = q.filter(DBBooking.status == status)
    return q.all()

@app.post("/api/bookings", response_model=BookingOut)
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

@app.put("/api/bookings/{booking_id}/status")
async def update_booking_status(booking_id: int, status: str, db: Session = Depends(get_db)):
    db_booking = db.query(DBBooking).filter(DBBooking.id == booking_id).first()
    if not db_booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    db_booking.status = status
    db.commit()
    db.refresh(db_booking)
    return db_booking

# ── Meetings Routes ────────────────────────────────────────────────────────────
@app.get("/api/meetings")
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

@app.post("/api/meetings")
async def create_meeting(
    req: MeetingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Store all times as IST naive in DB
    start = parse_dt_to_ist(req.start_time)
    end = parse_dt_to_ist(req.end_time)

    # Duplicate check for the user
    user_existing = db.query(Meeting).filter(
        Meeting.client_id == current_user.id,
        Meeting.start_time == start,
        Meeting.deleted_at == None,
    ).first()
    if user_existing:
        return {
            "success": False,
            "message": f"⚠️ This booking already exists! Booking ID: {user_existing.id}",
            "booking_id": user_existing.id,
            "duplicate": True,
            "status": user_existing.status
        }

    # Global conflict check for the requested slot
    global_conflict = db.query(Meeting).filter(
        Meeting.start_time < end,
        Meeting.end_time > start,
        Meeting.deleted_at == None,
        Meeting.status.in_(["pending", "approved"]),
    ).first()
    if global_conflict:
        # Return alternatives instead of bare 409
        alternatives = meeting_booking_service.find_next_available_slots(
            db, start, duration_minutes=req.duration_minutes
        )
        raise HTTPException(
            status_code=409,
            detail={
                "conflict": True,
                "message": "This time slot is already booked. Please choose from the alternatives below.",
                "alternative_slots": alternatives,
            },
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
        # Race condition: someone just inserted this. Fetch it.
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

    # Background: send email + create notification
    local_start = to_local(start)
    meeting_dict = {
        "title": meeting.title,
        "date": local_start.strftime("%B %d, %Y"),
        "time": f"{local_start.strftime('%I:%M %p')} IST",
        "type": meeting.meeting_type,
        "duration": f"{meeting.duration_minutes} mins",
        "priority": meeting.priority,
    }
    background_tasks.add_task(
        email_service.send_booking_received,
        current_user.email, current_user.name, meeting_dict
    )
    create_notification(
        db, current_user.id, "booking_received",
        "Meeting request submitted",
        f"Your request for '{meeting.title}' has been received and is pending review.",
        meeting.id,
    )

    return meeting_to_dict(meeting)


# ── Available Slots Discovery ──────────────────────────────────────────────────
@app.get("/api/meetings/available-slots")
async def get_available_slots(
    from_time: Optional[str] = None,
    duration: int = 60,
    count: int = 3,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return the next `count` available booking slots after `from_time` (ISO string).
    If `from_time` is omitted, uses the current IST time.
    """
    if from_time:
        after = parse_dt_to_ist(from_time)
    else:
        after = datetime.datetime.now(IST).replace(tzinfo=None)

    slots = meeting_booking_service.find_next_available_slots(
        db, after=after, duration_minutes=duration, count=count
    )
    return {"available_slots": slots, "from": after.isoformat(), "duration_minutes": duration}

@app.get("/api/meetings/{meeting_id}")
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



@app.delete("/api/meetings/{meeting_id}")
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
    meeting.deleted_at = datetime.datetime.utcnow()
    db.commit()

    log_status_change(db, meeting.id, old_status, "cancelled", current_user.email)

    # Delete from Google Calendar
    if meeting.google_event_id:
        background_tasks.add_task(calendar_service.delete_event, meeting.google_event_id)

    client = db.query(User).filter(User.id == meeting.client_id).first()
    if client:
        meeting_dict = {
            "title": meeting.title,
            "date": meeting.start_time.strftime("%B %d, %Y"),
            "time": f"{meeting.start_time.strftime('%I:%M %p')} IST",
            "type": meeting.meeting_type,
            "duration": f"{meeting.duration_minutes} mins",
        }
        background_tasks.add_task(email_service.send_cancellation, client.email, client.name, meeting_dict)
        # Sync cancellation to Zapier/Calendar
        background_tasks.add_task(
            meeting_booking_service.trigger_zapier_cancellation, 
            meeting.id, meeting.google_event_id, meeting.title, client.email
        )
        create_notification(db, client.id, "cancelled", "Meeting cancelled", f"Your meeting '{meeting.title}' has been cancelled.", meeting.id)

    return {"message": "Meeting cancelled"}


@app.put("/api/meetings/{meeting_id}/reschedule")
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
    if meeting.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    start = parse_dt_to_ist(req.new_start_time)
    end = parse_dt_to_ist(req.new_end_time)

    if start < datetime.datetime.now():
        raise HTTPException(status_code=400, detail="Cannot reschedule to a past date")

    # Conflict check (excluding this meeting itself)
    conflict = db.query(Meeting).filter(
        Meeting.start_time < end,
        Meeting.end_time > start,
        Meeting.id != meeting.id,
        Meeting.deleted_at == None,
        Meeting.status.in_(["pending", "approved"]),
    ).first()
    if conflict:
        # Use meeting_booking_service to find alternatives and raise conflict
        alternatives = meeting_booking_service.find_next_available_slots(
            db, start, duration_minutes=meeting.duration_minutes
        )
        raise HTTPException(
            status_code=409,
            detail={
                "conflict": True,
                "message": "The proposed time conflicts with an existing booking. Please choose from the alternatives.",
                "alternative_slots": alternatives,
            },
        )

    old_status = meeting.status
    old_start = meeting.start_time
    old_end = meeting.end_time

    # Update times and set status to reschedule_requested
    meeting.start_time = start
    meeting.end_time = end
    meeting.status = "reschedule_requested"
    
    # Log change details in notes
    orig_time_str = f"[Reschedule Request] Original: {old_start.strftime('%b %d, %Y at %I:%M %p')} IST"
    reason_str = f"Reason: {req.reason}" if req.reason else "No reason provided."
    resched_note = f"{orig_time_str} · {reason_str}"
    if meeting.notes:
        meeting.notes = f"{resched_note}\n\n{meeting.notes}"
    else:
        meeting.notes = resched_note

    db.commit()

    log_status_change(db, meeting.id, old_status, "reschedule_requested", current_user.email, req.reason)

    # Notify Admin via DB Notification
    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        create_notification(
            db, admin.id, "reschedule_requested",
            "Reschedule Requested",
            f"{current_user.name} has requested to reschedule '{meeting.title}' to {start.strftime('%B %d, %I:%M %p')}.",
            meeting.id
        )

    return meeting_to_dict(meeting)


# ── Admin Routes ───────────────────────────────────────────────────────────────

# ── Admin User Management Endpoints ──

@app.get("/api/admin/users")
async def admin_get_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [auth.user_to_dict(u) for u in users]

@app.post("/api/admin/users/create")
async def admin_create_user(
    req: UserCreateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    is_admin = db.query(AdminEmail).filter(AdminEmail.email == req.email).first() is not None
    role = "admin" if is_admin else "client"
    
    new_user = User(
        name=req.name,
        email=req.email,
        password_hash=auth.hash_password(req.password),
        role=role,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return auth.user_to_dict(new_user)


@app.post("/api/admin/users/promote")
async def admin_promote_user(
    req: UserPromoteRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    email = req.email.strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email cannot be empty")
        
    # Check if already in admin_emails table
    admin_email_exists = db.query(AdminEmail).filter(AdminEmail.email == email).first()
    if not admin_email_exists:
        new_admin_email = AdminEmail(email=email)
        db.add(new_admin_email)
        db.commit()

    user = db.query(User).filter(User.email == email).first()
    if user:
        user.role = "admin"
        db.commit()
        db.refresh(user)
        return {"message": f"Successfully promoted {user.name} to admin", "user": auth.user_to_dict(user)}
    else:
        temp_pass = "SisuAdmin@2026"
        new_admin = User(
            name="Pending Admin",
            email=email,
            password_hash=auth.hash_password(temp_pass),
            role="admin",
            is_active=True
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        
        user_dict = auth.user_to_dict(new_admin)
        user_dict["temporary_password"] = temp_pass
        return {
            "message": "User did not exist. Created a new Admin profile with temporary credentials.",
            "user": user_dict,
            "created_new": True
        }

@app.post("/api/admin/users/demote")
async def admin_demote_user(
    req: UserDemoteRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    email = req.email.strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email cannot be empty")
    
    if email == admin.email:
        raise HTTPException(status_code=400, detail="You cannot demote yourself.")
        
    if email == "tharunriot@gmail.com":
        raise HTTPException(status_code=400, detail="The default admin tharunriot@gmail.com cannot be demoted.")

    # Remove from admin_emails table
    db.query(AdminEmail).filter(AdminEmail.email == email).delete()
    
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.role = "client"
        db.commit()
        db.refresh(user)
    else:
        db.commit()

    return {"message": f"Successfully demoted {email} to client", "user": auth.user_to_dict(user) if user else None}

@app.put("/api/admin/users/{user_id}/status")
async def admin_update_user_status(
    user_id: int,
    req: UserStatusUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate yourself.")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_active = req.is_active
    db.commit()
    db.refresh(user)
    return {"message": f"User status updated", "user": auth.user_to_dict(user)}

@app.delete("/api/admin/users/{user_id}")
async def admin_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete yourself.")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.delete(user)
    db.commit()
    return {"message": "User successfully deleted"}

# ── Admin Calendar Signaling Endpoints ──

@app.get("/api/availability/calendar-signals")
async def get_calendar_signals(db: Session = Depends(get_db)):
    signals = db.query(DateAvailabilitySignal).all()
    return {
        s.date: {
            "signal": s.signal,
            "custom_slots": s.custom_slots.split(",") if s.custom_slots else []
        }
        for s in signals
    }

@app.post("/api/admin/availability/date-signal")
async def admin_set_date_signal(
    req: DateSignalRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    date_str = req.date.strip()
    # Validate date format (YYYY-MM-DD)
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
        raise HTTPException(status_code=400, detail="Date must be in YYYY-MM-DD format")
        
    if req.signal not in ["green", "yellow", "red"]:
        raise HTTPException(status_code=400, detail="Signal must be 'green', 'yellow', or 'red'")
        
    sig = db.query(DateAvailabilitySignal).filter(DateAvailabilitySignal.date == date_str).first()
    if sig:
        sig.signal = req.signal
        sig.custom_slots = req.custom_slots
    else:
        sig = DateAvailabilitySignal(
            date=date_str,
            signal=req.signal,
            custom_slots=req.custom_slots
        )
        db.add(sig)
        
    db.commit()
    return {"message": "Date availability signal saved successfully", "date": date_str, "signal": req.signal}


@app.put("/api/admin/meetings/{meeting_id}/status")
async def admin_update_meeting_status(
    meeting_id: int,
    req: MeetingStatusUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.deleted_at == None).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    old_status = meeting.status
    meeting.status = req.status
    if req.admin_notes:
        meeting.admin_notes = req.admin_notes
    if req.meet_link:
        meeting.meet_link = req.meet_link

    # Handle time update if provided (regardless of status)
    if req.new_start_time and req.new_end_time:
        new_start = parse_dt_to_ist(req.new_start_time)
        new_end = parse_dt_to_ist(req.new_end_time)
        
        # Only process if time actually changed
        if new_start != meeting.start_time or new_end != meeting.end_time:
            old_start = meeting.start_time
            meeting.start_time = new_start
            meeting.end_time = new_end

            # If it's specifically a reschedule (not just an approval with a minor tweak)
            if req.status == "rescheduled":
                if meeting.google_event_id:
                    background_tasks.add_task(
                        calendar_service.update_event,
                        meeting.google_event_id,
                        start=new_start,
                        end=new_end,
                    )

                client = db.query(User).filter(User.id == meeting.client_id).first()
                if client:
                    local_old = to_local(old_start)
                    local_new = to_local(new_start)
                    old_dict = {"title": meeting.title, "date": local_old.strftime("%B %d, %Y"), "time": f"{local_old.strftime('%I:%M %p')} IST", "type": meeting.meeting_type, "duration": f"{meeting.duration_minutes} mins"}
                    new_dict = {"title": meeting.title, "date": local_new.strftime("%B %d, %Y"), "time": f"{local_new.strftime('%I:%M %p')} IST", "type": meeting.meeting_type, "duration": f"{meeting.duration_minutes} mins"}
                    background_tasks.add_task(email_service.send_meeting_rescheduled, client.email, client.name, old_dict, new_dict)
                    create_notification(db, client.id, "rescheduled", "Meeting Rescheduled", f"Your meeting has been rescheduled to {local_new.strftime('%B %d at %I:%M %p')}", meeting.id)

    db.commit()
    log_status_change(db, meeting.id, old_status, req.status, admin.email, req.admin_notes)

    client = db.query(User).filter(User.id == meeting.client_id).first()
    if not client:
        return meeting_to_dict(meeting)

    local_start = to_local(meeting.start_time)
    meeting_dict = {
        "title": meeting.title,
        "date": local_start.strftime("%B %d, %Y"),
        "time": f"{local_start.strftime('%I:%M %p')} IST",
        "type": meeting.meeting_type,
        "duration": f"{meeting.duration_minutes} mins",
        "priority": meeting.priority,
        "meet_link": meeting.meet_link or "",
    }

    if req.status == "approved":
        # Mark the original availability slot as booked in the DB
        meeting_booking_service.mark_slot_as_booked(db, meeting.start_time, meeting.end_time)

        # Sync directly with Google Calendar immediately
        try:
            print(f"[Calendar Direct Sync] Approving meeting #{meeting.id} - Title: '{meeting.title}'")
            print(f"  Start Time (DB naive): {meeting.start_time}")
            print(f"  End Time (DB naive): {meeting.end_time}")
            print(f"  Start Time (IST local): {local_start.isoformat()}")
            print(f"  Attendees: {[client.email]}")
            event = calendar_service.create_event_direct(
                title=meeting.title,
                description=meeting.description or "Mentorship session booked on Sisu",
                start=meeting.start_time,
                end=meeting.end_time,
                attendees=[client.email],
                meeting_id=str(meeting.id),
                preferred_communication=meeting.preferred_communication
            )
            if event:
                meeting.google_event_id = event.get("id")
                meet_link = None
                if event.get("conferenceData") and event["conferenceData"].get("entryPoints"):
                    for ep in event["conferenceData"]["entryPoints"]:
                        if ep.get("entryPointType") == "video":
                            meet_link = ep.get("uri")
                            break
                if meet_link:
                    meeting.meet_link = meet_link
                db.commit()
                db.refresh(meeting)
        except Exception as cal_err:
            print(f"[Calendar Direct Sync Error] {cal_err}")

        # Send approved email with updated details
        try:
            import email_service
            fresh_dict = {
                "title": meeting.title,
                "date": local_start.strftime("%B %d, %Y"),
                "time": f"{local_start.strftime('%I:%M %p')} IST",
                "type": meeting.meeting_type,
                "duration": f"{meeting.duration_minutes} mins",
            }
            background_tasks.add_task(
                email_service.send_meeting_approved,
                client.email, client.name, fresh_dict, meeting.meet_link or ""
            )
        except Exception as email_err:
            print(f"[Email Send Error] {email_err}")

        create_notification(db, client.id, "approved", "Meeting Approved! 🎉", f"Your meeting '{meeting.title}' has been confirmed for {local_start.strftime('%B %d at %I:%M %p')}.", meeting.id)

    elif req.status == "rejected":
        if meeting.google_event_id:
            background_tasks.add_task(calendar_service.delete_event, meeting.google_event_id)
        # Sync rejection/cancellation to Zapier too
        background_tasks.add_task(
            meeting_booking_service.trigger_zapier_cancellation, 
            meeting.id, meeting.google_event_id, meeting.title, client.email
        )
        background_tasks.add_task(email_service.send_meeting_rejected, client.email, client.name, meeting_dict, req.admin_notes or "")
        create_notification(db, client.id, "rejected", "Meeting Request Declined", f"Your request for '{meeting.title}' was not approved. You may submit a new request.", meeting.id)

    return meeting_to_dict(meeting)



@app.get("/api/meetings/{meeting_id}/zapier")
async def get_meeting_zapier_payload(
    meeting_id: int,
    x_zapier_secret: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Secure endpoint for Zapier to FETCH meeting details.
    """
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


@app.get("/api/admin/meetings")
async def admin_get_all_meetings(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    q = db.query(Meeting).filter(Meeting.deleted_at == None)
    if status:
        if status == "pending":
            q = q.filter(Meeting.status.in_(["pending", "reschedule_requested"]))
        else:
            q = q.filter(Meeting.status == status)
    meetings = q.order_by(Meeting.created_at.desc()).all()
    return [meeting_to_dict(m) for m in meetings]

# ── Notifications Routes ───────────────────────────────────────────────────────
@app.get("/api/notifications")
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

@app.put("/api/notifications/{notif_id}/read")
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

@app.put("/api/notifications/read-all")
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

# ── Availability Routes ────────────────────────────────────────────────────────
@app.get("/api/availability")
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

@app.post("/api/availability")
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

@app.put("/api/availability/{slot_id}")
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
    db.refresh(slot)
    return {"message": "Slot updated", "id": slot.id}

@app.delete("/api/availability/{slot_id}")
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

@app.get("/api/availability/free-slots")
async def get_free_slots(date: str, duration: int = 60, db: Session = Depends(get_db)):
    dt_str = date.split('T')[0]
    sig = db.query(DateAvailabilitySignal).filter(DateAvailabilitySignal.date == dt_str).first()
    
    if sig:
        if sig.signal == "red":
            return []
        elif sig.signal == "yellow":
            if not sig.custom_slots:
                return []
            
            custom_slots_list = []
            for slot_str in sig.custom_slots.split(","):
                if "-" not in slot_str:
                    continue
                start_part, end_part = slot_str.split("-")
                try:
                    t_start = datetime.datetime.strptime(start_part.strip(), "%H:%M")
                    label = t_start.strftime("%I:%M %p")
                    custom_slots_list.append({
                        "start": start_part.strip(),
                        "end": end_part.strip(),
                        "label": label + " IST"
                    })
                except Exception:
                    custom_slots_list.append({
                        "start": start_part.strip(),
                        "end": end_part.strip(),
                        "label": f"{start_part.strip()} - {end_part.strip()} IST"
                    })
            
            # Filter out locally booked meetings conflict
            day_start = datetime.datetime.fromisoformat(dt_str).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + datetime.timedelta(days=1)
            local_meetings = db.query(Meeting).filter(
                Meeting.start_time >= day_start,
                Meeting.start_time < day_end,
                Meeting.status.in_(["pending", "approved"]),
                Meeting.deleted_at == None
            ).all()
            
            final_slots = []
            for slot in custom_slots_list:
                try:
                    slot_start_time = datetime.datetime.strptime(slot["start"], "%H:%M").time()
                    slot_end_time = datetime.datetime.strptime(slot["end"], "%H:%M").time()
                    
                    slot_start_dt = datetime.datetime.combine(day_start.date(), slot_start_time).replace(tzinfo=IST)
                    slot_end_dt = datetime.datetime.combine(day_start.date(), slot_end_time).replace(tzinfo=IST)
                    
                    conflict = False
                    for m in local_meetings:
                        m_start = to_local(m.start_time)
                        m_end = to_local(m.end_time)
                        if slot_start_dt < m_end and slot_end_dt > m_start:
                            conflict = True
                            break
                    if not conflict:
                        final_slots.append(slot)
                except Exception:
                    final_slots.append(slot)
            return final_slots

    try:
        dt = datetime.datetime.fromisoformat(date)
        slots = calendar_service.get_free_slots(dt, duration)
    except Exception as e:
        # Fallback slots if calendar fails
        dt = datetime.datetime.fromisoformat(date)
        slots = []
        c = dt.replace(hour=10, minute=0, second=0, microsecond=0)
        end_time = dt.replace(hour=20, minute=0, second=0, microsecond=0)
        while c + datetime.timedelta(minutes=duration) <= end_time:
            se = c + datetime.timedelta(minutes=duration)
            slots.append({
                "start": c.strftime("%H:%M"),
                "end": se.strftime("%H:%M"),
                "label": c.strftime("%I:%M %p"),
            })
            c += datetime.timedelta(minutes=60)
            
    # Filter out locally booked meetings (global conflict check)
    day_start = dt.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + datetime.timedelta(days=1)
    
    local_meetings = db.query(Meeting).filter(
        Meeting.start_time >= day_start,
        Meeting.start_time < day_end,
        Meeting.status.in_(["pending", "approved"]),
        Meeting.deleted_at == None
    ).all()

    available_slots = []
    for slot in slots:
        try:
            slot_start_time = datetime.datetime.strptime(slot["start"], "%H:%M").time()
            slot_end_time = datetime.datetime.strptime(slot["end"], "%H:%M").time()
            
            # Treat candidate slot as local time (IST)
            slot_start_dt = datetime.datetime.combine(dt.date(), slot_start_time).replace(tzinfo=IST)
            slot_end_dt = datetime.datetime.combine(dt.date(), slot_end_time).replace(tzinfo=IST)
                
            conflict = False
            for m in local_meetings:
                # Convert DB meeting (UTC) to Local (IST) for comparison
                m_start = to_local(m.start_time)
                m_end = to_local(m.end_time)
                
                if slot_start_dt < m_end and slot_end_dt > m_start:
                    conflict = True
                    break
                    
            if not conflict:
                available_slots.append(slot)
        except Exception as e:
            # If parsing fails, just include it to be safe
            available_slots.append(slot)
            
    return available_slots

# ── Dashboard Stats ────────────────────────────────────────────────────────────
_stats_cache = {}

@app.get("/api/dashboard/stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cache_key = f"stats_{current_user.id}_{current_user.role}"
    now = time.time()
    
    if cache_key in _stats_cache:
        cached_data, timestamp = _stats_cache[cache_key]
        if now - timestamp < 60: # 1 minute cache
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

# ── Zapier Integrations Routes ──────────────────────────────────────────────────
@app.post("/api/meetings/schedule")
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
        
    webhook_payload = {
        "title": payload.title,
        "start_time": start_dt.astimezone(IST).isoformat(),
        "end_time": end_dt.astimezone(IST).isoformat(),
        "attendee_email": payload.attendee_email,
        "attendee_name": payload.attendee_name or payload.attendee_email.split("@")[0],
        "google_meet": payload.google_meet
    }
    
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, send_zapier_webhook_sync, webhook_payload)
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e), "code": "WEBHOOK_FAILED"})
        
    return {
        "success": True,
        "message": "Meeting scheduled. Calendar invite and email sent to attendee.",
        "scheduled_for": start_dt.isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
