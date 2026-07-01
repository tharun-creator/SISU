import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
from database import Meeting
import meeting_booking_service

class MeetingService:
    @staticmethod
    def validate_meeting_rules(
        db: Session,
        client_id: int,
        title: str,
        start: datetime.datetime,
        end: datetime.datetime,
        duration_minutes: int,
        meeting_id_to_exclude: int = None
    ) -> None:
        """Validates Sisu booking rules (agenda limits, duration, working hours, duplication, and conflicts)."""
        # 1. Agenda word and character limit checks
        if len(title.strip()) > 150:
            raise HTTPException(
                status_code=400,
                detail="The meeting title/agenda cannot exceed 150 characters."
            )
        if len([w for w in title.split() if w]) > 30:
            raise HTTPException(
                status_code=400,
                detail="The meeting title/agenda exceeds the 30-word limit. Please keep it to 30 words or less."
            )

        # 2. Duration limit check (max 2 hours / 120 minutes)
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

        # 3. Working hours check (11:00 AM - 07:00 PM IST)
        if start.time() < datetime.time(11, 0) or end.time() > datetime.time(19, 0):
            raise HTTPException(
                status_code=400,
                detail="Meetings must be booked between 11:00 AM and 07:00 PM IST."
            )

        # 4. Duplicate check for this user
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

        # 5. Global conflict check for the requested slot
        conflict_query = db.query(Meeting).filter(
            Meeting.start_time < end,
            Meeting.end_time > start,
            Meeting.deleted_at == None,
            Meeting.status.in_(["pending", "approved", "rescheduled", "reschedule_proposed", "reschedule_requested"])
        )
        if meeting_id_to_exclude:
            conflict_query = conflict_query.filter(Meeting.id != meeting_id_to_exclude)

        global_conflict = conflict_query.first()
        if global_conflict:
            # Find alternative slots
            alternatives = meeting_booking_service.find_next_available_slots(
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
