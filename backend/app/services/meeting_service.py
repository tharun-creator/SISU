import datetime
import time
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.meeting import Meeting, AvailabilitySlot, MeetingStatusLog, DateAvailabilitySignal
from app.models.user import User
from app.services.calendar_service import CalendarService
from app.core.logging import logger

IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

class MeetingService:
    @staticmethod
    def to_ist_naive(dt: datetime.datetime) -> datetime.datetime:
        if dt.tzinfo is None:
            return dt
        return dt.astimezone(IST).replace(tzinfo=None)

    @staticmethod
    def naive_to_ist_aware(dt: datetime.datetime) -> datetime.datetime:
        if dt.tzinfo is not None:
            return dt.astimezone(IST)
        return dt.replace(tzinfo=IST)

    @staticmethod
    def check_slot_available(
        db: Session,
        start: datetime.datetime,
        end: datetime.datetime,
        exclude_meeting_id: Optional[int] = None,
    ) -> bool:
        date_str = start.strftime("%Y-%m-%d")
        sig = db.query(DateAvailabilitySignal).filter(DateAvailabilitySignal.date == date_str).first()
        if sig:
            if sig.signal == "red":
                return False
            if sig.signal == "yellow" and sig.custom_slots:
                blocked_slots = sig.custom_slots.split(",")
                for bs in blocked_slots:
                    bs = bs.strip()
                    if not bs:
                        continue
                    try:
                        b_start_str, b_end_str = bs.split("-")
                        b_start = start.replace(
                            hour=int(b_start_str.split(":")[0]), 
                            minute=int(b_start_str.split(":")[1]), 
                            second=0, microsecond=0
                        )
                        b_end = start.replace(
                            hour=int(b_end_str.split(":")[0]), 
                            minute=int(b_end_str.split(":")[1]), 
                            second=0, microsecond=0
                        )
                        if start < b_end and end > b_start:
                            return False
                    except Exception as e:
                        logger.error(f"Error parsing blocked slot {bs}: {e}")

        q = db.query(Meeting).filter(
            Meeting.deleted_at == None,
            Meeting.status.in_(["pending", "approved", "rescheduled", "reschedule_proposed", "reschedule_requested"]),
            Meeting.start_time < end,
            Meeting.end_time > start,
        )
        if exclude_meeting_id:
            q = q.filter(Meeting.id != exclude_meeting_id)

        conflict = q.first()
        if conflict:
            return False
        return True

    @classmethod
    def find_next_available_slots(
        cls,
        db: Session,
        after: datetime.datetime,
        duration_minutes: int = 60,
        count: int = 3,
    ) -> List[Dict]:
        duration = datetime.timedelta(minutes=duration_minutes)
        after_naive = cls.to_ist_naive(after)

        admin_slots = (
            db.query(AvailabilitySlot)
            .filter(
                AvailabilitySlot.is_booked == False,
                AvailabilitySlot.start_time > after_naive,
            )
            .order_by(AvailabilitySlot.start_time)
            .all()
        )

        results: List[Dict] = []
        for slot in admin_slots:
            if len(results) >= count:
                break
            slot_duration = (slot.end_time - slot.start_time).total_seconds() / 60
            if int(slot_duration) == duration_minutes:
                if cls.check_slot_available(db, slot.start_time, slot.end_time):
                    results.append(cls._slot_to_dict(slot.start_time, slot.end_time))

        if not results:
            step_minutes = 30
            rem = after_naive.minute % step_minutes
            if rem == 0 and after_naive.second == 0 and after_naive.microsecond == 0:
                candidate = after_naive + datetime.timedelta(minutes=step_minutes)
            else:
                candidate = after_naive.replace(second=0, microsecond=0) + datetime.timedelta(minutes=(step_minutes - rem))
                
            limit = after_naive + datetime.timedelta(days=7)

            while candidate < limit and len(results) < count:
                if 11 <= candidate.hour < 19:
                    slot_end = candidate + duration
                    if slot_end <= candidate.replace(hour=19, minute=0, second=0, microsecond=0):
                        if cls.check_slot_available(db, candidate, slot_end):
                            results.append(cls._slot_to_dict(candidate, slot_end))
                candidate += datetime.timedelta(minutes=step_minutes)

        return results

    @staticmethod
    def _slot_to_dict(start: datetime.datetime, end: datetime.datetime) -> Dict:
        return {
            "start_time": start.strftime("%Y-%m-%dT%H:%M:%S"),
            "end_time": end.strftime("%Y-%m-%dT%H:%M:%S"),
            "display_date": start.strftime("%B %d, %Y"),
            "display_time": f"{start.strftime('%I:%M %p')} – {end.strftime('%I:%M %p')} IST",
        }

    @classmethod
    def validate_meeting_rules(
        cls,
        db: Session,
        client_id: int,
        title: str,
        description: str,
        start: datetime.datetime,
        end: datetime.datetime,
        duration_minutes: int,
        meeting_id_to_exclude: int = None
    ) -> None:
        if len(title.strip()) > 150:
            raise HTTPException(
                status_code=400,
                detail="The meeting title/agenda cannot exceed 150 characters."
            )
        if len([w for w in title.split() if w]) > 20:
            raise HTTPException(
                status_code=400,
                detail="The meeting title/agenda exceeds the 20-word limit. Please keep it to 20 words or less."
            )

        # 1b. Description word check (must be exactly 30 words)
        desc_words = [w for w in (description or "").split() if w]
        if len(desc_words) != 30:
            raise HTTPException(
                status_code=400,
                detail=f"Description must be exactly 30 words (currently {len(desc_words)} words)."
            )

        duration_secs = (end - start).total_seconds()
        if duration_secs > 7200:
            raise HTTPException(
                status_code=400,
                detail="Meeting duration cannot exceed 2 hours."
            )
        if duration_secs <= 0:
            raise HTTPException(
                status_code=400,
                detail="End time must be after start time."
            )

        if start.time() < datetime.time(11, 0) or end.time() > datetime.time(19, 0):
            raise HTTPException(
                status_code=400,
                detail="Meetings must be booked between 11:00 AM and 07:00 PM IST."
            )

        dup_query = db.query(Meeting).filter(
            Meeting.client_id == client_id,
            Meeting.start_time == start,
            Meeting.deleted_at == None
        )
        if meeting_id_to_exclude:
            dup_query = dup_query.filter(Meeting.id != meeting_id_to_exclude)
        
        user_existing = dup_query.first()
        if user_existing:
            raise HTTPException(
                status_code=400,
                detail={
                    "success": False,
                    "message": f"⚠️ This booking already exists! Booking ID: {user_existing.id}",
                    "booking_id": user_existing.id,
                    "duplicate": True,
                    "status": user_existing.status
                }
            )

        if not cls.check_slot_available(db, start, end, exclude_meeting_id=meeting_id_to_exclude):
            alternatives = cls.find_next_available_slots(
                db, start, duration_minutes=duration_minutes
            )
            raise HTTPException(
                status_code=409,
                detail={
                    "conflict": True,
                    "message": "This time slot is already booked. Please choose from the alternatives below.",
                    "alternative_slots": alternatives,
                }
            )

    @classmethod
    def handle_approved_meeting_native(
        cls,
        db: Session,
        meeting: Meeting,
        client_name: str,
        client_email: str,
    ) -> Dict:
        start_ist = cls.naive_to_ist_aware(meeting.start_time)
        end_ist = cls.naive_to_ist_aware(meeting.end_time)
        
        if meeting.google_event_id:
            cal_resp = CalendarService.update_event(
                event_id=meeting.google_event_id,
                title=meeting.title,
                description=meeting.description or "",
                start=meeting.start_time,
                end=meeting.end_time
            )
            event_id = meeting.google_event_id
            meet_link = cal_resp.get("hangoutLink") if cal_resp else None
        else:
            cal_resp = CalendarService.create_event_direct(
                title=meeting.title,
                description=meeting.description or "",
                start=meeting.start_time,
                end=meeting.end_time,
                attendees=[client_email],
                meeting_id=str(meeting.id),
                preferred_communication=meeting.preferred_communication
            )
            event_id = cal_resp.get("id") if cal_resp else None
            meet_link = cal_resp.get("hangoutLink") if cal_resp else None

        if not cal_resp:
            return {"success": False, "error": "Calendar sync failed"}

        from app.services.email_service import EmailService
        meeting_dict = {
            "title": meeting.title,
            "date": start_ist.strftime("%B %d, %Y"),
            "time": f"{start_ist.strftime('%I:%M %p')} IST",
            "type": meeting.meeting_type,
            "duration": f"{meeting.duration_minutes} mins",
            "priority": meeting.priority,
            "description": meeting.description or ""
        }
        EmailService.send_meeting_approved(client_email, client_name, meeting_dict, meet_link or "")

        return {
            "success": True,
            "google_event_id": event_id,
            "meet_link": meet_link
        }

    @staticmethod
    def mark_slot_as_booked(db: Session, start: datetime.datetime, end: datetime.datetime):
        slot = db.query(AvailabilitySlot).filter(
            AvailabilitySlot.start_time == start,
            AvailabilitySlot.end_time == end,
            AvailabilitySlot.is_booked == False
        ).first()
        if slot:
            slot.is_booked = True
            db.commit()
