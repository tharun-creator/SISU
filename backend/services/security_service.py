import datetime
from typing import Optional
from fastapi import HTTPException, Request
from sqlalchemy.orm import Session
from database import SecurityLog
from services.captcha_service import CaptchaService

class SecurityService:
    @staticmethod
    def log_security_event(
        db: Session,
        ip_address: str,
        email: Optional[str],
        event_type: str,
        details: Optional[str] = None,
        request: Optional[Request] = None
    ) -> SecurityLog:
        """Logs security events (login success, login fail, reset request, etc.) to DB."""
        user_agent = None
        if request:
            user_agent = request.headers.get("user-agent")
        log = SecurityLog(
            ip_address=ip_address,
            email=email,
            event_type=event_type,
            user_agent=user_agent,
            details=details
        )
        db.add(log)
        db.commit()
        return log

    @classmethod
    def check_brute_force_and_verify_captcha(
        cls,
        db: Session,
        ip_address: str,
        email: str,
        event_type: str,
        captcha_id: Optional[str] = None,
        captcha_answer: Optional[str] = None
    ) -> None:
        """Counts failed attempts and forces CAPTCHA verification if threshold met."""
        time_window = datetime.datetime.utcnow() - datetime.timedelta(minutes=15)
        failed_attempts = db.query(SecurityLog).filter(
            (SecurityLog.ip_address == ip_address) | (SecurityLog.email == email),
            SecurityLog.event_type.in_([f"{event_type}_failed", f"{event_type}_captcha_failed"]),
            SecurityLog.created_at >= time_window
        ).count()

        if failed_attempts >= 3:
            if not captcha_id or not captcha_answer:
                raise HTTPException(
                    status_code=400,
                    detail={"message": "Multiple failed attempts. CAPTCHA verification required.", "captcha_required": True}
                )
            
            verified = CaptchaService.verify_challenge(db, captcha_id, captcha_answer)
            if not verified:
                cls.log_security_event(db, ip_address, email, f"{event_type}_captcha_failed", "Failed CAPTCHA response")
                raise HTTPException(
                    status_code=400,
                    detail={"message": "Invalid or expired CAPTCHA answer. Please try again.", "captcha_required": True}
                )
