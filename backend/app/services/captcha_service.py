import random
import uuid
import datetime
import requests
from typing import Optional
from sqlalchemy.orm import Session
from app.models.security import CaptchaChallenge
from app.config import settings
from app.core.logging import logger

class CaptchaService:
    @staticmethod
    def generate_challenge(db: Session) -> tuple[str, str]:
        """Generates a math CAPTCHA fallback, stores it, and returns (challenge_id, question_text)"""
        num1 = random.randint(1, 15)
        num2 = random.randint(1, 10)
        op = random.choice(["+", "-", "*"])
        
        if op == "+":
            ans = num1 + num2
        elif op == "-":
            ans = num1 - num2
        else:
            ans = num1 * num2
            
        challenge_id = str(uuid.uuid4())
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
        
        db_challenge = CaptchaChallenge(
            id=challenge_id,
            answer=str(ans),
            expires_at=expires_at,
            is_verified=False
        )
        db.add(db_challenge)
        db.commit()
        
        return challenge_id, f"Solve: {num1} {op} {num2}"

    @staticmethod
    def verify_turnstile(token: str, ip_address: Optional[str] = None) -> bool:
        """Verifies Turnstile token with Cloudflare's API."""
        secret = settings.CLOUDFLARE_TURNSTILE_SECRET
        if not secret:
            # If not configured, we allow it for development convenience
            logger.info("Cloudflare Turnstile secret key not configured. Auto-approving.")
            return True
        try:
            url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
            payload = {
                "secret": secret,
                "response": token,
            }
            if ip_address:
                payload["remoteip"] = ip_address
            res = requests.post(url, data=payload, timeout=5)
            data = res.json()
            return data.get("success", False)
        except Exception as e:
            logger.error(f"Turnstile verification exception: {e}")
            return False

    @classmethod
    def verify_challenge(cls, db: Session, challenge_id: str, answer: str, ip_address: Optional[str] = None) -> bool:
        """Verifies captcha. Supports both Turnstile and math fallback."""
        # If the challenge ID is "turnstile", verify the answer as a Turnstile token
        if challenge_id == "turnstile":
            return cls.verify_turnstile(answer, ip_address)

        # Fallback to Math CAPTCHA verification
        challenge = db.query(CaptchaChallenge).filter(
            CaptchaChallenge.id == challenge_id,
            CaptchaChallenge.is_verified == False,
            CaptchaChallenge.expires_at >= datetime.datetime.utcnow()
        ).first()

        if not challenge or challenge.answer.strip() != answer.strip():
            return False

        challenge.is_verified = True
        db.commit()
        return True
