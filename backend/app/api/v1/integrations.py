from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.meeting import Meeting

router = APIRouter(prefix="/integrations", tags=["Third-Party Integrations"])

class WebhookPayload(BaseModel):
    meeting_id: int
    transcript: str

@router.post("/fireflies")
async def sync_fireflies_transcript(payload: WebhookPayload, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == payload.meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    meeting.otter_notes = f"[Fireflies.ai Sync]: {payload.transcript}"
    db.commit()
    db.refresh(meeting)
    return {"success": True, "message": "Fireflies.ai transcript synced successfully", "data": {"meeting_id": meeting.id}}

@router.post("/fathom")
async def sync_fathom_transcript(payload: WebhookPayload, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == payload.meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    meeting.otter_notes = f"[Fathom Sync]: {payload.transcript}"
    db.commit()
    db.refresh(meeting)
    return {"success": True, "message": "Fathom transcript synced successfully", "data": {"meeting_id": meeting.id}}
