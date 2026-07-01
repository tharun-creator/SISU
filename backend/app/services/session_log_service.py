import json
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.session_log import SessionLog
from app.schemas.session_log import SessionLogCreate, SessionLogUpdate, SessionLogOut, ActionItemSchema

class SessionLogService:
    @staticmethod
    def get_user_logs(db: Session, user_id: int) -> List[SessionLogOut]:
        db_logs = db.query(SessionLog).filter(SessionLog.user_id == user_id).order_by(SessionLog.session_date.desc()).all()
        
        result = []
        for log in db_logs:
            discussed = json.loads(log.discussed_items) if log.discussed_items else []
            actions_raw = json.loads(log.action_items) if log.action_items else []
            actions = [ActionItemSchema(**item) for item in actions_raw]
            
            result.append(SessionLogOut(
                id=log.id,
                user_id=log.user_id,
                session_date=log.session_date,
                session_type=log.session_type,
                discussed_items=discussed,
                action_items=actions,
                created_at=log.created_at,
                updated_at=log.updated_at
            ))
        return result

    @staticmethod
    def create_log(db: Session, user_id: int, log_data: SessionLogCreate) -> SessionLogOut:
        discussed_json = json.dumps(log_data.discussed_items)
        actions_json = json.dumps([item.model_dump() for item in log_data.action_items])
        
        db_log = SessionLog(
            user_id=user_id,
            session_date=log_data.session_date,
            session_type=log_data.session_type,
            discussed_items=discussed_json,
            action_items=actions_json
        )
        db.add(db_log)
        db.commit()
        db.refresh(db_log)
        
        return SessionLogOut(
            id=db_log.id,
            user_id=db_log.user_id,
            session_date=db_log.session_date,
            session_type=db_log.session_type,
            discussed_items=log_data.discussed_items,
            action_items=log_data.action_items,
            created_at=db_log.created_at,
            updated_at=db_log.updated_at
        )

    @staticmethod
    def toggle_action_item(db: Session, user_id: int, log_id: int, item_id: str, completed: bool) -> Optional[SessionLogOut]:
        db_log = db.query(SessionLog).filter(SessionLog.id == log_id, SessionLog.user_id == user_id).first()
        if not db_log:
            return None
        
        actions_raw = json.loads(db_log.action_items) if db_log.action_items else []
        for item in actions_raw:
            if item.get("id") == item_id:
                item["completed"] = completed
                break
                
        db_log.action_items = json.dumps(actions_raw)
        db.commit()
        db.refresh(db_log)
        
        discussed = json.loads(db_log.discussed_items) if db_log.discussed_items else []
        actions = [ActionItemSchema(**item) for item in actions_raw]
        
        return SessionLogOut(
            id=db_log.id,
            user_id=db_log.user_id,
            session_date=db_log.session_date,
            session_type=db_log.session_type,
            discussed_items=discussed,
            action_items=actions,
            created_at=db_log.created_at,
            updated_at=db_log.updated_at
        )

    @staticmethod
    def delete_log(db: Session, user_id: int, log_id: int) -> bool:
        db_log = db.query(SessionLog).filter(SessionLog.id == log_id, SessionLog.user_id == user_id).first()
        if not db_log:
            return False
        db.delete(db_log)
        db.commit()
        return True
