import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from app.database import Base

class SessionLog(Base):
    __tablename__ = "session_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    session_date = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    session_type = Column(String(100), default="60 min mentorship")
    discussed_items = Column(Text, nullable=True)  # JSON-serialized list of strings
    action_items = Column(Text, nullable=True)  # JSON-serialized list of tasks: [{"id": str, "text": str, "completed": bool}]
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
