from typing import Optional
from pydantic import BaseModel, EmailStr
import datetime

class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    timezone: Optional[str] = "Asia/Kolkata"
    company: Optional[str] = None
    job_title: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    timezone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    avatar: Optional[str] = None
    is_priority: Optional[bool] = None

class UserOut(UserBase):
    id: int
    role: str
    avatar: Optional[str] = None
    is_active: bool
    is_verified: bool
    is_priority: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True
