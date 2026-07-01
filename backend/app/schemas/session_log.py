import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class ActionItemSchema(BaseModel):
    id: str
    text: str
    completed: bool = False

class SessionLogCreate(BaseModel):
    session_date: datetime.datetime
    session_type: str = "60 min mentorship"
    discussed_items: List[str] = Field(default_factory=list)
    action_items: List[ActionItemSchema] = Field(default_factory=list)

class SessionLogUpdate(BaseModel):
    session_date: Optional[datetime.datetime] = None
    session_type: Optional[str] = None
    discussed_items: Optional[List[str]] = None
    action_items: Optional[List[ActionItemSchema]] = None

class ActionItemToggleRequest(BaseModel):
    item_id: str
    completed: bool

class SessionLogOut(BaseModel):
    id: int
    user_id: int
    session_date: datetime.datetime
    session_type: str
    discussed_items: List[str]
    action_items: List[ActionItemSchema]
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True
