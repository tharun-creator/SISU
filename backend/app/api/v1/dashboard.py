from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.meeting import Meeting
from app.models.notification import Notification
from app.models.user import User
from app.dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role in ["admin", "super_admin"]:
        total = db.query(Meeting).filter(Meeting.deleted_at == None).count()
        pending = db.query(Meeting).filter(Meeting.status == "pending", Meeting.deleted_at == None).count()
        approved = db.query(Meeting).filter(Meeting.status == "approved", Meeting.deleted_at == None).count()
        rejected = db.query(Meeting).filter(Meeting.status == "rejected", Meeting.deleted_at == None).count()
        cancelled = db.query(Meeting).filter(Meeting.status == "cancelled", Meeting.deleted_at == None).count()
        approval_rate = round((approved / total * 100) if total > 0 else 0, 1)
        res = {
            "total_meetings": total,
            "pending_requests": pending,
            "approved_meetings": approved,
            "rejected_meetings": rejected,
            "cancelled_meetings": cancelled,
            "approval_rate": f"{approval_rate}%",
            "efficiency": f"{100 - round((cancelled / total * 100) if total > 0 else 0, 1)}%",
            "total_bookings": total,
        }
    else:
        total = db.query(Meeting).filter(Meeting.client_id == current_user.id, Meeting.deleted_at == None).count()
        pending = db.query(Meeting).filter(Meeting.client_id == current_user.id, Meeting.status == "pending", Meeting.deleted_at == None).count()
        approved = db.query(Meeting).filter(Meeting.client_id == current_user.id, Meeting.status == "approved", Meeting.deleted_at == None).count()
        unread = db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).count()
        res = {
            "total_meetings": total,
            "pending_requests": pending,
            "approved_meetings": approved,
            "unread_notifications": unread,
            "total_bookings": total,
        }
    return {
        "success": True,
        "data": res
    }
