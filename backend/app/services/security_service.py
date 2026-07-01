import datetime
from typing import Optional
from fastapi import HTTPException, Request
from sqlalchemy.orm import Session
from app.models.security import SecurityLog
from app.services.captcha_service import CaptchaService

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
        now = datetime.datetime.utcnow()
        time_window = now - datetime.timedelta(minutes=15)
        
        # IP / Email ban check (10 failures -> 15min IP ban)
        failed_attempts_count = db.query(SecurityLog).filter(
            (SecurityLog.ip_address == ip_address) | (SecurityLog.email == email),
            SecurityLog.event_type.in_([f"{event_type}_failed", f"{event_type}_captcha_failed"]),
            SecurityLog.created_at >= time_window
        ).count()

        if failed_attempts_count >= 10:
            cls.log_security_event(db, ip_address, email, f"{event_type}_ip_ban", "IP Banned due to 10+ failed attempts")
            raise HTTPException(
                status_code=403,
                detail={"message": "Too many failed attempts. Your IP has been temporarily locked out for 15 minutes.", "lockout": True}
            )

        # 30s lockout check (6 failures -> 30s lockout)
        if failed_attempts_count >= 6:
            last_failed = db.query(SecurityLog).filter(
                (SecurityLog.ip_address == ip_address) | (SecurityLog.email == email),
                SecurityLog.event_type.in_([f"{event_type}_failed", f"{event_type}_captcha_failed"]),
                SecurityLog.created_at >= (now - datetime.timedelta(seconds=30))
            ).first()
            if last_failed:
                raise HTTPException(
                    status_code=429,
                    detail={"message": "Account temporarily locked. Please wait 30 seconds before trying again.", "lockout": True}
                )

        # CAPTCHA check (3 failures -> CAPTCHA)
        if failed_attempts_count >= 3:
            if not captcha_id or not captcha_answer:
                raise HTTPException(
                    status_code=400,
                    detail={"message": "Multiple failed attempts. CAPTCHA verification required.", "captcha_required": True}
                )
            
            verified = CaptchaService.verify_challenge(db, captcha_id, captcha_answer, ip_address)
            if not verified:
                cls.log_security_event(db, ip_address, email, f"{event_type}_captcha_failed", "Failed CAPTCHA response")
                raise HTTPException(
                    status_code=400,
                    detail={"message": "Invalid or expired CAPTCHA answer. Please try again.", "captcha_required": True}
                )
