import os
import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from database import get_db, User, NotebookNote
from auth import get_current_user
from api.schemas import NoteCreate, NoteUpdate, NoteOut

router = APIRouter(prefix="/api/notes", tags=["Notebook"])

UPLOAD_DIR = "uploads"

# Convert Note model to NoteOut-friendly structure
def note_to_dict(note: NotebookNote) -> dict:
    return {
        "id": note.id,
        "user_id": note.user_id,
        "meeting_id": note.meeting_id,
        "title": note.title,
        "content": note.content,
        "photo_url": note.photo_url,
        "is_shared": note.is_shared,
        "share_token": note.share_token,
        "created_at": note.created_at.isoformat() if note.created_at else "",
        "updated_at": note.updated_at.isoformat() if note.updated_at else "",
    }

@router.get("/shared/{share_token}")
async def get_shared_note(
    share_token: str,
    db: Session = Depends(get_db)
):
    note = db.query(NotebookNote).filter(NotebookNote.share_token == share_token, NotebookNote.is_shared == True).first()
    if not note:
        raise HTTPException(status_code=404, detail="Shared note not found")
    return note_to_dict(note)

@router.get("", response_model=List[NoteOut])
async def get_notes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notes = db.query(NotebookNote).filter(NotebookNote.user_id == current_user.id).order_by(NotebookNote.updated_at.desc()).all()
    return [note_to_dict(n) for n in notes]

@router.post("", response_model=NoteOut)
async def create_note(
    req: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    note = NotebookNote(
        user_id=current_user.id,
        meeting_id=req.meeting_id if (req.meeting_id is not None and req.meeting_id > 0) else None,
        title=req.title,
        content=req.content,
        is_shared=False,
        share_token=None
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note_to_dict(note)

@router.put("/{id}", response_model=NoteOut)
async def update_note(
    id: int,
    req: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    note = db.query(NotebookNote).filter(NotebookNote.id == id, NotebookNote.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    if req.title is not None:
        note.title = req.title
    if req.content is not None:
        note.content = req.content
    if req.meeting_id is not None:
        note.meeting_id = req.meeting_id if req.meeting_id > 0 else None
    if req.is_shared is not None:
        if req.is_shared and not note.is_shared:
            note.share_token = uuid.uuid4().hex
        elif not req.is_shared and note.is_shared:
            note.share_token = None
        note.is_shared = req.is_shared
    
    db.commit()
    db.refresh(note)
    return note_to_dict(note)


@router.delete("/{id}")
async def delete_note(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    note = db.query(NotebookNote).filter(NotebookNote.id == id, NotebookNote.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Remove photo file if exists
    if note.photo_url:
        # e.g., "/uploads/filename.jpg"
        file_path = note.photo_url.lstrip("/")
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Error removing photo file {file_path}: {e}")

    db.delete(note)
    db.commit()
    return {"detail": "Note deleted successfully"}

@router.post("/{id}/photo", response_model=NoteOut)
async def upload_photo(
    id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    note = db.query(NotebookNote).filter(NotebookNote.id == id, NotebookNote.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Secure filename creation
    _, ext = os.path.splitext(file.filename)
    if not ext:
        ext = ".jpg" # fallback
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    # Save file to disk
    with open(file_path, "wb") as f:
        f.write(await file.read())
    
    # If there was an old photo, remove it
    if note.photo_url:
        old_file_path = note.photo_url.lstrip("/")
        if os.path.exists(old_file_path):
            try:
                os.remove(old_file_path)
            except Exception as e:
                print(f"Error removing old photo file {old_file_path}: {e}")
                
    # Update note
    note.photo_url = f"/uploads/{filename}"
    db.commit()
    db.refresh(note)
    return note_to_dict(note)

@router.delete("/{id}/photo", response_model=NoteOut)
async def delete_photo(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    note = db.query(NotebookNote).filter(NotebookNote.id == id, NotebookNote.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    if note.photo_url:
        file_path = note.photo_url.lstrip("/")
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Error removing photo file {file_path}: {e}")
        note.photo_url = None
        db.commit()
        db.refresh(note)
    
    return note_to_dict(note)
