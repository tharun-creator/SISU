import os
import datetime
import time
from typing import Optional, List, Dict, Any
import requests
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.auth.transport.requests import Request
from app.config import settings
from app.core.logging import logger

SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/gmail.send"
]

def get_google_credentials() -> Optional[Credentials]:
    creds = None
    token_path = 'token.json'
    if os.path.exists(token_path):
        try:
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        except Exception as e:
            logger.warning(f"[Google API] Failed to load token.json: {e}")
            creds = None

    if not creds:
        refresh_token = settings.GOOGLE_REFRESH_TOKEN
        client_id = settings.GOOGLE_CLIENT_ID
        client_secret = settings.GOOGLE_CLIENT_SECRET
        
        if refresh_token and client_id and client_secret:
            try:
                creds = Credentials(
                    token=None,
                    refresh_token=refresh_token,
                    token_uri="https://oauth2.googleapis.com/token",
                    client_id=client_id,
                    client_secret=client_secret,
                    scopes=SCOPES,
                )
            except Exception as e:
                logger.error(f"[Google API] Failed to create credentials from env vars: {e}")
                return None
        else:
            return None

    if not creds.valid:
        if creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                if os.path.exists(token_path):
                    with open(token_path, 'w') as token:
                        token.write(creds.to_json())
            except Exception as e:
                logger.error(f"[Google API] Token refresh failed: {e}")
                return None
        elif creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                logger.error(f"[Google API] Initial refresh failed: {e}")
                return None
        else:
            return None
            
    return creds

def _get_service():
    creds = get_google_credentials()
    if not creds:
        return None
    return build("calendar", "v3", credentials=creds)

def _retry(fn, retries: int = 3, delay: float = 1.5):
    for attempt in range(retries):
        try:
            return fn()
        except HttpError as e:
            if attempt == retries - 1:
                raise
            time.sleep(delay * (2 ** attempt))
        except Exception as e:
            if attempt == retries - 1:
                raise
            time.sleep(delay * (2 ** attempt))

def _format_datetime(dt: datetime.datetime, timezone: str = "Asia/Kolkata") -> dict:
    IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    else:
        dt = dt.astimezone(IST)
    return {"dateTime": dt.isoformat(), "timeZone": timezone}

def _to_rfc3339(dt: datetime.datetime) -> str:
    IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    else:
        dt = dt.astimezone(IST)
    return dt.strftime("%Y-%m-%dT%H:%M:%S+05:30")


class CalendarService:
    @staticmethod
    def create_event(
        title: str,
        description: str,
        start: datetime.datetime,
        end: datetime.datetime,
        attendees: List[str],
        meeting_id: str = None,
        attendee_name: str = "",
        preferred_communication: str = "video",
        meet_link: bool = True,
        timezone: str = "Asia/Kolkata",
    ) -> Optional[dict]:
        zapier_url = settings.ZAPIER_WEBHOOK_URL
        if not zapier_url:
            logger.warning("[Calendar] ZAPIER_WEBHOOK_URL not configured. Trying direct.")
            return CalendarService.create_event_direct(
                title, description, start, end, attendees, meeting_id, preferred_communication, timezone
            )

        IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
        start_ist = start.replace(tzinfo=IST) if start.tzinfo is None else start.astimezone(IST)
        end_ist = end.replace(tzinfo=IST) if end.tzinfo is None else end.astimezone(IST)
        
        start_utc = start_ist.astimezone(datetime.timezone.utc)
        end_utc   = end_ist.astimezone(datetime.timezone.utc)

        payload = {
            "meeting_id": meeting_id or f"M-{int(time.time())}",
            "title": title,
            "description": description,
            "start_datetime_ist": start_ist.strftime("%Y-%m-%dT%H:%M:%S"),
            "end_datetime_ist": end_ist.strftime("%Y-%m-%dT%H:%M:%S"),
            "timezone": "Asia/Kolkata",
            "start_time_with_offset": start_ist.strftime("%Y-%m-%dT%H:%M:%S+05:30"),
            "end_time_with_offset": end_ist.strftime("%Y-%m-%dT%H:%M:%S+05:30"),
            "start_time_utc": start_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "end_time_utc": end_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "display_date": start_ist.strftime("%B %d, %Y"),
            "display_time": start_ist.strftime("%I:%M %p IST"),
            "attendee_email": attendees[0] if attendees else "",
            "attendee_name": attendee_name,
            "preferred_communication": preferred_communication,
        }

        try:
            res = requests.post(zapier_url, json=payload, timeout=10)
            if res.status_code == 200:
                return {"id": f"zapier-{int(time.time())}", "status": "success"}
            return None
        except Exception as e:
            logger.error(f"[Calendar] Zapier webhook request failed: {e}")
            return None

    @staticmethod
    def create_event_direct(
        title: str,
        description: str,
        start: datetime.datetime,
        end: datetime.datetime,
        attendees: List[str],
        meeting_id: str = None,
        preferred_communication: str = "video",
        timezone: str = "Asia/Kolkata",
    ) -> Optional[dict]:
        service = _get_service()
        if not service:
            logger.warning("[Calendar Dev Mode] Google credentials not loaded. Logging instead.")
            return {
                "id": f"mock-{int(time.time())}",
                "htmlLink": "https://calendar.google.com",
                "hangoutLink": "https://meet.google.com/mock-meet"
            }

        try:
            admin_email = "tharunriot@gmail.com"
            guests = list(set(attendees + [admin_email]))
            
            event_body = {
                "summary": title,
                "description": description,
                "start": _format_datetime(start, timezone),
                "end": _format_datetime(end, timezone),
                "attendees": [{"email": email} for email in guests],
            }

            if preferred_communication.startswith("custom_location:"):
                event_body["location"] = preferred_communication.replace("custom_location:", "").strip()
            elif preferred_communication == "in_person":
                event_body["location"] = "Spi Edge Office"
            
            if preferred_communication == "video":
                event_body["conferenceData"] = {
                    "createRequest": {
                        "requestId": f"meet-{meeting_id or int(time.time())}",
                        "conferenceSolutionKey": {"type": "hangoutsMeet"}
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
            return event
        except Exception as e:
            logger.error(f"[Calendar] Direct create_event failed: {e}")
            return None

    @staticmethod
    def update_event(
        event_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        start: Optional[datetime.datetime] = None,
        end: Optional[datetime.datetime] = None,
        timezone: str = "Asia/Kolkata",
    ) -> Optional[dict]:
        service = _get_service()
        if not service:
            logger.warning("[Calendar Dev Mode] Google credentials not loaded. Logging update.")
            return {"id": event_id}

        try:
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
            return event
        except Exception as e:
            logger.error(f"[Calendar] update_event failed: {e}")
            return None

    @staticmethod
    def delete_event(event_id: str) -> bool:
        service = _get_service()
        if not service:
            return True
        try:
            def _delete():
                service.events().delete(calendarId="primary", eventId=event_id, sendUpdates="all").execute()
            _retry(_delete)
            return True
        except Exception as e:
            logger.error(f"[Calendar] delete_event failed: {e}")
            return False

    @staticmethod
    def check_conflicts(
        start: datetime.datetime,
        end: datetime.datetime,
        timezone: str = "Asia/Kolkata",
    ) -> bool:
        service = _get_service()
        if not service:
            return False
        try:
            IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
            start_ist = start.replace(tzinfo=IST) if start.tzinfo is None else start.astimezone(IST)
            end_ist = end.replace(tzinfo=IST) if end.tzinfo is None else end.astimezone(IST)

            def _list():
                return service.events().list(
                    calendarId="primary",
                    timeMin=_to_rfc3339(start_ist),
                    timeMax=_to_rfc3339(end_ist),
                    singleEvents=True,
                    orderBy="startTime",
                ).execute()

            result = _retry(_list)
            items = result.get("items", [])
            return len(items) > 0
        except Exception as e:
            logger.error(f"[Calendar] check_conflicts failed: {e}")
            return False

    @staticmethod
    def get_free_slots(
        date: datetime.datetime,
        duration_minutes: int = 60,
        timezone: str = "Asia/Kolkata",
    ) -> list[dict]:
        # Return fallback slots if Google API is not ready
        slots = []
        IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
        date_ist = date.astimezone(IST).replace(tzinfo=None) if date.tzinfo is not None else date
        
        service = _get_service()
        if not service:
            c = date_ist.replace(hour=11, minute=0, second=0, microsecond=0)
            end_time = date_ist.replace(hour=19, minute=0, second=0, microsecond=0)
            while c + datetime.timedelta(minutes=duration_minutes) <= end_time:
                se = c + datetime.timedelta(minutes=duration_minutes)
                slots.append({
                    "start": c.strftime("%H:%M"),
                    "end": se.strftime("%H:%M"),
                    "label": f"{c.strftime('%I:%M %p')} - {se.strftime('%I:%M %p')} IST",
                })
                c += datetime.timedelta(minutes=30)
            return slots

        try:
            day_start = date_ist.replace(hour=11, minute=0, second=0, microsecond=0).replace(tzinfo=IST)
            day_end = date_ist.replace(hour=19, minute=0, second=0, microsecond=0).replace(tzinfo=IST)

            def _list():
                return service.events().list(
                    calendarId="primary",
                    timeMin=_to_rfc3339(day_start),
                    timeMax=_to_rfc3339(day_end),
                    singleEvents=True,
                    orderBy="startTime",
                ).execute()

            result = _retry(_list)
            busy_times = []
            for e in result.get("items", []):
                if "dateTime" in e.get("start", {}):
                    busy_times.append((
                        datetime.datetime.fromisoformat(e["start"]["dateTime"].replace("Z", "+00:00")),
                        datetime.datetime.fromisoformat(e["end"]["dateTime"].replace("Z", "+00:00")),
                    ))

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
            logger.error(f"[Calendar] get_free_slots exception: {e}")
            return slots
