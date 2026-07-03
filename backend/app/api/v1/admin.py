import re
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User, AdminEmail
from app.models.meeting import Meeting, DateAvailabilitySignal
from app.dependencies import require_admin
from app.core.security import hash_password
from app.services.email_service import EmailService
from app.services.calendar_service import CalendarService
from app.services.meeting_service import MeetingService
from app.services.notification_service import NotificationService
from app.schemas.meeting import MeetingStatusUpdate, DateSignalRequest
from app.schemas.user import UserOut, UserUpdate
from app.api.v1.auth import user_to_out_dict
from app.api.helpers import to_local, parse_dt_to_ist, meeting_to_dict, log_status_change

router = APIRouter(prefix="/admin", tags=["Admin Operations"], dependencies=[Depends(require_admin)])

class UserPriorityUpdateRequest(BaseModel):
    is_priority: bool

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

@router.get("/users")
async def admin_get_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return {
        "success": True,
        "data": [user_to_out_dict(u) for u in users]
    }

@router.post("/users/create")
async def admin_create_user(req: UserCreateRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    new_user = User(
        name=req.name,
        email=req.email,
        password_hash=hash_password(req.password),
        role=req.role,
        is_active=True,
        is_verified=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {
        "success": True,
        "data": user_to_out_dict(new_user)
    }

@router.post("/users/promote")
async def admin_promote_user(req: UserPromoteRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email cannot be empty")
        
    admin_email_exists = db.query(AdminEmail).filter(AdminEmail.email == email).first()
    if not admin_email_exists:
        new_admin_email = AdminEmail(email=email, role="admin")
        db.add(new_admin_email)
        db.commit()

    user = db.query(User).filter(User.email == email).first()
    if user:
        user.role = "admin"
        db.commit()
        db.refresh(user)
        return {
            "success": True,
            "data": {
                "message": f"Successfully promoted {user.name} to admin", 
                "user": user_to_out_dict(user)
            }
        }
    else:
        temp_pass = "SisuAdmin@2026"
        new_admin = User(
            name="Pending Admin",
            email=email,
            password_hash=hash_password(temp_pass),
            role="admin",
            is_active=True,
            is_verified=True
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        
        user_dict = user_to_out_dict(new_admin)
        user_dict["temporary_password"] = temp_pass
        return {
            "success": True,
            "data": {
                "message": "User did not exist. Created a new Admin profile with temporary credentials.",
                "user": user_dict,
                "created_new": True
            }
        }

@router.post("/users/demote")
async def admin_demote_user(req: UserDemoteRequest, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    email = req.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email cannot be empty")
        
    if email == admin.email:
        raise HTTPException(status_code=400, detail="You cannot demote yourself.")
        
    if email == "tharunriot@gmail.com":
        raise HTTPException(status_code=400, detail="The default admin tharunriot@gmail.com cannot be demoted.")

    db.query(AdminEmail).filter(AdminEmail.email.ilike(email)).delete(synchronize_session=False)
    
    user = db.query(User).filter(User.email.ilike(email)).first()
    if user:
        user.role = "client"
        db.commit()
        db.refresh(user)
    else:
        db.commit()

    return {
        "success": True,
        "data": {
            "message": f"Successfully demoted {email} to client", 
            "user": user_to_out_dict(user) if user else None
        }
    }

@router.put("/users/{user_id}/status")
async def admin_update_user_status(user_id: int, req: UserStatusUpdateRequest, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate yourself.")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_active = req.is_active
    db.commit()
    db.refresh(user)
    return {
        "success": True,
        "data": {
            "message": "User status updated", 
            "user": user_to_out_dict(user)
        }
    }

@router.delete("/users/{user_id}")
async def admin_delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete yourself.")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.delete(user)
    db.commit()
    return {
        "success": True,
        "data": {"message": "User successfully deleted"}
    }

@router.put("/users/{user_id}/priority")
async def admin_update_user_priority(user_id: int, req: UserPriorityUpdateRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_priority = req.is_priority
    db.commit()
    db.refresh(user)
    return {
        "success": True,
        "data": {
            "message": "User priority status updated", 
            "user": user_to_out_dict(user)
        }
    }

@router.post("/availability/date-signal")
async def admin_set_date_signal(
    req: DateSignalRequest, 
    db: Session = Depends(get_db), 
    admin: User = Depends(require_admin)
):
    date_str = req.date.strip()
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

    if req.signal == "red":
        y, m, d = map(int, date_str.split("-"))
        day_start = datetime.datetime(y, m, d, 0, 0, 0)
        day_end = datetime.datetime(y, m, d, 23, 59, 59)
        meetings_to_cancel = db.query(Meeting).filter(
            Meeting.start_time >= day_start,
            Meeting.start_time <= day_end,
            Meeting.status != "cancelled",
            Meeting.deleted_at == None
        ).all()
        for meeting in meetings_to_cancel:
            old_status = meeting.status
            meeting.status = "cancelled"
            
            log_status_change(db, meeting.id, old_status, "cancelled", admin.email, "Cancelled due to calendar block (Red Signal)")
            
            client = db.query(User).filter(User.id == meeting.client_id).first()
            if client:
                local_start = to_local(meeting.start_time)
                meeting_dict = {
                    "title": meeting.title,
                    "description": meeting.description or "",
                    "date": local_start.strftime("%B %d, %Y"),
                    "time": f"{local_start.strftime('%I:%M %p')} IST",
                    "type": meeting.meeting_type,
                    "duration": f"{meeting.duration_minutes} mins",
                    "priority": meeting.priority,
                    "meet_link": meeting.meet_link or "",
                }
                
                if meeting.google_event_id:
                    try:
                        CalendarService.delete_event(meeting.google_event_id)
                    except Exception as e:
                        print(f"[Calendar Direct Delete Error] {e}")
                
                try:
                    EmailService.send_cancellation(client.email, client.name, meeting_dict)
                except Exception as email_err:
                    print(f"[Email Send Error] {email_err}")
                
                NotificationService.create_notification(
                    db, 
                    client.id, 
                    "cancelled", 
                    "Meeting Cancelled", 
                    f"Your meeting '{meeting.title}' on {local_start.strftime('%B %d, %Y')} has been cancelled because the slot is no longer available.", 
                    meeting.id
                )
        db.commit()

    return {
        "success": True,
        "data": {
            "message": "Date availability signal saved successfully", 
            "date": date_str, 
            "signal": req.signal
        }
    }

@router.put("/meetings/{meeting_id}/status")
async def admin_update_meeting_status(
    meeting_id: int,
    req: MeetingStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.deleted_at == None).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    old_status = meeting.status
    if req.status == "rescheduled":
        meeting.status = "reschedule_proposed"
    else:
        meeting.status = req.status
        
    if req.admin_notes:
        meeting.admin_notes = req.admin_notes
    if req.meet_link:
        meeting.meet_link = req.meet_link
    if req.priority:
        meeting.priority = req.priority.lower()

    if req.new_start_time and req.new_end_time:
        new_start = parse_dt_to_ist(req.new_start_time)
        new_end = parse_dt_to_ist(req.new_end_time)
        
        if new_start != meeting.start_time or new_end != meeting.end_time:
            MeetingService.validate_meeting_rules(
                db=db,
                client_id=meeting.client_id,
                title=meeting.title,
                description=meeting.description,
                start=new_start,
                end=new_end,
                duration_minutes=meeting.duration_minutes,
                meeting_id_to_exclude=meeting.id
            )

            old_start = meeting.start_time
            meeting.start_time = new_start
            meeting.end_time = new_end

            if req.status == "rescheduled":
                client = db.query(User).filter(User.id == meeting.client_id).first()
                if client:
                    local_old = to_local(old_start)
                    local_new = to_local(new_start)
                    old_dict = {"title": meeting.title, "date": local_old.strftime("%B %d, %Y"), "time": f"{local_old.strftime('%I:%M %p')} IST", "type": meeting.meeting_type, "duration": f"{meeting.duration_minutes} mins"}
                    new_dict = {"title": meeting.title, "date": local_new.strftime("%B %d, %Y"), "time": f"{local_new.strftime('%I:%M %p')} IST", "type": meeting.meeting_type, "duration": f"{meeting.duration_minutes} mins"}
                    EmailService.send_reschedule_proposed(client.email, client.name, old_dict, new_dict)
                    NotificationService.create_notification(db, client.id, "reschedule_proposed", "Reschedule Proposed", f"Admin proposed to reschedule '{meeting.title}' to {local_new.strftime('%B %d at %I:%M %p')} IST.", meeting.id)

    db.commit()
    log_status_change(db, meeting.id, old_status, req.status, admin.email, req.admin_notes)

    client = db.query(User).filter(User.id == meeting.client_id).first()
    if not client:
        return {
            "success": True,
            "data": meeting_to_dict(meeting)
        }

    local_start = to_local(meeting.start_time)
    meeting_dict = {
        "title": meeting.title,
        "description": meeting.description or "",
        "date": local_start.strftime("%B %d, %Y"),
        "time": f"{local_start.strftime('%I:%M %p')} IST",
        "type": meeting.meeting_type,
        "duration": f"{meeting.duration_minutes} mins",
        "priority": meeting.priority,
        "meet_link": meeting.meet_link or "",
    }

    if req.status == "approved":
        MeetingService.mark_slot_as_booked(db, meeting.start_time, meeting.end_time)
        try:
            res = MeetingService.handle_approved_meeting_native(db, meeting, client.name, client.email)
            if res.get("success"):
                meeting.google_event_id = res.get("google_event_id")
                meeting.meet_link = res.get("meet_link")
                db.commit()
                db.refresh(meeting)
        except Exception as err:
            logger.error(f"[Google Sync Error] {err}")

        NotificationService.create_notification(db, client.id, "approved", "Meeting Approved! 🎉", f"Your meeting '{meeting.title}' has been confirmed for {local_start.strftime('%B %d at %I:%M %p')}.", meeting.id)

    elif req.status == "rejected":
        if meeting.google_event_id:
            try:
                CalendarService.delete_event(meeting.google_event_id)
            except Exception as e:
                logger.error(f"[Calendar Direct Delete Error] {e}")
        EmailService.send_meeting_rejected(client.email, client.name, meeting_dict, req.admin_notes or "")
        NotificationService.create_notification(db, client.id, "rejected", "Meeting Request Declined", f"Your request for '{meeting.title}' was not approved.", meeting.id)

    return {
        "success": True,
        "data": meeting_to_dict(meeting)
    }

@router.get("/meetings")
async def admin_get_all_meetings(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Meeting).filter(Meeting.deleted_at == None)
    if status:
        if status == "pending":
            q = q.filter(Meeting.status.in_(["pending", "reschedule_requested"]))
        else:
            q = q.filter(Meeting.status == status)
    meetings = q.order_by(Meeting.created_at.desc()).all()
    return {
        "success": True,
        "data": [meeting_to_dict(m) for m in meetings]
    }
