import random
import uuid
import datetime
from sqlalchemy.orm import Session
from database import CaptchaChallenge

class CaptchaService:
    @staticmethod
    def generate_challenge(db: Session) -> tuple[str, str]:
        """Generates a math CAPTCHA, stores it, and returns (challenge_id, question_text)"""
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
    def verify_challenge(db: Session, challenge_id: str, answer: str) -> bool:
        """Verifies if the CAPTCHA challenge is valid, not expired, and correct. Marks it as verified."""
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
