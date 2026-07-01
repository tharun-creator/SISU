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
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests
import secrets

from database import get_db, User, AdminEmail

# ── Config ─────────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY or SECRET_KEY == "sisu-super-secret-key-change-in-production":
    raise RuntimeError("CRITICAL ERROR: JWT_SECRET environment variable is missing or set to the default insecure value. Please set a secure JWT_SECRET in your .env file.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 72

bearer_scheme = HTTPBearer(auto_error=False)

# ── Pydantic Schemas ────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    phone: Optional[str] = Field(None, max_length=30)
    role: str = "client"
    company: Optional[str] = Field(None, max_length=100)
    job_title: Optional[str] = Field(None, max_length=100)
    timezone: Optional[str] = Field("Asia/Kolkata", max_length=100)


class LoginRequest(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, max_length=128)
    captcha_id: Optional[str] = None
    captcha_answer: Optional[str] = None
    google_credential: Optional[str] = None



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
        "is_priority": getattr(user, "is_priority", False),
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


def is_email_admin(email: str, db: Session) -> bool:
    email_clean = email.strip().lower()
    env_admins_env = os.getenv("ADMIN_EMAILS", "tharunriot@gmail.com")
    env_admins = [e.strip().lower() for e in env_admins_env.split(",") if e.strip()]
    if email_clean in env_admins:
        return True
    return db.query(AdminEmail).filter(AdminEmail.email.ilike(email_clean)).first() is not None


def require_admin(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    is_admin = is_email_admin(current_user.email, db)
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ── Route Handlers (to be registered in main.py) ────────────────────────────
def register_user(req: RegisterRequest, db: Session) -> TokenResponse:
    # Enforce password strength check during signup
    try:
        validate_password_strength(req.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    email_clean = req.email.strip()
    existing = db.query(User).filter(User.email.ilike(email_clean)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    is_admin = is_email_admin(email_clean, db)
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
    is_admin = is_email_admin(user.email, db)
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


def login_google_user(credential: str, db: Session) -> TokenResponse:
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "793728037081-03p54l6ntfisafaavflhpmtq5o3dfs1g.apps.googleusercontent.com")
    try:
        idinfo = id_token.verify_oauth2_token(credential, requests.Request(), GOOGLE_CLIENT_ID)
        email_clean = idinfo['email'].strip()
        name = idinfo.get('name', email_clean.split('@')[0])
        picture = idinfo.get('picture')
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid Google token: {str(e)}")
        
    user = db.query(User).filter(User.email.ilike(email_clean)).first()
    
    if not user:
        is_admin = is_email_admin(email_clean, db)
        total_users = db.query(User).count()
        role = "admin" if (is_admin or total_users == 0) else "client"
        
        user = User(
            name=name,
            email=email_clean,
            password_hash=hash_password(secrets.token_urlsafe(24)),
            role=role,
            avatar=picture,
            timezone="Asia/Kolkata",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
            
        updated = False
        if picture and user.avatar != picture:
            user.avatar = picture
            updated = True
        if name and user.name != name:
            user.name = name
            updated = True
        if updated:
            db.commit()
            db.refresh(user)
            
    is_admin = is_email_admin(user.email, db)
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
