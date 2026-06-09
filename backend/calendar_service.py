"""
calendar_service.py — Google Calendar integration with conflict detection and retry logic
"""
import os
import datetime
import time
from typing import Optional
import requests

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.auth.transport.requests import Request
from dotenv import load_dotenv

load_dotenv()

SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/gmail.send"
]


def _get_service():
    """Build a Google Calendar service using stored credentials with explicit refresh."""
    token_path = 'token.json'
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    else:
        creds = Credentials(
            token=None, # Force refresh on first call
            refresh_token=os.getenv("GOOGLE_REFRESH_TOKEN"),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
            scopes=SCOPES,
        )
    
    # Explicitly refresh the token if it's invalid
    if not creds.valid:
        try:
            creds.refresh(Request())
            if os.path.exists(token_path):
                with open(token_path, 'w') as token:
                    token.write(creds.to_json())
        except Exception as e:
            print(f"[Calendar] Failed to refresh token: {e}")
            raise
            
    return build("calendar", "v3", credentials=creds)


def _retry(fn, retries: int = 3, delay: float = 1.5):
    """Exponential back-off retry wrapper."""
    for attempt in range(retries):
        try:
            return fn()
        except HttpError as e:
            if attempt == retries - 1:
                raise
            time.sleep(delay * (2 ** attempt))
        except Exception as e:
            print(f"[Calendar] Attempt {attempt + 1} failed: {e}")
            if attempt == retries - 1:
                raise
            time.sleep(delay * (2 ** attempt))


def _format_datetime(dt: datetime.datetime, timezone: str = "Asia/Kolkata") -> dict:
    """Format datetime for Google API. Forces IST context."""
    IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    else:
        dt = dt.astimezone(IST)
    return {"dateTime": dt.isoformat(), "timeZone": timezone}


def _to_rfc3339(dt: datetime.datetime) -> str:
    """Force conversion to IST and return ISO with +05:30 offset."""
    IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    else:
        dt = dt.astimezone(IST)
    # Return explicit IST ISO string
    return dt.strftime("%Y-%m-%dT%H:%M:%S+05:30")


# ── Public API ─────────────────────────────────────────────────────────────────

def create_event(
    title: str,
    description: str,
    start: datetime.datetime,
    end: datetime.datetime,
    attendees: list[str],
    meeting_id: str = None,
    attendee_name: str = "",
    preferred_communication: str = "video",
    meet_link: bool = True,
    timezone: str = "Asia/Kolkata",
) -> Optional[dict]:
    """Create an event by triggering a Zapier Webhook."""
    zapier_url = os.getenv("ZAPIER_WEBHOOK_URL")
    if not zapier_url or "YOUR_ID" in zapier_url:
        print("[Calendar] Error: ZAPIER_WEBHOOK_URL is not set or is still the default.")
        return None

    # The database stores naive IST timestamps e.g. "2026-05-27 13:00:00"
    # We build all necessary formats here so Zapier can map them correctly.
    IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

    # Attach IST offset to the naive DB timestamp
    if start.tzinfo is None:
        start_ist = start.replace(tzinfo=IST)
    else:
        start_ist = start.astimezone(IST)

    if end.tzinfo is None:
        end_ist = end.replace(tzinfo=IST)
    else:
        end_ist = end.astimezone(IST)

    # Compute UTC equivalents for Google Calendar API compatibility
    start_utc = start_ist.astimezone(datetime.timezone.utc)
    end_utc   = end_ist.astimezone(datetime.timezone.utc)

    # Prepare the payload to send to Zapier
    payload = {
        # --- IDENTITY ---
        "meeting_id":   meeting_id or ("M-" + str(int(time.time()))[-6:]),

        # --- CONTENT ---
        "title":       title,
        "description": description,

        # --- PRIMARY TIME FIELDS (use these in your Zap) ---
        # Map "Start Date & Time" → start_datetime_ist
        # Map "Start Time Zone"   → timezone  (Asia/Kolkata)
        "start_datetime_ist": start_ist.strftime("%Y-%m-%dT%H:%M:%S"),  # e.g. 2026-05-27T13:00:00
        "end_datetime_ist":   end_ist.strftime("%Y-%m-%dT%H:%M:%S"),
        "timezone":           "Asia/Kolkata",

        # --- FALLBACK FIELDS ---
        # ISO strings with +05:30 offset (if Zapier honours the offset)
        "start_time_with_offset": start_ist.strftime("%Y-%m-%dT%H:%M:%S+05:30"),
        "end_time_with_offset":   end_ist.strftime("%Y-%m-%dT%H:%M:%S+05:30"),

        # UTC equivalents (in case Google Calendar needs UTC)
        "start_time_utc": start_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "end_time_utc":   end_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),

        # Human-readable strings (for email / description use)
        "display_date": start_ist.strftime("%B %d, %Y"),
        "display_time": start_ist.strftime("%I:%M %p IST"),

        # --- ATTENDEE ---
        "attendee_email":            attendees[0] if attendees else "",
        "attendee_name":             attendee_name,
        "preferred_communication":   preferred_communication,
    }

    try:
        print(f"[Calendar] Sending event '{title}' to Zapier...")
        print(f"           DB time     : {start.strftime('%Y-%m-%d %H:%M:%S')} (naive IST from DB)")
        print(f"           IST time    : {start_ist.strftime('%Y-%m-%dT%H:%M:%S+05:30')}")
        print(f"           UTC time    : {start_utc.strftime('%Y-%m-%dT%H:%M:%SZ')}")
        response = requests.post(zapier_url, json=payload)
        
        if response.status_code == 200:
            print("[Calendar] Successfully triggered Zapier to create the event and send emails!")
            return {"id": "zapier_generated_event", "status": "success"}
        else:
            print(f"[Calendar] Zapier Webhook failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"[Calendar] Failed to call Zapier API: {e}")
        return None


def create_event_direct(
    title: str,
    description: str,
    start: datetime.datetime,
    end: datetime.datetime,
    attendees: list[str],
    meeting_id: str = None,
    preferred_communication: str = "video",
    timezone: str = "Asia/Kolkata",
) -> Optional[dict]:
    """Create an event directly in the Google Calendar using the Google API."""
    try:
        service = _get_service()
        
        # Add default admin guest
        admin_email = "tharunriot@gmail.com"
        guests = list(set(attendees + [admin_email]))
        
        event_body = {
            "summary": title,
            "description": description,
            "start": _format_datetime(start, timezone),
            "end": _format_datetime(end, timezone),
            "attendees": [{"email": email} for email in guests],
        }

        # Set location in Google Calendar event
        if preferred_communication.startswith("custom_location:"):
            event_body["location"] = preferred_communication.replace("custom_location:", "").strip()
        elif preferred_communication == "in_person":
            event_body["location"] = "Spi Edge Office"
        
        if preferred_communication == "video":
            event_body["conferenceData"] = {
                "createRequest": {
                    "requestId": f"meet-{meeting_id or int(time.time())}",
                    "conferenceSolutionKey": {
                        "type": "hangoutsMeet"
                    }
                }
            }
            
        def _insert():
            return service.events().insert(
                calendarId="primary",
                body=event_body,
                conferenceDataVersion=1 if preferred_communication == "video" else 0,
                sendUpdates="all"
            ).execute()
            
        event = _retry(_insert)
        print(f"[Calendar] Event created directly: {event.get('id')}")
        return event
    except Exception as e:
        print(f"[Calendar] create_event_direct failed: {e}")
        return None


def update_event(
    event_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    start: Optional[datetime.datetime] = None,
    end: Optional[datetime.datetime] = None,
    timezone: str = "Asia/Kolkata",
) -> Optional[dict]:
    """Patch an existing Google Calendar event."""
    try:
        service = _get_service()

        def _get():
            return service.events().get(calendarId="primary", eventId=event_id).execute()

        existing = _retry(_get)
        if title:
            existing["summary"] = title
        if description:
            existing["description"] = description
        if start:
            existing["start"] = _format_datetime(start, timezone)
        if end:
            existing["end"] = _format_datetime(end, timezone)

        def _update():
            return service.events().update(
                calendarId="primary", eventId=event_id, body=existing, sendUpdates="all"
            ).execute()

        event = _retry(_update)
        print(f"[Calendar] Event updated: {event_id}")
        return event
    except Exception as e:
        print(f"[Calendar] update_event failed: {e}")
        return None


def delete_event(event_id: str) -> bool:
    """Delete a Google Calendar event."""
    try:
        service = _get_service()

        def _delete():
            service.events().delete(calendarId="primary", eventId=event_id, sendUpdates="all").execute()

        _retry(_delete)
        print(f"[Calendar] Event deleted: {event_id}")
        return True
    except Exception as e:
        print(f"[Calendar] delete_event failed: {e}")
        return False


def check_conflicts(
    start: datetime.datetime,
    end: datetime.datetime,
    timezone: str = "Asia/Kolkata",
) -> bool:
    """Returns True if there is a conflict in the given time range."""
    try:
        # Asia/Kolkata offset
        IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
        if start.tzinfo is not None: start = start.astimezone(IST)
        else: start = start.replace(tzinfo=IST)
        
        if end.tzinfo is not None: end = end.astimezone(IST)
        else: end = end.replace(tzinfo=IST)
        
        service = _get_service()

        def _list():
            return service.events().list(
                calendarId="primary",
                timeMin=_to_rfc3339(start),
                timeMax=_to_rfc3339(end),
                singleEvents=True,
                orderBy="startTime",
            ).execute()

        result = _retry(_list)
        items = result.get("items", [])
        return len(items) > 0
    except Exception as e:
        print(f"[Calendar] check_conflicts failed: {e}")
        return False


def get_free_slots(
    date: datetime.datetime,
    duration_minutes: int = 60,
    timezone: str = "Asia/Kolkata",
) -> list[dict]:
    """Return available time slots on a given date."""
    try:
        # Asia/Kolkata offset
        IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
        
        # Convert date to IST context and strip tzinfo to avoid timezone shifts
        if date.tzinfo is not None:
            date = date.astimezone(IST).replace(tzinfo=None)
            
        # Ensure input date is treated as local date boundaries in IST
        day_start = date.replace(hour=10, minute=0, second=0, microsecond=0).replace(tzinfo=IST)
        day_end = date.replace(hour=20, minute=0, second=0, microsecond=0).replace(tzinfo=IST)

        service = _get_service()

        def _list():
            return service.events().list(
                calendarId="primary",
                timeMin=_to_rfc3339(day_start),
                timeMax=_to_rfc3339(day_end),
                singleEvents=True,
                orderBy="startTime",
            ).execute()

        result = _retry(_list)
        busy_times = [
            (
                datetime.datetime.fromisoformat(e["start"]["dateTime"].replace("Z", "+00:00")),
                datetime.datetime.fromisoformat(e["end"]["dateTime"].replace("Z", "+00:00")),
            )
            for e in result.get("items", [])
            if "dateTime" in e.get("start", {})
        ]

        # Generate slots
        slots = []
        current = day_start
        while current + datetime.timedelta(minutes=duration_minutes) <= day_end:
            slot_end = current + datetime.timedelta(minutes=duration_minutes)
            conflict = any(
                not (slot_end <= b_start or current >= b_end)
                for b_start, b_end in busy_times
            )
            if not conflict:
                slots.append({
                    "start": current.strftime("%H:%M"),
                    "end": slot_end.strftime("%H:%M"),
                    "label": f"{current.strftime('%I:%M %p')} - {slot_end.strftime('%I:%M %p')} IST",
                })
            current += datetime.timedelta(minutes=30)

        return slots
    except Exception as e:
        print(f"[Calendar] get_free_slots failed: {e}")
        # Return default slots as fallback
        slots = []
        IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
        if date.tzinfo is not None:
            date = date.astimezone(IST).replace(tzinfo=None)
        c = date.replace(hour=10, minute=0, second=0, microsecond=0)
        end_time = date.replace(hour=20, minute=0, second=0, microsecond=0)
        while c + datetime.timedelta(minutes=duration_minutes) <= end_time:
            se = c + datetime.timedelta(minutes=duration_minutes)
            slots.append({
                "start": c.strftime("%H:%M"),
                "end": se.strftime("%H:%M"),
                "label": f"{c.strftime('%I:%M %p')} - {se.strftime('%I:%M %p')} IST",
            })
            c += datetime.timedelta(minutes=30)
        return slots
