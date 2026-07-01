import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.meeting import AvailabilitySlot, DateAvailabilitySignal, Meeting
from app.models.user import User
from app.dependencies import require_admin, get_current_user
from app.services.calendar_service import CalendarService
from app.schemas.meeting import AvailabilityCreate
from app.api.helpers import parse_dt_to_ist, to_local, IST

router = APIRouter(prefix="/availability", tags=["Availability"])

@router.get("")
async def get_availability(db: Session = Depends(get_db)):
    slots = db.query(AvailabilitySlot).filter(AvailabilitySlot.is_booked == False).all()
    return {
        "success": True,
        "data": [
            {
                "id": s.id,
                "start_time": s.start_time.isoformat(),
                "end_time": s.end_time.isoformat(),
                "recurring": s.recurring,
                "day_of_week": s.day_of_week,
            }
            for s in slots
        ]
    }

@router.post("")
async def create_availability(req: AvailabilityCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    slot = AvailabilitySlot(
        start_time=parse_dt_to_ist(req.start_time),
        end_time=parse_dt_to_ist(req.end_time),
        recurring=req.recurring,
        day_of_week=req.day_of_week,
    )
    db.add(slot)
    db.commit()
    return {
        "success": True,
        "data": {"message": "Slot created"}
    }

@router.put("/{slot_id}")
async def update_availability(slot_id: int, req: AvailabilityCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    slot = db.query(AvailabilitySlot).filter(AvailabilitySlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    slot.start_time = parse_dt_to_ist(req.start_time)
    slot.end_time = parse_dt_to_ist(req.end_time)
    slot.recurring = req.recurring
    slot.day_of_week = req.day_of_week
    db.commit()
    return {
        "success": True,
        "data": {"message": "Slot updated", "id": slot.id}
    }

@router.delete("/{slot_id}")
async def delete_availability(slot_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    slot = db.query(AvailabilitySlot).filter(AvailabilitySlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    db.delete(slot)
    db.commit()
    return {
        "success": True,
        "data": {"message": "Slot deleted"}
    }

@router.get("/free-slots")
async def get_free_slots(date: str, duration: int = 60, db: Session = Depends(get_db)):
    dt_str = date.split('T')[0]
    sig = db.query(DateAvailabilitySignal).filter(DateAvailabilitySignal.date == dt_str).first()
    
    if sig and sig.signal == "red":
        return {
            "success": True,
            "data": []
        }

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
        slots = CalendarService.get_free_slots(dt, duration)
    except Exception:
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
        except Exception:
            available_slots.append(slot)
            
    return {
        "success": True,
        "data": available_slots
    }

@router.get("/calendar-signals")
async def get_calendar_signals(month: Optional[int] = None, year: Optional[int] = None, db: Session = Depends(get_db)):
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
        "success": True,
        "data": {
            s.date: {
                "signal": s.signal,
                "custom_slots": s.custom_slots.split(",") if s.custom_slots else []
            }
            for s in signals
        }
    }
