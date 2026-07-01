import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    DATABASE_URL: str = Field(..., validation_alias="DATABASE_URL")
    JWT_SECRET: str = Field(..., validation_alias="JWT_SECRET")
    JWT_REFRESH_SECRET: Optional[str] = Field(None, validation_alias="JWT_REFRESH_SECRET")
    ALLOWED_ORIGINS: str = Field("*", validation_alias="ALLOWED_ORIGINS")
    FRONTEND_URL: str = Field("http://localhost:5173", validation_alias="FRONTEND_URL")
    
    EMAIL_PROVIDER: str = Field("resend", validation_alias="EMAIL_PROVIDER")
    FROM_EMAIL: str = Field("onboarding@resend.dev", validation_alias="FROM_EMAIL")
    RESEND_API_KEY: Optional[str] = Field(None, validation_alias="RESEND_API_KEY")
    
    GOOGLE_CLIENT_ID: Optional[str] = Field(None, validation_alias="GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: Optional[str] = Field(None, validation_alias="GOOGLE_CLIENT_SECRET")
    GOOGLE_REFRESH_TOKEN: Optional[str] = Field(None, validation_alias="GOOGLE_REFRESH_TOKEN")
    
    ZAPIER_SECRET: Optional[str] = Field(None, validation_alias="ZAPIER_SECRET")
    ZAPIER_WEBHOOK_URL: Optional[str] = Field(None, validation_alias="ZAPIER_WEBHOOK_URL")
    
    GEMINI_API_KEY: Optional[str] = Field(None, validation_alias="GEMINI_API_KEY")
    
    SENDGRID_API_KEY: Optional[str] = Field(None, validation_alias="SENDGRID_API_KEY")
    MAILGUN_API_KEY: Optional[str] = Field(None, validation_alias="MAILGUN_API_KEY")
    MAILGUN_DOMAIN: Optional[str] = Field(None, validation_alias="MAILGUN_DOMAIN")
    MAILGUN_API_URL: str = Field("https://api.mailgun.net/v3", validation_alias="MAILGUN_API_URL")
    
    ADMIN_EMAILS: str = Field("tharunriot@gmail.com", validation_alias="ADMIN_EMAILS")
    
    CLOUDFLARE_TURNSTILE_SECRET: Optional[str] = Field(None, validation_alias="CLOUDFLARE_TURNSTILE_SECRET")
    CLOUDFLARE_TURNSTILE_SITEKEY: Optional[str] = Field(None, validation_alias="CLOUDFLARE_TURNSTILE_SITEKEY")

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def allowed_origins_list(self) -> List[str]:
        if not self.ALLOWED_ORIGINS or self.ALLOWED_ORIGINS == "*":
            return []
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def admin_emails_list(self) -> List[str]:
        return [email.strip().lower() for email in self.ADMIN_EMAILS.split(",") if email.strip()]

settings = Settings()
