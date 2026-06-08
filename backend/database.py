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

fallback_to_sqlite = False
if "mysql" in db_url:
    try:
        # Create a temporary engine with pool_pre_ping to check connectivity
        temp_engine = create_engine(
            db_url,
            connect_args=connect_args,
            pool_pre_ping=True
        )
        with temp_engine.connect() as conn:
            pass
        temp_engine.dispose()
    except Exception as e:
        # Check if the error is "Unknown database" (MySQL error 1049)
        if "1049" in str(e) or "Unknown database" in str(e):
            db_name = "sisu_db"
            try:
                # Parse base URL and DB name
                parts = db_url.split("/")
                base_url = "/".join(parts[:-1]) + "/"
                db_name = parts[-1].split("?")[0]
                
                print(f"\n[Database Init] Database '{db_name}' does not exist on your MySQL server.")
                print(f"Attempting to automatically create it...")
                
                # Connect to server without database specified
                from sqlalchemy import text
                sys_engine = create_engine(base_url, connect_args=connect_args)
                with sys_engine.connect() as conn:
                    conn.execute(text(f"CREATE DATABASE IF NOT EXISTS {db_name}"))
                    conn.commit()
                sys_engine.dispose()
                print(f"[Database Init] Database '{db_name}' successfully created!")
                
                # Retry connection test
                with temp_engine.connect() as conn:
                    pass
                temp_engine.dispose()
            except Exception as creation_err:
                print(f"\n[Database Warning] Failed to connect to MySQL and failed to auto-create database '{db_name}'.")
                print(f"Creation Error detail: {creation_err}")
                print("-> Falling back to local SQLite database 'sqlite:///sisu.db' to keep the system running...\n")
                fallback_to_sqlite = True
        else:
            print(f"\n[Database Warning] Failed to connect to MySQL database.")
            print(f"Error detail: {e}")
            print("-> Falling back to local SQLite database 'sqlite:///sisu.db' to keep the system running...\n")
            fallback_to_sqlite = True

if fallback_to_sqlite:
    db_url = "sqlite:///sisu.db"
    connect_args = {"check_same_thread": False}
    engine = create_engine(
        db_url,
        connect_args=connect_args
    )
else:
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
    medium = "medium"
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
    is_priority = Column(Boolean, default=False, nullable=False)
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


# ── Password Reset Tokens ──────────────────────────────────────────────────────
class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    hashed_token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# ── Security Logs ──────────────────────────────────────────────────────────────
class SecurityLog(Base):
    __tablename__ = "security_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True, index=True)
    event_type = Column(String(100), nullable=False)  # "login_failed", "forgot_password_requested", "password_changed", etc.
    user_agent = Column(String(512), nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# ── Captcha Challenges ─────────────────────────────────────────────────────────
class CaptchaChallenge(Base):
    __tablename__ = "captcha_challenges"
    
    id = Column(String(50), primary_key=True, index=True)  # UUID
    answer = Column(String(50), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# ── Date Availability Signals ──────────────────────────────────────────────────
class DateAvailabilitySignal(Base):
    __tablename__ = "date_availability_signals"

    date = Column(String(10), primary_key=True, index=True)  # "YYYY-MM-DD"
    signal = Column(String(20), nullable=False)  # "green", "yellow", "red"
    custom_slots = Column(Text, nullable=True)  # comma-separated slots, e.g. "09:00-10:00,10:00-11:00"


# ── Admin Emails ───────────────────────────────────────────────────────────────
class AdminEmail(Base):
    __tablename__ = "admin_emails"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)


# Self-migrating database logic: drop old password_reset_tokens table if it uses legacy column schema
try:
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    if "password_reset_tokens" in inspector.get_table_names():
        columns = [col["name"] for col in inspector.get_columns("password_reset_tokens")]
        if "token" in columns and "hashed_token" not in columns:
            print("Old password_reset_tokens table found (with 'token' column). Dropping it to migrate.")
            with engine.connect() as conn:
                conn.execute(text("DROP TABLE password_reset_tokens"))
                conn.commit()
except Exception as e:
    print(f"Error checking/migrating password_reset_tokens: {e}")

# Self-migrating database logic: ensure users table has 'is_priority' column
try:
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    if "users" in inspector.get_table_names():
        columns = [col["name"] for col in inspector.get_columns("users")]
        if "is_priority" not in columns:
            print("Adding 'is_priority' column to users table...")
            with engine.connect() as conn:
                dialect = engine.url.drivername
                if "mysql" in dialect:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_priority TINYINT(1) NOT NULL DEFAULT 0"))
                else:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_priority BOOLEAN NOT NULL DEFAULT 0"))
                conn.commit()
            print("Successfully added 'is_priority' column to users table!")
except Exception as e:
    print(f"Error checking/migrating users table for is_priority: {e}")

# Create all tables
Base.metadata.create_all(bind=engine)

# Seed default admin email if not present, and ensure correct role
db = SessionLocal()
try:
    admin_exists = db.query(AdminEmail).filter(AdminEmail.email == "tharunriot@gmail.com").first()
    if not admin_exists:
        default_admin = AdminEmail(email="tharunriot@gmail.com")
        db.add(default_admin)
        db.commit()
        print("Seeded default admin email: tharunriot@gmail.com")
    
    # Check if user exists and enforce role
    tharun_user = db.query(User).filter(User.email == "tharunriot@gmail.com").first()
    if tharun_user and tharun_user.role != "admin":
        tharun_user.role = "admin"
        db.commit()
        print("Forced tharunriot@gmail.com user role to 'admin' in database.")
except Exception as e:
    print(f"Error seeding default admin / verifying user: {e}")
    db.rollback()
finally:
    db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
