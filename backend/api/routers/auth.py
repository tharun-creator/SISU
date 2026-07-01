import os
import secrets
import hashlib
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Request, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from slowapi.util import get_remote_address

from database import get_db, User, PasswordResetToken
from api.limiter import limiter
import auth
from auth import get_current_user, require_admin
import email_service
from services.captcha_service import CaptchaService
from services.security_service import SecurityService

from api.schemas import (
    CaptchaResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UpdateProfileRequest,
    ChangePasswordRequest
)

# Auth Router supports /api/auth and backwards compat /auth
router = APIRouter(prefix="", tags=["Authentication"])

@router.get("/api/auth/captcha", response_model=CaptchaResponse)
@router.get("/auth/captcha", response_model=CaptchaResponse)
@limiter.limit("30/minute")
async def get_captcha(request: Request, db: Session = Depends(get_db)):
    challenge_id, question = CaptchaService.generate_challenge(db)
    return CaptchaResponse(captcha_id=challenge_id, question=question)


@router.post("/api/auth/register")
@router.post("/auth/register")
@limiter.limit("5/minute")
async def register(req: auth.RegisterRequest, request: Request, db: Session = Depends(get_db)):
    ip = get_remote_address(request)
    try:
        res = auth.register_user(req, db)
        SecurityService.log_security_event(db, ip, req.email.strip(), "register_success", request=request)
        return res
    except HTTPException as e:
        SecurityService.log_security_event(db, ip, req.email.strip(), "register_failed", e.detail, request=request)
        raise e


@router.post("/api/auth/login")
@router.post("/auth/login")
@limiter.limit("10/minute")
async def login(req: auth.LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = get_remote_address(request)
    if req.google_credential:
        try:
            res = auth.login_google_user(req.google_credential, db)
            # res is a TokenResponse, res.user is a dict
            email_val = res.user.get("email") if hasattr(res, "user") else ""
            SecurityService.log_security_event(db, ip, email_val, "google_login_success", request=request)
            return res
        except HTTPException as e:
            SecurityService.log_security_event(db, ip, None, "google_login_failed", e.detail, request=request)
            raise e
        except Exception as e:
            SecurityService.log_security_event(db, ip, None, "google_login_failed", str(e), request=request)
            raise HTTPException(status_code=400, detail=f"Google login failed: {str(e)}")
            
    email_clean = req.email.strip() if req.email else ""
    SecurityService.check_brute_force_and_verify_captcha(
        db=db,
        ip_address=ip,
        email=email_clean,
        event_type="login",
        captcha_id=req.captcha_id,
        captcha_answer=req.captcha_answer
    )
    
    try:
        res = auth.login_user(req, db)
        SecurityService.log_security_event(db, ip, email_clean, "login_success", request=request)
        return res
    except HTTPException as e:
        if e.status_code == 401:
            SecurityService.log_security_event(db, ip, email_clean, "login_failed", "Invalid credentials", request=request)
        raise e


@router.get("/api/auth/me")
@router.get("/auth/me")
async def me(current_user: User = Depends(get_current_user)):
    return auth.user_to_dict(current_user)


@router.post("/api/auth/forgot-password")
@router.post("/auth/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(req: ForgotPasswordRequest, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    ip = get_remote_address(request)
    email_clean = req.email.strip()
    
    SecurityService.check_brute_force_and_verify_captcha(
        db=db,
        ip_address=ip,
        email=email_clean,
        event_type="forgot_password",
        captcha_id=req.captcha_id,
        captcha_answer=req.captcha_answer
    )
    
    user = db.query(User).filter(User.email.ilike(email_clean)).first()
    if user:
        # Invalidate existing active tokens
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.is_used == False
        ).update({"is_used": True})
        
        # Create a new secure token
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
        
        # Build reset link
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        reset_link = f"{frontend_url.rstrip('/')}/reset-password?token={raw_token}"
        
        print("\n" + "="*80)
        print(f" PASSWORD RESET REQUESTED FOR: {user.email}")
        print(f" RESET LINK: {reset_link}")
        print("="*80 + "\n")
        
        user_agent = request.headers.get("user-agent")
        try:
            email_service.send_password_reset(user.email, user.name, reset_link, ip, user_agent)
        except Exception as email_err:
            print(f"[Email Send Error] {email_err}")
        
        SecurityService.log_security_event(db, ip, email_clean, "forgot_password_success", "Token generated and sent", request=request)
    else:
        SecurityService.log_security_event(db, ip, email_clean, "forgot_password_success", "Non-existent email requested", request=request)
        
    return {"detail": "If an account exists, a link has been sent."}


@router.post("/api/auth/reset-password")
@router.post("/auth/reset-password")
@limiter.limit("5/minute")
async def reset_password(req: ResetPasswordRequest, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    ip = get_remote_address(request)
    
    SecurityService.check_brute_force_and_verify_captcha(
        db=db,
        ip_address=ip,
        email="",
        event_type="reset_password",
        captcha_id=req.captcha_id,
        captcha_answer=req.captcha_answer
    )
    
    token_hash = hashlib.sha256(req.token.encode('utf-8')).hexdigest()
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.hashed_token == token_hash
    ).first()
    
    if not reset_token or reset_token.is_used or reset_token.expires_at < datetime.datetime.utcnow():
        SecurityService.log_security_event(db, ip, None, "reset_password_failed", "Invalid or expired token", request=request)
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    try:
        auth.validate_password_strength(req.password)
    except ValueError as e:
        SecurityService.log_security_event(db, ip, user.email, "reset_password_failed", f"Weak password: {str(e)}", request=request)
        raise HTTPException(status_code=400, detail=str(e))
        
    user.password_hash = auth.hash_password(req.password)
    reset_token.is_used = True
    db.commit()
    
    user_agent = request.headers.get("user-agent")
    SecurityService.log_security_event(db, ip, user.email, "reset_password_success", "Password reset successfully", request=request)
    
    try:
        email_service.send_password_changed(user.email, user.name, ip, user_agent)
    except Exception as email_err:
        print(f"[Email Send Error] {email_err}")
    
    return {"detail": "Your password has been reset successfully."}


@router.put("/api/auth/update-profile")
@router.put("/auth/update-profile")
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
    return auth.user_to_dict(user)


@router.put("/api/auth/change-password")
@router.post("/api/auth/change-password")
@router.post("/auth/change-password")
@limiter.limit("5/minute")
async def change_password(
    req: ChangePasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ip = get_remote_address(request)
    
    if not auth.verify_password(req.current_password, current_user.password_hash):
        SecurityService.log_security_event(db, ip, current_user.email, "change_password_failed", "Incorrect current password", request=request)
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    try:
        auth.validate_password_strength(req.new_password)
    except ValueError as e:
        SecurityService.log_security_event(db, ip, current_user.email, "change_password_failed", f"Weak password: {str(e)}", request=request)
        raise HTTPException(status_code=400, detail=str(e))
        
    current_user.password_hash = auth.hash_password(req.new_password)
    db.commit()
    
    SecurityService.log_security_event(db, ip, current_user.email, "change_password_success", "Password updated successfully", request=request)
    return {"detail": "Password updated successfully"}
