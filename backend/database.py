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
            except Exception as creation_err:
                print(f"\n[Database Error] Failed to connect to MySQL and failed to auto-create database '{db_name}'.")
                print(f"Creation Error detail: {creation_err}")
                raise creation_err
        else:
            print(f"\n[Database Error] Failed to connect to MySQL database.")
            print(f"Error detail: {e}")
            raise e

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
    is_verified = Column(Boolean, default=False, nullable=False)
    is_priority = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    meetings_as_client = relationship("Meeting", foreign_keys="Meeting.client_id", back_populates="client")
    notifications = relationship("Notification", back_populates="user")


# ── Meetings ───────────────────────────────────────────────────────────────────
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
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, index=True)
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
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
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
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
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
    role = Column(String(50), default="admin", nullable=False)


# ── Notebook Notes ─────────────────────────────────────────────────────────────
class NotebookNote(Base):
    __tablename__ = "notebook_notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=True)
    photo_url = Column(String(512), nullable=True)
    is_shared = Column(Boolean, default=False, nullable=False)
    share_token = Column(String(100), unique=True, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User")
    meeting = relationship("Meeting")



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

# Self-migrating database logic: ensure users table has all required columns
try:
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    if "users" in inspector.get_table_names():
        columns = [col["name"] for col in inspector.get_columns("users")]
        dialect = engine.url.drivername
        is_mysql = "mysql" in dialect
        
        user_missing = {
            "is_priority": "TINYINT(1) NOT NULL DEFAULT 0" if is_mysql else "BOOLEAN NOT NULL DEFAULT 0",
            "phone": "VARCHAR(50) NULL" if is_mysql else "VARCHAR(50)",
            "timezone": "VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata'" if is_mysql else "VARCHAR(100) DEFAULT 'Asia/Kolkata'",
            "is_active": "TINYINT(1) NOT NULL DEFAULT 1" if is_mysql else "BOOLEAN DEFAULT 1",
            "avatar": "VARCHAR(512) NULL" if is_mysql else "VARCHAR(512)",
            "company": "VARCHAR(255) NULL" if is_mysql else "VARCHAR(255)",
            "job_title": "VARCHAR(255) NULL" if is_mysql else "VARCHAR(255)",
        }
        for col_name, col_def in user_missing.items():
            if col_name not in columns:
                print(f"Adding '{col_name}' column to users table...")
                with engine.connect() as conn:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}"))
                    conn.commit()
                print(f"Successfully added '{col_name}' column to users table!")
except Exception as e:
    print(f"Error checking/migrating users table: {e}")

# Self-migrating database logic: ensure meetings table has all required columns
try:
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    if "meetings" in inspector.get_table_names():
        columns = [col["name"] for col in inspector.get_columns("meetings")]
        dialect = engine.url.drivername
        is_mysql = "mysql" in dialect
        
        meetings_missing = {
            "phone": "VARCHAR(50) NULL" if is_mysql else "VARCHAR(50)",
            "otter_notes": "TEXT NULL" if is_mysql else "TEXT",
            "preferred_communication": "VARCHAR(100) NOT NULL DEFAULT 'video'" if is_mysql else "VARCHAR(100) DEFAULT 'video'",
            "attachment_url": "VARCHAR(512) NULL" if is_mysql else "VARCHAR(512)",
            "deleted_at": "DATETIME NULL" if is_mysql else "DATETIME",
        }
        for col_name, col_def in meetings_missing.items():
            if col_name not in columns:
                print(f"Adding '{col_name}' column to meetings table...")
                with engine.connect() as conn:
                    conn.execute(text(f"ALTER TABLE meetings ADD COLUMN {col_name} {col_def}"))
                    conn.commit()
                print(f"Successfully added '{col_name}' column to meetings table!")
except Exception as e:
    print(f"Error checking/migrating meetings table: {e}")

# Self-migrating database logic: ensure notebook_notes table has all required columns
try:
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    if "notebook_notes" in inspector.get_table_names():
        columns = [col["name"] for col in inspector.get_columns("notebook_notes")]
        dialect = engine.url.drivername
        is_mysql = "mysql" in dialect
        
        notes_missing = {
            "meeting_id": "INT NULL" if is_mysql else "INTEGER",
            "is_shared": "TINYINT(1) NOT NULL DEFAULT 0" if is_mysql else "BOOLEAN NOT NULL DEFAULT 0",
            "share_token": "VARCHAR(100) NULL" if is_mysql else "VARCHAR(100)",
        }
        for col_name, col_def in notes_missing.items():
            if col_name not in columns:
                print(f"Adding '{col_name}' column to notebook_notes table...")
                with engine.connect() as conn:
                    conn.execute(text(f"ALTER TABLE notebook_notes ADD COLUMN {col_name} {col_def}"))
                    conn.commit()
                print(f"Successfully added '{col_name}' column to notebook_notes table!")
except Exception as e:
    print(f"Error checking/migrating notebook_notes table: {e}")

# Create all tables
Base.metadata.create_all(bind=engine)

# Seed default admin emails if not present, and ensure correct role
db = SessionLocal()
try:
    admin_emails_env = os.getenv("ADMIN_EMAILS", "tharunriot@gmail.com")
    admin_emails = [email.strip().lower() for email in admin_emails_env.split(",") if email.strip()]
    
    for email in admin_emails:
        admin_exists = db.query(AdminEmail).filter(AdminEmail.email == email).first()
        if not admin_exists:
            new_admin = AdminEmail(email=email)
            db.add(new_admin)
            db.commit()
            print(f"Seeded admin email: {email}")
        
        # Check if user exists and enforce role
        user_record = db.query(User).filter(User.email == email).first()
        if user_record and user_record.role != "admin":
            user_record.role = "admin"
            db.commit()
            print(f"Forced user role to 'admin' for: {email}")
except Exception as e:
    print(f"Error seeding admin emails / verifying users: {e}")
    db.rollback()
finally:
    db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
