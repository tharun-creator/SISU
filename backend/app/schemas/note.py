from typing import Optional
from pydantic import BaseModel

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
