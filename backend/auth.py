"""
auth.py — JWT-based authentication for the Sisu platform
"""
import os
import datetime
import re
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db, User, AdminEmail

# ── Config ─────────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET", "sisu-super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 72

bearer_scheme = HTTPBearer(auto_error=False)

# ── Pydantic Schemas ────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    role: str = "client"
    company: Optional[str] = None
    job_title: Optional[str] = None
    timezone: Optional[str] = "Asia/Kolkata"


class LoginRequest(BaseModel):
    email: str
    password: str
    captcha_id: Optional[str] = None
    captcha_answer: Optional[str] = None



class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ── Helpers ─────────────────────────────────────────────────────────────────────
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.datetime.utcnow() + datetime.timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "company": user.company,
        "job_title": user.job_title,
        "timezone": user.timezone,
        "avatar": user.avatar,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


# ── Dependency: get current user ─────────────────────────────────────────────
def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")
    pwd_check = payload.get("pwd")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    # If the user changed their password, invalidate any JWTs generated with the old password hash
    if pwd_check and user.password_hash[-10:] != pwd_check:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    return user


def require_admin(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    is_admin = db.query(AdminEmail).filter(AdminEmail.email.ilike(current_user.email)).first() is not None or current_user.email.lower() == "tharunriot@gmail.com"
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ── Route Handlers (to be registered in main.py) ────────────────────────────
def register_user(req: RegisterRequest, db: Session) -> TokenResponse:
    email_clean = req.email.strip()
    existing = db.query(User).filter(User.email.ilike(email_clean)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    is_admin = db.query(AdminEmail).filter(AdminEmail.email.ilike(email_clean)).first() is not None or email_clean.lower() == "tharunriot@gmail.com"
    role = "admin" if is_admin else "client"

    user = User(
        name=req.name,
        email=email_clean,
        phone=req.phone,
        password_hash=hash_password(req.password),
        role=role,
        company=req.company,
        job_title=req.job_title,
        timezone=req.timezone or "Asia/Kolkata",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role, "pwd": user.password_hash[-10:]})
    return TokenResponse(access_token=token, user=user_to_dict(user))


def login_user(req: LoginRequest, db: Session) -> TokenResponse:
    email_clean = req.email.strip()
    user = db.query(User).filter(User.email.ilike(email_clean)).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    # Enforce role logic
    is_admin = db.query(AdminEmail).filter(AdminEmail.email.ilike(user.email)).first() is not None or user.email.lower() == "tharunriot@gmail.com"
    if is_admin:
        if user.role != "admin":
            user.role = "admin"
            db.commit()
            db.refresh(user)
    else:
        if user.role == "admin":
            user.role = "client"
            db.commit()
            db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role, "pwd": user.password_hash[-10:]})
    return TokenResponse(access_token=token, user=user_to_dict(user))


def validate_password_strength(password: str) -> None:
    """Validate password strength based on standard policies."""
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one digit")
    if not re.search(r"[ !@#$%^&*()_+=\-\[\]{}|;:'\",.<>?/`~]", password):
        raise ValueError("Password must contain at least one special character")
