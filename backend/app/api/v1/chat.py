from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.dependencies import get_current_user
from app.services.ai_service import AIService
from app.schemas.meeting import ChatMessage, ChatResponse

router = APIRouter(prefix="/chat", tags=["AI Concierge"])

@router.post("")
async def chat_endpoint(req: ChatMessage, current_user: User = Depends(get_current_user)):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    try:
        response_text = await AIService.generate_chat_response(
            req.message, req.history, user_name=current_user.name, user_id=current_user.id
        )
        return {
            "success": True,
            "data": {
                "response": response_text
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": {
                "code": "CHAT_ERROR",
                "message": str(e)
            }
        }
