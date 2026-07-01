from app.schemas.common import SuccessResponse, ErrorResponse, ResponseMeta, ErrorDetails
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse, ForgotPasswordRequest, 
    ResetPasswordRequest, ChangePasswordRequest, EmailVerificationRequest,
    UpdateProfileRequest
)
from app.schemas.user import UserBase, UserCreate, UserUpdate, UserOut
from app.schemas.meeting import (
    ChatMessage, ChatResponse, BookingCreate, BookingOut, 
    ScheduleMeetingRequest, MeetingCreate, MeetingUpdate, MeetingStatusUpdate, 
    AvailabilityCreate, RescheduleRequest, DateSignalRequest, MeetingOut
)
from app.schemas.note import NoteCreate, NoteUpdate, NoteOut
