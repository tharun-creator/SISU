import os
from sqlalchemy import (
    create_engine, Column, Integer, String, DateTime,
    Boolean, Text, ForeignKey, Enum as SAEnum
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from dotenv import load_dotenv
import datetime
import enum

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in .env")

# Strip query parameters for SSL to prevent PyMySQL Connection error on cloud databases like Aiven
db_url = DATABASE_URL
connect_args = {}
if "mysql" in db_url:
    if "?" in db_url:
        db_url = db_url.split("?")[0]
    connect_args = {"ssl": {}}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
    pool_pre_ping=True
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class UserRole(str, enum.Enum):
    client = "client"
    admin = "admin"


class MeetingStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"
    rescheduled = "rescheduled"
    completed = "completed"


class MeetingPriority(str, enum.Enum):
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"


# ── Users ─────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="client", nullable=False)
    avatar = Column(String(512), nullable=True)
    company = Column(String(255), nullable=True)
    job_title = Column(String(255), nullable=True)
    timezone = Column(String(100), default="Asia/Kolkata")
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    meetings_as_client = relationship("Meeting", foreign_keys="Meeting.client_id", back_populates="client")
    notifications = relationship("Notification", back_populates="user")


# ── Meetings ───────────────────────────────────────────────────────────────────
class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    meeting_type = Column(String(100), default="Mentorship Session")
    status = Column(String(30), default="pending")
    priority = Column(String(20), default="normal")
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=60)
    google_event_id = Column(String(255), nullable=True)
    meet_link = Column(String(512), nullable=True)
    notes = Column(Text, nullable=True)
    admin_notes = Column(Text, nullable=True)
    phone = Column(String(50), nullable=True)
    otter_notes = Column(Text, nullable=True)
    preferred_communication = Column(String(100), default="video")
    attachment_url = Column(String(512), nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    client = relationship("User", foreign_keys=[client_id], back_populates="meetings_as_client")
    status_logs = relationship("MeetingStatusLog", back_populates="meeting")


# ── Legacy Booking (keep for backwards compat) ─────────────────────────────────
class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String(255))
    type = Column(String(255))
    time = Column(DateTime)
    status = Column(String(50), default="pending")


# ── Meeting Status Log ──────────────────────────────────────────────────────────
class MeetingStatusLog(Base):
    __tablename__ = "meeting_status_logs"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    old_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=False)
    changed_by = Column(String(255), nullable=True)
    note = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    meeting = relationship("Meeting", back_populates="status_logs")


# ── Notifications ──────────────────────────────────────────────────────────────
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False)   # "approved","rejected","reminder",etc.
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="notifications")


# ── Availability Slots ──────────────────────────────────────────────────────────
class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"

    id = Column(Integer, primary_key=True, index=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    is_booked = Column(Boolean, default=False)
    recurring = Column(Boolean, default=False)
    day_of_week = Column(Integer, nullable=True)  # 0=Mon … 6=Sun for recurring


# Create all tables
Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
