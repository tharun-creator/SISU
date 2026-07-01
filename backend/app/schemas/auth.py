from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.schemas.user import UserOut

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    phone: Optional[str] = Field(None, max_length=30)
    role: str = "client"
    company: Optional[str] = Field(None, max_length=100)
    job_title: Optional[str] = Field(None, max_length=100)
    timezone: Optional[str] = Field("Asia/Kolkata", max_length=100)

class LoginRequest(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, max_length=128)
    captcha_id: Optional[str] = None
    captcha_answer: Optional[str] = None
    google_credential: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8, max_length=128)

class EmailVerificationRequest(BaseModel):
    token: str

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    timezone: Optional[str] = None

