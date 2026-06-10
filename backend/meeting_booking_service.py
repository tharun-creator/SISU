"""
meeting_booking_service.py
Database-driven meeting booking with IST-aware timezone handling,
conflict detection, and Zapier integration.

Works with the existing SQLAlchemy models in database.py.
All times stored as naive IST datetimes in the DB (e.g. 2026-05-27 13:00:00).
"""
import os
import json
import time
import datetime
import logging
import requests
from typing import Optional, List, Dict

import google_integration
from sqlalchemy.orm import Session
from database import Meeting, AvailabilitySlot, MeetingStatusLog, Notification

logger = logging.getLogger("sisu-booking")

IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))


# ── Timezone helpers ───────────────────────────────────────────────────────────

def _to_ist_naive(dt: datetime.datetime) -> datetime.datetime:
    """Return a naive IST datetime, regardless of input timezone."""
    if dt.tzinfo is None:
        return dt  # Already treated as IST in this project
    return dt.astimezone(IST).replace(tzinfo=None)


def _naive_to_ist_aware(dt: datetime.datetime) -> datetime.datetime:
    """Attach IST offset to a naive datetime."""
    if dt.tzinfo is not None:
        return dt.astimezone(IST)
    return dt.replace(tzinfo=IST)


def _ist_to_utc(dt: datetime.datetime) -> datetime.datetime:
    """Convert naive IST to UTC."""
    aware = _naive_to_ist_aware(dt)
    return aware.astimezone(datetime.timezone.utc)


def format_datetime_for_google_calendar(iso_datetime_str: str, target_timezone="Asia/Kolkata") -> str:
    """
    Convert ISO 8601 datetime string to Google Calendar compatible format
    
    Input: "2025-05-15T14:00:00+05:30" or "2025-05-15T14:00:00"
    Output: "2025-05-15T14:00:00" (Google Calendar will respect the timezone)
    """
    try:
        # Handle 'Z' suffix
        s = iso_datetime_str.replace("Z", "+00:00")
        dt = datetime.datetime.fromisoformat(s)
        
        # We use the IST constant defined above (which matches Asia/Kolkata)
        if dt.tzinfo is not None:
            dt_local = dt.astimezone(IST)
        else:
            # If naive, we assume it's already in the target timezone (IST)
            dt_local = dt
            
        # Return in ISO format without timezone (Google Calendar will use calendar's timezone)
        return dt_local.strftime("%Y-%m-%dT%H:%M:%S")
    except Exception as e:
        logger.error(f"Error formatting datetime: {e}")
        return iso_datetime_str


# ── Conflict Detection ─────────────────────────────────────────────────────────

def check_slot_available(
    db: Session,
    start: datetime.datetime,
    end: datetime.datetime,
    exclude_meeting_id: Optional[int] = None,
) -> bool:
    """
    Return True if [start, end) has no approved/pending meetings in the DB
    and is not blocked by admin DateAvailabilitySignal.
    Both start & end must be naive IST datetimes (as stored in the DB).
    """
    from database import DateAvailabilitySignal
    
    # 1. Check Admin Availability Signals
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
                    # If the candidate slot overlaps with the blocked slot
                    if start < b_end and end > b_start:
                        return False
                except Exception as e:
                    logger.error(f"Error parsing blocked slot {bs}: {e}")

    # 2. Check Database Meetings
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
        logger.warning(
            f"[BookingService] Conflict: slot {start}–{end} overlaps "
            f"meeting #{conflict.id} ({conflict.start_time}–{conflict.end_time})"
        )
        return False
    return True


# ── Alternative Slot Finder ────────────────────────────────────────────────────

def find_next_available_slots(
    db: Session,
    after: datetime.datetime,
    duration_minutes: int = 60,
    count: int = 3,
) -> List[Dict]:
    """
    Query the availability_slots table for the next `count` free admin-managed
    slots after `after` (naive IST). Falls back to generating hourly slots from
    10:00–20:00 if no admin slots are configured.
    """
    duration = datetime.timedelta(minutes=duration_minutes)

    # Fetch admin-published slots
    admin_slots = (
        db.query(AvailabilitySlot)
        .filter(
            AvailabilitySlot.is_booked == False,
            AvailabilitySlot.start_time > after,
        )
        .order_by(AvailabilitySlot.start_time)
        .all()
    )

    results: List[Dict] = []
    for slot in admin_slots:
        if len(results) >= count:
            break
            
        # Ensure the slot exactly matches the requested duration
        slot_duration = (slot.end_time - slot.start_time).total_seconds() / 60
        if int(slot_duration) == duration_minutes:
            if check_slot_available(db, slot.start_time, slot.end_time):
                results.append(_slot_to_dict(slot.start_time, slot.end_time))

    # Fallback: generate synthetic slots if admin hasn't configured any
    if not results:
        logger.info("[BookingService] No admin slots found – generating fallback slots")
        
        # Step by 30 minutes always to support overlapping slots
        step_minutes = 30
        rem = after.minute % step_minutes
        
        if rem == 0 and after.second == 0 and after.microsecond == 0:
            candidate = after + datetime.timedelta(minutes=step_minutes)
        else:
            candidate = after.replace(second=0, microsecond=0) + datetime.timedelta(minutes=(step_minutes - rem))
            
        limit = after + datetime.timedelta(days=7)

        while candidate < limit and len(results) < count:
            # Working hours: 11:00–19:00 IST
            if 11 <= candidate.hour < 19:
                slot_end = candidate + duration
                if slot_end <= candidate.replace(hour=19, minute=0, second=0, microsecond=0):
                    if check_slot_available(db, candidate, slot_end):
                        results.append(_slot_to_dict(candidate, slot_end))
            candidate += datetime.timedelta(minutes=step_minutes)

    return results



def _slot_to_dict(start: datetime.datetime, end: datetime.datetime) -> Dict:
    return {
        "start_time": start.strftime("%Y-%m-%dT%H:%M:%S"),  # Naive IST string
        "end_time": end.strftime("%Y-%m-%dT%H:%M:%S"),
        "display_date": start.strftime("%B %d, %Y"),
        "display_time": f"{start.strftime('%I:%M %p')} – {end.strftime('%I:%M %p')} IST",
    }


# ── Zapier Payload Builder ─────────────────────────────────────────────────────

def build_zapier_payload(
    meeting: Meeting,
    client_name: str,
    client_email: str,
) -> Dict:
    """
    Build the Zapier payload from the **database record** (naive IST datetimes).

    Fields:
    - start_datetime_ist / end_datetime_ist: Use for "Start Date & Time" in Zap
    - timezone: Map to "Start Time Zone" in Zap → "Asia/Kolkata"
    - start_time_with_offset: ISO with +05:30 (fallback)
    - start_time_utc: Pure UTC (fallback)
    """
    start_db = meeting.start_time  # Naive IST from DB e.g. 2026-05-27 13:00:00
    # Use meeting's actual duration (default to 60 if not set)
    duration = meeting.duration_minutes or 60
    end_db = start_db + datetime.timedelta(minutes=duration)

    start_ist = _naive_to_ist_aware(start_db)
    end_ist = _naive_to_ist_aware(end_db)
    start_utc = _ist_to_utc(start_db)
    end_utc = _ist_to_utc(end_db)

    logger.info(
        f"[BookingService] Building Zapier payload for meeting #{meeting.id}\n"
        f"  DB (naive IST) : {start_db}\n"
        f"  IST (aware)    : {start_ist.strftime('%Y-%m-%dT%H:%M:%S+05:30')}\n"
        f"  UTC            : {start_utc.strftime('%Y-%m-%dT%H:%M:%SZ')}"
    )

    return {
        # ── EXACT BACKEND REQUIREMENTS ──────────────────────────────────────
        "title": meeting.title,
        "description": meeting.description or "",
        "start_time": start_ist.strftime("%Y-%m-%dT%H:%M:%S+05:30"),
        "end_time": end_ist.strftime("%Y-%m-%dT%H:%M:%S+05:30"),
        "clientName": client_name,
        "email": client_email,
        "bookingId": f"SISU-{meeting.id:03d}",
        "google_meet": True if meeting.preferred_communication == "video" else False,

        # ── Fallbacks & Legacy Fields ───────────────────────────────────────
        "meeting_id": str(meeting.id),
        "meeting_type": meeting.meeting_type,
        "start_datetime_ist": start_ist.strftime("%Y-%m-%dT%H:%M:%S"),
        "end_datetime_ist": end_ist.strftime("%Y-%m-%dT%H:%M:%S"),
        "duration_minutes": duration,
        "timezone": "Asia/Kolkata",

        # ── Fallbacks ───────────────────────────────────────────────────────
        "start_time_with_offset": start_ist.strftime("%Y-%m-%dT%H:%M:%S+05:30"),
        "end_time_with_offset": end_ist.strftime("%Y-%m-%dT%H:%M:%S+05:30"),
        "start_time_utc": start_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "end_time_utc": end_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),

        # ── Human-readable ──────────────────────────────────────────────────
        "display_date": start_ist.strftime("%B %d, %Y"),
        "display_time": start_ist.strftime("%I:%M %p IST"),
        "created_at": meeting.created_at.strftime("%Y-%m-%dT%H:%M:%S") if meeting.created_at else None,
        "zapier_formatted_datetime": f"{start_ist.strftime('%b %d, %Y')} at {start_ist.strftime('%I:%M%p')}",

        # ── HIGH COMPATIBILITY (ISO with Offset) ───────────────────────────
        "start_time_full": start_ist.strftime("%Y-%m-%dT%H:%M:%S+05:30"),
        "end_time_full": end_ist.strftime("%Y-%m-%dT%H:%M:%S+05:30"),

        # ── Attendee ────────────────────────────────────────────────────────
        "attendee_email": client_email,
        "attendee_name": client_name,
        "preferred_communication": meeting.preferred_communication or "video",
    }


# ── Zapier Webhook Trigger ─────────────────────────────────────────────────────

def handle_approved_meeting_native(
    meeting: Meeting,
    client_name: str,
    client_email: str,
) -> Dict:
    """
    Directly creates a Google Calendar event and sends the custom Gmail confirmation.
    Replaces Zapier webhook logic.
    """
    logger.info(f"[BookingService] Starting native Google Integration for meeting #{meeting.id}")
    
    start_ist = _naive_to_ist_aware(meeting.start_time)
    duration = meeting.duration_minutes or 60
    end_ist = _naive_to_ist_aware(meeting.start_time + datetime.timedelta(minutes=duration))
    
    start_iso = start_ist.strftime("%Y-%m-%dT%H:%M:%S+05:30")
    end_iso = end_ist.strftime("%Y-%m-%dT%H:%M:%S+05:30")
    
    if meeting.google_event_id:
        logger.info(f"[BookingService] Meeting #{meeting.id} has existing Google Event ID: {meeting.google_event_id}. Updating event.")
        cal_resp = google_integration.update_calendar_event(
            event_id=meeting.google_event_id,
            title=meeting.title,
            description=meeting.description or "",
            start_iso=start_iso,
            end_iso=end_iso
        )
    else:
        logger.info(f"[BookingService] Creating new calendar event.")
        cal_resp = google_integration.create_calendar_event(
            title=meeting.title,
            description=meeting.description or "",
            start_iso=start_iso,
            end_iso=end_iso,
            attendee_email=client_email,
            attendee_name=client_name
        )
    
    if not cal_resp.get("success"):
        logger.error(f"[BookingService] Calendar event integration failed: {cal_resp.get('error')}")
        return {"success": False, "error": cal_resp.get("error")}
        
    logger.info(f"[BookingService] Calendar event synced successfully.")
    
    mail_resp = google_integration.send_gmail_confirmation(
        title=meeting.title,
        description=meeting.description or "",
        attendee_email=client_email,
        attendee_name=client_name,
        meet_link=cal_resp.get("meet_link") or "",
        calendar_link=cal_resp.get("calendar_link") or ""
    )
    
    if not mail_resp.get("success"):
        logger.error(f"[BookingService] Gmail confirmation failed: {mail_resp.get('error')}")
    else:
        logger.info(f"[BookingService] Gmail confirmation sent successfully.")

    return {
        "success": True, 
        "status_code": 200,
        "google_event_id": cal_resp.get("event_id"),
        "meet_link": cal_resp.get("meet_link")
    }


# ── Slot Management ────────────────────────────────────────────────────────────

def mark_slot_as_booked(db: Session, start: datetime.datetime, end: datetime.datetime):
    """Mark the availability slot matching this time as booked."""
    slot = db.query(AvailabilitySlot).filter(
        AvailabilitySlot.start_time == start,
        AvailabilitySlot.end_time == end,
        AvailabilitySlot.is_booked == False
    ).first()
    if slot:
        slot.is_booked = True
        db.commit()
        logger.info(f"[BookingService] Marked slot {start} as booked")


def trigger_zapier_cancellation(meeting_id: int, google_event_id: str, title: str, client_email: str):
    """Notify Zapier that a meeting has been cancelled. RETIRED: No-op."""
    return


# ── Audit Log Helper ───────────────────────────────────────────────────────────

def log_booking_action(
    db: Session,
    meeting_id: int,
    old_status: Optional[str],
    new_status: str,
    changed_by: str,
    note: Optional[str] = None,
):
    entry = MeetingStatusLog(
        meeting_id=meeting_id,
        old_status=old_status,
        new_status=new_status,
        changed_by=changed_by,
        note=note,
    )
    db.add(entry)
    db.commit()
