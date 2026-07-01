from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.dependencies import get_current_user
from app.schemas.session_log import SessionLogCreate, ActionItemToggleRequest
from app.services.session_log_service import SessionLogService

router = APIRouter(prefix="/session-logs", tags=["Session Logs & Action Items"])

@router.get("")
async def get_logs_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        logs = SessionLogService.get_user_logs(db, current_user.id)
        return {
            "success": True,
            "data": logs
        }
    except Exception as e:
        return {
            "success": False,
            "error": {
                "code": "GET_LOGS_ERROR",
                "message": str(e)
            }
        }

@router.post("")
async def create_log_endpoint(
    req: SessionLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        new_log = SessionLogService.create_log(db, current_user.id, req)
        return {
            "success": True,
            "data": new_log
        }
    except Exception as e:
        return {
            "success": False,
            "error": {
                "code": "CREATE_LOG_ERROR",
                "message": str(e)
            }
        }

@router.put("/{log_id}/toggle-action")
async def toggle_action_endpoint(
    log_id: int,
    req: ActionItemToggleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        updated_log = SessionLogService.toggle_action_item(
            db, current_user.id, log_id, req.item_id, req.completed
        )
        if not updated_log:
            raise HTTPException(status_code=404, detail="Session log not found")
        return {
            "success": True,
            "data": updated_log
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        return {
            "success": False,
            "error": {
                "code": "TOGGLE_ACTION_ERROR",
                "message": str(e)
            }
        }

@router.delete("/{log_id}")
async def delete_log_endpoint(
    log_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        success = SessionLogService.delete_log(db, current_user.id, log_id)
        if not success:
            raise HTTPException(status_code=404, detail="Session log not found")
        return {
            "success": True,
            "data": {"message": "Session log deleted successfully"}
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        return {
            "success": False,
            "error": {
                "code": "DELETE_LOG_ERROR",
                "message": str(e)
            }
        }
