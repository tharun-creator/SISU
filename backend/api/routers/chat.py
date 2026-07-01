from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db, User
from auth import get_current_user
from llm import generate_chat_response
from api.schemas import ChatMessage, ChatResponse

router = APIRouter(prefix="/api/chat", tags=["AI Concierge"])

@router.post("", response_model=ChatResponse)
async def chat_endpoint(request: ChatMessage, current_user: User = Depends(get_current_user)):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    try:
        response_text = await generate_chat_response(
            request.message, request.history, user_name=current_user.name, user_id=current_user.id
        )
        return ChatResponse(response=response_text)
    except Exception as e:
        return ChatResponse(response="", error=str(e))
