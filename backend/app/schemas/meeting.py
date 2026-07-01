from typing import Optional, List
from pydantic import BaseModel
import datetime

class ChatMessage(BaseModel):
    message: str
    history: Optional[List[dict]] = None

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
    priority: Optional[str] = None

class AvailabilityCreate(BaseModel):
    start_time: str
    end_time: str
    recurring: bool = False
    day_of_week: Optional[int] = None

class RescheduleRequest(BaseModel):
    new_start_time: str
    new_end_time: str
    reason: Optional[str] = None

class DateSignalRequest(BaseModel):
    date: str  # "YYYY-MM-DD"
    signal: str  # "green" | "yellow" | "red"
    custom_slots: Optional[str] = None  # Comma-separated slots

class MeetingOut(BaseModel):
    id: int
    client_id: int
    client_name: str
    client_email: str
    client_is_priority: bool
    title: str
    description: Optional[str] = None
    reason: Optional[str] = None
    meeting_type: str
    status: str
    priority: str
    start_time: str
    end_time: str
    display_date: str
    display_time: str
    duration_minutes: int
    google_event_id: Optional[str] = None
    meet_link: Optional[str] = None
    notes: Optional[str] = None
    admin_notes: Optional[str] = None
    preferred_communication: str
    phone: Optional[str] = None
    otter_notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
