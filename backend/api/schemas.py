from pydantic import BaseModel
from typing import List, Optional

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

class ForgotPasswordRequest(BaseModel):
    email: str
    captcha_id: Optional[str] = None
    captcha_answer: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    token: str
    password: str
    captcha_id: Optional[str] = None
    captcha_answer: Optional[str] = None

class CaptchaResponse(BaseModel):
    captcha_id: str
    question: str

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


class NoteCreate(BaseModel):
    title: str
    content: Optional[str] = None
    meeting_id: Optional[int] = None


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    meeting_id: Optional[int] = None
    is_shared: Optional[bool] = None


class NoteOut(BaseModel):
    id: int
    user_id: int
    meeting_id: Optional[int] = None
    title: str
    content: Optional[str] = None
    photo_url: Optional[str] = None
    is_shared: bool = False
    share_token: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


