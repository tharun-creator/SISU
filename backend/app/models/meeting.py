import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    meeting_type = Column(String(100), default="Mentorship Session")
    status = Column(String(30), default="pending", index=True)
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


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String(255))
    type = Column(String(255))
    time = Column(DateTime)
    status = Column(String(50), default="pending")


class MeetingStatusLog(Base):
    __tablename__ = "meeting_status_logs"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, index=True)
    old_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=False)
    changed_by = Column(String(255), nullable=True)
    note = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    meeting = relationship("Meeting", back_populates="status_logs")


class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"

    id = Column(Integer, primary_key=True, index=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    is_booked = Column(Boolean, default=False)
    recurring = Column(Boolean, default=False)
    day_of_week = Column(Integer, nullable=True)  # 0=Mon … 6=Sun for recurring


class DateAvailabilitySignal(Base):
    __tablename__ = "date_availability_signals"

    date = Column(String(10), primary_key=True, index=True)  # "YYYY-MM-DD"
    signal = Column(String(20), nullable=False)  # "green", "yellow", "red"
    custom_slots = Column(Text, nullable=True)  # comma-separated slots, e.g. "09:00-10:00,10:00-11:00"
