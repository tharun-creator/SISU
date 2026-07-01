import os
import secrets
import hashlib
import datetime
from fastapi import APIRouter, Depends, Request, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from slowapi.util import get_remote_address

from app.database import get_db
from app.models.user import User, AdminEmail
from app.models.security import PasswordResetToken, EmailVerificationToken
from app.api.limiter import limiter
from app.dependencies import get_current_user
from app.core.security import (
    hash_password, verify_password, create_access_token, 
    create_refresh_token, decode_token, validate_password_strength
)
from app.services.email_service import EmailService
from app.services.captcha_service import CaptchaService
from app.services.security_service import SecurityService
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse, ForgotPasswordRequest, 
    ResetPasswordRequest, ChangePasswordRequest, EmailVerificationRequest,
    UpdateProfileRequest
)
from app.schemas.common import SuccessResponse
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

def user_to_out_dict(user: User) -> dict:
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
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "is_priority": user.is_priority,
        "created_at": user.created_at,
    }

@router.get("/captcha")
@limiter.limit("30/minute")
async def get_captcha(request: Request, db: Session = Depends(get_db)):
    challenge_id, question = CaptchaService.generate_challenge(db)
    return {
        "success": True,
        "data": {
            "captcha_id": challenge_id,
            "question": question
        }
    }

@router.post("/register")
@limiter.limit("5/minute")
async def register(req: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    ip = get_remote_address(request)
    email_clean = req.email.strip().lower()
    
    try:
        validate_password_strength(req.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    existing = db.query(User).filter(User.email.ilike(email_clean)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Determine role
    is_admin = email_clean in settings.admin_emails_list
    if not is_admin:
        is_admin = db.query(AdminEmail).filter(AdminEmail.email.ilike(email_clean)).first() is not None
        
    role = "admin" if is_admin else "client"
    if db.query(User).count() == 0:
        role = "super_admin"

    user = User(
        name=req.name,
        email=email_clean,
        phone=req.phone,
        password_hash=hash_password(req.password),
        role=role,
        company=req.company,
        job_title=req.job_title,
        timezone=req.timezone or "Asia/Kolkata",
        is_verified=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate email verification token
    verification_token = secrets.token_urlsafe(32)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=1)
    db_token = EmailVerificationToken(
        user_id=user.id,
        token=verification_token,
        expires_at=expires_at,
        is_used=False
    )
    db.add(db_token)
    db.commit()

    # Send verification email
    verify_link = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={verification_token}"
    EmailService.send_verification_email(user.email, user.name, verify_link)

    SecurityService.log_security_event(db, ip, email_clean, "register_success", request=request)
    
    return {
        "success": True,
        "data": {
            "message": "Registration successful. Please check your email to verify your account.",
            "user": user_to_out_dict(user)
        }
    }

@router.post("/login")
@limiter.limit("10/minute")
async def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = get_remote_address(request)
    
    if req.google_credential:
        # Google OAuth
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        try:
            idinfo = id_token.verify_oauth2_token(req.google_credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
            email_clean = idinfo['email'].strip().lower()
            name = idinfo.get('name', email_clean.split('@')[0])
            picture = idinfo.get('picture')
        except Exception as e:
            SecurityService.log_security_event(db, ip, None, "google_login_failed", str(e), request=request)
            raise HTTPException(status_code=400, detail=f"Invalid Google token: {str(e)}")
            
        user = db.query(User).filter(User.email.ilike(email_clean)).first()
        if not user:
            role = "client"
            if db.query(User).count() == 0:
                role = "super_admin"
            user = User(
                name=name,
                email=email_clean,
                password_hash=hash_password(secrets.token_urlsafe(24)),
                role=role,
                avatar=picture,
                is_verified=True # Google OAuth users are auto-verified
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            if not user.is_active:
                raise HTTPException(status_code=403, detail="Account is disabled")
            
        access_token = create_access_token({"sub": str(user.id), "role": user.role, "pwd": user.password_hash[-10:]})
        refresh_token = create_refresh_token({"sub": str(user.id)})
        
        SecurityService.log_security_event(db, ip, email_clean, "google_login_success", request=request)
        return {
            "success": True,
            "data": {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": user_to_out_dict(user)
            }
        }

    email_clean = req.email.strip().lower() if req.email else ""
    SecurityService.check_brute_force_and_verify_captcha(
        db=db,
        ip_address=ip,
        email=email_clean,
        event_type="login",
        captcha_id=req.captcha_id,
        captcha_answer=req.captcha_answer
    )
    
    user = db.query(User).filter(User.email.ilike(email_clean)).first()
    if not user or not verify_password(req.password, user.password_hash):
        SecurityService.log_security_event(db, ip, email_clean, "login_failed", "Invalid credentials", request=request)
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
        
    # User is unverified until confirmed
    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail={"message": "Please verify your email address to log in.", "unverified": True}
        )

    access_token = create_access_token({"sub": str(user.id), "role": user.role, "pwd": user.password_hash[-10:]})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    SecurityService.log_security_event(db, ip, email_clean, "login_success", request=request)
    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": user_to_out_dict(user)
        }
    }

@router.post("/verify-email")
async def verify_email(req: EmailVerificationRequest, db: Session = Depends(get_db)):
    db_token = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token == req.token,
        EmailVerificationToken.is_used == False,
        EmailVerificationToken.expires_at >= datetime.datetime.utcnow()
    ).first()
    if not db_token:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
        
    user = db.query(User).filter(User.id == db_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_verified = True
    db_token.is_used = True
    db.commit()
    
    return {
        "success": True,
        "data": {"message": "Email successfully verified. You can now log in."}
    }

@router.post("/refresh")
async def refresh_tokens(refresh_token: str, db: Session = Depends(get_db)):
    payload = decode_token(refresh_token, is_refresh=True)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
        
    access_token = create_access_token({"sub": str(user.id), "role": user.role, "pwd": user.password_hash[-10:]})
    new_refresh_token = create_refresh_token({"sub": str(user.id)})
    
    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "refresh_token": new_refresh_token
        }
    }

@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(req: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    ip = get_remote_address(request)
    email_clean = req.email.strip().lower()
    
    user = db.query(User).filter(User.email.ilike(email_clean)).first()
    if user:
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.is_used == False
        ).update({"is_used": True})
        
        raw_token = secrets.token_urlsafe(32)
        hashed_token = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
        
        reset_token_obj = PasswordResetToken(
            user_id=user.id,
            hashed_token=hashed_token,
            expires_at=expires_at,
            is_used=False
        )
        db.add(reset_token_obj)
        db.commit()
        
        reset_link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={raw_token}"
        user_agent = request.headers.get("user-agent")
        EmailService.send_password_reset(user.email, user.name, reset_link, ip, user_agent)
        
        SecurityService.log_security_event(db, ip, email_clean, "forgot_password_success", "Token generated and sent", request=request)
        
    return {
        "success": True,
        "data": {"message": "If the email is registered, a password reset link has been sent."}
    }

@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(req: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    ip = get_remote_address(request)
    token_hash = hashlib.sha256(req.token.encode('utf-8')).hexdigest()
    
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.hashed_token == token_hash,
        PasswordResetToken.is_used == False,
        PasswordResetToken.expires_at >= datetime.datetime.utcnow()
    ).first()
    
    if not reset_token:
        SecurityService.log_security_event(db, ip, None, "reset_password_failed", "Invalid or expired token", request=request)
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    try:
        validate_password_strength(req.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    user.password_hash = hash_password(req.new_password)
    reset_token.is_used = True
    db.commit()
    
    user_agent = request.headers.get("user-agent")
    SecurityService.log_security_event(db, ip, user.email, "reset_password_success", "Password reset successfully", request=request)
    EmailService.send_password_changed(user.email, user.name, ip, user_agent)
    
    return {
        "success": True,
        "data": {"message": "Your password has been reset successfully."}
    }

@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {
        "success": True,
        "data": user_to_out_dict(current_user)
    }

@router.put("/update-profile")
async def update_profile(
    req: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if req.name is not None:
        name_val = req.name.strip()
        if not name_val:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        user.name = name_val
    if req.phone is not None:
        user.phone = req.phone.strip()
    if req.company is not None:
        user.company = req.company.strip()
    if req.job_title is not None:
        user.job_title = req.job_title.strip()
    if req.timezone is not None:
        user.timezone = req.timezone.strip()
    
    db.commit()
    db.refresh(user)
    return {
        "success": True,
        "data": user_to_out_dict(user)
    }

@router.put("/change-password")
@router.post("/change-password")
@limiter.limit("5/minute")
async def change_password(
    req: ChangePasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ip = get_remote_address(request)
    
    if not verify_password(req.old_password, current_user.password_hash):
        SecurityService.log_security_event(db, ip, current_user.email, "change_password_failed", "Incorrect current password", request=request)
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    try:
        validate_password_strength(req.new_password)
    except ValueError as e:
        SecurityService.log_security_event(db, ip, current_user.email, "change_password_failed", f"Weak password: {str(e)}", request=request)
        raise HTTPException(status_code=400, detail=str(e))
        
    current_user.password_hash = hash_password(req.new_password)
    db.commit()
    
    SecurityService.log_security_event(db, ip, current_user.email, "change_password_success", "Password updated successfully", request=request)
    return {
        "success": True,
        "data": {"message": "Password updated successfully"}
    }

