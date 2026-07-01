from sqlalchemy.orm import Session
from app.models.notification import Notification

class NotificationService:
    @staticmethod
    def create_notification(
        db: Session,
        user_id: int,
        ntype: str,
        title: str,
        message: str,
        meeting_id: int = None
    ) -> Notification:
        notif = Notification(
            user_id=user_id,
            type=ntype,
            title=title,
            message=message,
            meeting_id=meeting_id,
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif
