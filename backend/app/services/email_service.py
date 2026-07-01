import os
import datetime
import requests
import re
from typing import Dict, Any, Optional
from app.config import settings
from app.core.logging import logger

def _html_to_text(html: str) -> str:
    text = re.sub(r'<(script|style)\b[^>]*>([\s\S]*?)<\/\1>', '', html, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def _base_template(content: str, preheader: str = "") -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SISU</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#374151;">
{f'<div style="display:none;max-height:0;overflow:hidden;">{preheader}</div>' if preheader else ''}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;min-height:100vh;padding:48px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr><td style="padding-bottom:24px;text-align:center;">
        <span style="font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.5px;">SISU</span>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:40px;box-shadow:0 1px 3px 0 rgba(0,0,0,0.05);">
        {content}
      </td></tr>
      <tr><td style="padding-top:24px;text-align:center;">
        <p style="color:#6b7280;font-size:12px;margin:0;">© {datetime.datetime.now().year} SISU Mentorship Platform. All rights reserved.</p>
        <p style="color:#9ca3af;font-size:11px;margin:8px 0 0;">You received this email because you have an account on SISU.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""

def _meeting_card(title: str, date: str, time: str, meeting_type: str, duration: str, priority: str = "normal") -> str:
    priority_colors = {"urgent": "#ef4444", "high": "#f97316", "normal": "#6366f1", "low": "#10b981"}
    color = priority_colors.get(priority, "#6366f1")
    return f"""
<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0;">
  <div style="margin-bottom:12px;">
    <span style="color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">{priority.upper()} PRIORITY</span>
  </div>
  <h3 style="color:#111827;font-size:16px;font-weight:600;margin:0 0 12px;">{title}</h3>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:6px 0;"><span style="color:#6b7280;font-size:13px;">📅 Date</span></td>
      <td style="padding:6px 0;text-align:right;"><span style="color:#111827;font-size:13px;font-weight:500;">{date}</span></td>
    </tr>
    <tr>
      <td style="padding:6px 0;"><span style="color:#6b7280;font-size:13px;">🕐 Time</span></td>
      <td style="padding:6px 0;text-align:right;"><span style="color:#111827;font-size:13px;font-weight:500;">{time}</span></td>
    </tr>
    <tr>
      <td style="padding:6px 0;"><span style="color:#6b7280;font-size:13px;">📋 Type</span></td>
      <td style="padding:6px 0;text-align:right;"><span style="color:#111827;font-size:13px;font-weight:500;">{meeting_type}</span></td>
    </tr>
    <tr>
      <td style="padding:6px 0;"><span style="color:#6b7280;font-size:13px;">⏱ Duration</span></td>
      <td style="padding:6px 0;text-align:right;"><span style="color:#111827;font-size:13px;font-weight:500;">{duration}</span></td>
    </tr>
  </table>
</div>"""

def _cta_button(text: str, url: str = "#", color: str = "#6366f1") -> str:
    return f"""
<div style="text-align:center;margin:24px 0 0;">
  <a href="{url}" style="display:inline-block;background:{color};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.2px;">
    {text}
  </a>
</div>"""


class EmailProvider:
    def send(self, to: str, subject: str, html: str) -> bool:
        raise NotImplementedError()


class ResendProvider(EmailProvider):
    def send(self, to: str, subject: str, html: str) -> bool:
        is_placeholder = not settings.RESEND_API_KEY or settings.RESEND_API_KEY.startswith("re_1234567890")
        if is_placeholder:
            links = re.findall(r'href="([^"#\s]+)"', html)
            logger.info(f"[Email Dev Mode] Resend email to {to} with subject: '{subject}'")
            if links:
                logger.info(f"[Email Dev Mode] Links found in email: {links}")
            return True
        try:
            import resend
            resend.api_key = settings.RESEND_API_KEY
            resend.Emails.send({
                "from": settings.FROM_EMAIL,
                "to": [to],
                "subject": subject,
                "html": html,
                "text": _html_to_text(html),
                "headers": {
                    "Auto-Submitted": "auto-generated",
                    "X-Auto-Response-Suppress": "All",
                    "Precedence": "bulk"
                }
            })
            return True
        except Exception as e:
            logger.error(f"Resend send failed: {e}")
            return False


class SendGridProvider(EmailProvider):
    def send(self, to: str, subject: str, html: str) -> bool:
        is_placeholder = not settings.SENDGRID_API_KEY or settings.SENDGRID_API_KEY.startswith("your-sendgrid")
        if is_placeholder:
            links = re.findall(r'href="([^"#\s]+)"', html)
            logger.info(f"[Email Dev Mode] SendGrid email to {to} with subject: '{subject}'")
            if links:
                logger.info(f"[Email Dev Mode] Links found in email: {links}")
            return True
        try:
            url = "https://api.sendgrid.com/v3/mail/send"
            headers = {
                "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "personalizations": [{"to": [{"email": to}]}],
                "from": {"email": settings.FROM_EMAIL},
                "subject": subject,
                "content": [
                    {"type": "text/plain", "value": _html_to_text(html)},
                    {"type": "text/html", "value": html}
                ],
                "headers": {
                    "Auto-Submitted": "auto-generated",
                    "X-Auto-Response-Suppress": "All",
                    "Precedence": "bulk"
                }
            }
            res = requests.post(url, json=payload, headers=headers)
            res.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"SendGrid send failed: {e}")
            return False


class MailgunProvider(EmailProvider):
    def send(self, to: str, subject: str, html: str) -> bool:
        is_placeholder = not settings.MAILGUN_API_KEY or not settings.MAILGUN_DOMAIN or settings.MAILGUN_API_KEY.startswith("your-mailgun")
        if is_placeholder:
            links = re.findall(r'href="([^"#\s]+)"', html)
            logger.info(f"[Email Dev Mode] Mailgun email to {to} with subject: '{subject}'")
            if links:
                logger.info(f"[Email Dev Mode] Links found in email: {links}")
            return True
        try:
            url = f"{settings.MAILGUN_API_URL.rstrip('/')}/{settings.MAILGUN_DOMAIN}/messages"
            payload = {
                "from": settings.FROM_EMAIL,
                "to": to,
                "subject": subject,
                "html": html,
                "text": _html_to_text(html),
                "h:Auto-Submitted": "auto-generated",
                "h:X-Auto-Response-Suppress": "All",
                "h:Precedence": "bulk"
            }
            res = requests.post(url, auth=("api", settings.MAILGUN_API_KEY), data=payload)
            res.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Mailgun send failed: {e}")
            return False


class SMTPProvider(EmailProvider):
    def send(self, to: str, subject: str, html: str) -> bool:
        smtp_host = os.getenv("SMTP_HOST", "")
        smtp_port_str = os.getenv("SMTP_PORT", "587")
        smtp_port = int(smtp_port_str) if smtp_port_str.isdigit() else 587
        smtp_user = os.getenv("SMTP_USER", "")
        smtp_password = os.getenv("SMTP_PASSWORD", "")
        
        if not smtp_host or not smtp_user or not smtp_password:
            logger.info(f"[Email Dev Mode] Would send SMTP email to {to} with subject: '{subject}'")
            return True
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.FROM_EMAIL or smtp_user
            msg["To"] = to
            msg["Auto-Submitted"] = "auto-generated"
            msg["X-Auto-Response-Suppress"] = "All"
            msg["Precedence"] = "bulk"
            
            msg.attach(MIMEText(_html_to_text(html), "plain"))
            msg.attach(MIMEText(html, "html"))
            
            if smtp_port == 465 or os.getenv("SMTP_USE_SSL", "").lower() == "true":
                with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10) as server:
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_user, to, msg.as_string())
            else:
                with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_user, to, msg.as_string())
            return True
        except Exception as e:
            logger.error(f"SMTP send failed: {e}")
            return False


class GmailProvider(EmailProvider):
    def send(self, to: str, subject: str, html: str) -> bool:
        try:
            # Import dynamically to avoid top-level issues if google libraries aren't ready
            from app.services.calendar_service import get_google_credentials
            from googleapiclient.discovery import build
            import base64
            from email.message import EmailMessage
            
            creds = get_google_credentials()
            if not creds:
                logger.info(f"[Email Dev Mode] Gmail Provider: Credentials not found, logging email to {to}: '{subject}'")
                return True
                
            service = build('gmail', 'v1', credentials=creds)
            message = EmailMessage()
            message.set_content(_html_to_text(html))
            message.add_alternative(html, subtype='html')
            message['To'] = to
            message['From'] = settings.FROM_EMAIL
            message['Subject'] = subject
            message['Auto-Submitted'] = 'auto-generated'
            message['X-Auto-Response-Suppress'] = 'All'
            message['Precedence'] = 'bulk'
            
            encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
            send_message = service.users().messages().send(
                userId="me",
                body={'raw': encoded_message}
            ).execute()
            logger.info(f"[Gmail API] Email sent. ID: {send_message['id']}")
            return True
        except Exception as e:
            logger.error(f"Gmail send failed: {e}")
            return False


class WebhookProvider(EmailProvider):
    def send(self, to: str, subject: str, html: str) -> bool:
        webhook_url = os.getenv("EMAIL_WEBHOOK_URL", "")
        if not webhook_url:
            logger.info(f"[Email Dev Mode] Would send Webhook email to {to} with subject: '{subject}'")
            return True
        try:
            payload = {
                "to": to,
                "subject": subject,
                "html": html,
                "text": _html_to_text(html)
            }
            res = requests.post(webhook_url, json=payload, timeout=10)
            res.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Webhook send failed: {e}")
            return False


class EmailService:
    @staticmethod
    def get_provider() -> EmailProvider:
        provider_name = settings.EMAIL_PROVIDER.lower()
        if provider_name == "sendgrid":
            return SendGridProvider()
        elif provider_name == "mailgun":
            return MailgunProvider()
        elif provider_name == "smtp":
            return SMTPProvider()
        elif provider_name == "gmail":
            return GmailProvider()
        elif provider_name == "webhook":
            return WebhookProvider()
        return ResendProvider()

    @classmethod
    def send_email(cls, to: str, subject: str, html: str) -> bool:
        return cls.get_provider().send(to, subject, html)

    @classmethod
    def send_booking_received(cls, to: str, client_name: str, meeting: dict) -> bool:
        content = f"""
<h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 8px;letter-spacing:-0.5px;">Booking Request Received</h1>
<p style="color:#4b5563;font-size:15px;margin:0 0 24px;">Hi {client_name}, we've received your meeting request and it's now under review.</p>
{_meeting_card(meeting.get('title','Meeting'), meeting.get('date','TBD'), meeting.get('time','TBD'), meeting.get('type','Session'), meeting.get('duration','60 mins'), meeting.get('priority','normal'))}
<p style="color:#6b7280;font-size:14px;line-height:1.6;margin:16px 0 0;">
  Our team will review your request and get back to you within 24 hours. You'll receive an email notification once a decision is made.
</p>
{_cta_button("View My Dashboard", settings.FRONTEND_URL)}"""
        html = _base_template(content, "Your meeting request has been received — we'll be in touch soon.")
        return cls.send_email(to, "Your booking request has been received — SISU", html)

    @classmethod
    def send_meeting_approved(cls, to: str, client_name: str, meeting: dict, meet_link: str = "") -> bool:
        meet_section = f"""
<div style="background:#e0e7ff;border:1px solid #c7d2fe;border-radius:12px;padding:16px;margin:16px 0;text-align:center;">
  <p style="color:#4338ca;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Meeting Link</p>
  <a href="{meet_link}" style="color:#6366f1;font-size:14px;word-break:break-all;font-weight:500;">{meet_link}</a>
</div>""" if meet_link else ""

        description = meeting.get("description", "")
        description_section = f"""
<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:16px 0;">
  <p style="color:#4b5563;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Agenda / Description</p>
  <p style="color:#1f2937;font-size:14px;margin:0;line-height:1.5;">{description}</p>
</div>""" if description else ""

        content = f"""
<div style="text-align:center;margin-bottom:24px;">
  <div style="display:inline-block;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:24px;color:#10b981;text-align:center;">✓</div>
</div>
<h1 style="color:#10b981;font-size:24px;font-weight:700;margin:0 0 8px;text-align:center;">Meeting Approved!</h1>
<p style="color:#4b5563;font-size:15px;margin:0 0 24px;text-align:center;">Hi {client_name}, the meeting is booked and confirmed in the calendar.</p>
{_meeting_card(meeting.get('title','Meeting'), meeting.get('date','TBD'), meeting.get('time','TBD'), meeting.get('type','Session'), meeting.get('duration','60 mins'), meeting.get('priority','normal'))}
{description_section}
{meet_section}
{_cta_button("View on Dashboard", settings.FRONTEND_URL, "#10b981")}"""
        html = _base_template(content, "Great news! Your meeting has been approved.")
        return cls.send_email(to, "Your meeting is confirmed — SISU", html)

    @classmethod
    def send_meeting_rejected(cls, to: str, client_name: str, meeting: dict, reason: str = "") -> bool:
        reason_section = f"""
<div style="background:#fef2f2;border:1px solid #fee2e2;border-radius:12px;padding:16px;margin:16px 0;">
  <p style="color:#991b1b;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Reason</p>
  <p style="color:#7f1d1d;font-size:14px;margin:0;">{reason}</p>
</div>""" if reason else ""
        content = f"""
<div style="text-align:center;margin-bottom:24px;">
  <div style="display:inline-block;background:#fef2f2;border:1px solid #fecaca;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:24px;color:#ef4444;text-align:center;">✕</div>
</div>
<h1 style="color:#ef4444;font-size:24px;font-weight:700;margin:0 0 8px;text-align:center;">Meeting Declined</h1>
<p style="color:#4b5563;font-size:15px;margin:0 0 24px;text-align:center;">Hi {client_name}, unfortunately your meeting request was not approved at this time.</p>
{_meeting_card(meeting.get('title','Meeting'), meeting.get('date','TBD'), meeting.get('time','TBD'), meeting.get('type','Session'), meeting.get('duration','60 mins'))}
{reason_section}
<p style="color:#6b7280;font-size:14px;text-align:center;margin:16px 0 0;">You're welcome to submit a new request with a different time or topic.</p>
{_cta_button("Request New Meeting", settings.FRONTEND_URL, "#ef4444")}"""
        html = _base_template(content, "Your meeting request was not approved — you can try again.")
        return cls.send_email(to, "Meeting request update — SISU", html)

    @classmethod
    def send_meeting_rescheduled(cls, to: str, client_name: str, old_meeting: dict, new_meeting: dict) -> bool:
        content = f"""
<h1 style="color:#f97316;font-size:24px;font-weight:700;margin:0 0 8px;">Meeting Rescheduled</h1>
<p style="color:#4b5563;font-size:15px;margin:0 0 24px;">Hi {client_name}, your meeting has been rescheduled to a new time.</p>
<p style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;font-weight:600;">Original Time</p>
{_meeting_card(old_meeting.get('title','Meeting'), old_meeting.get('date','TBD'), old_meeting.get('time','TBD'), old_meeting.get('type','Session'), old_meeting.get('duration','60 mins'))}
<p style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;font-weight:600;">New Time</p>
{_meeting_card(new_meeting.get('title','Meeting'), new_meeting.get('date','TBD'), new_meeting.get('time','TBD'), new_meeting.get('type','Session'), new_meeting.get('duration','60 mins'))}
{_cta_button("View Updated Meeting", settings.FRONTEND_URL, "#f97316")}"""
        html = _base_template(content, "Your meeting has been rescheduled.")
        return cls.send_email(to, "Your meeting has been rescheduled — SISU", html)

    @classmethod
    def send_cancellation(cls, to: str, client_name: str, meeting: dict) -> bool:
        content = f"""
<h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 8px;">Meeting Cancelled</h1>
<p style="color:#4b5563;font-size:15px;margin:0 0 24px;">Hi {client_name}, your meeting has been cancelled.</p>
{_meeting_card(meeting.get('title','Meeting'), meeting.get('date','TBD'), meeting.get('time','TBD'), meeting.get('type','Session'), meeting.get('duration','60 mins'))}
<p style="color:#6b7280;font-size:14px;text-align:center;margin:16px 0 0;">You can rebook a meeting at any time from your dashboard.</p>
{_cta_button("Book a New Meeting", settings.FRONTEND_URL)}"""
        html = _base_template(content, "Your meeting has been cancelled.")
        return cls.send_email(to, "Meeting cancelled — SISU", html)

    @classmethod
    def send_reminder(cls, to: str, client_name: str, meeting: dict) -> bool:
        content = f"""
<h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 8px;">Meeting Reminder</h1>
<p style="color:#4b5563;font-size:15px;margin:0 0 24px;">Hi {client_name}, this is a reminder that you have an upcoming meeting.</p>
{_meeting_card(meeting.get('title','Meeting'), meeting.get('date','TBD'), meeting.get('time','TBD'), meeting.get('type','Session'), meeting.get('duration','60 mins'), meeting.get('priority','normal'))}
{_cta_button("Join Meeting", meeting.get('meet_link', '#'), "#6366f1")}"""
        html = _base_template(content, "You have a meeting coming up soon!")
        return cls.send_email(to, "Meeting reminder — SISU", html)

    @classmethod
    def send_password_reset(cls, to: str, client_name: str, reset_link: str, ip_address: str = None, user_agent: str = None) -> bool:
        metadata_html = ""
        if ip_address or user_agent:
            metadata_html = f"""
<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:24px 0;font-size:12px;color:#6b7280;line-height:1.5;text-align:left;">
  <strong style="color:#374151;">Request Details:</strong><br>
  {f"• IP Address: {ip_address}<br>" if ip_address else ""}
  {f"• Device/Browser: {user_agent}<br>" if user_agent else ""}
  • Time: {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
</div>"""

        content = f"""
<h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 8px;letter-spacing:-0.5px;text-align:center;">Reset Your Password</h1>
<p style="color:#4b5563;font-size:15px;margin:0 0 24px;text-align:left;">Hi {client_name},</p>
<p style="color:#4b5563;font-size:15px;margin:0 0 24px;text-align:left;">We received a request to reset your password. Click the button below to choose a new password.</p>
<div style="background:#fff7ed;border:1px solid #ffedd5;border-radius:12px;padding:12px 16px;margin:16px 0;color:#c2410c;font-size:13px;text-align:left;line-height:1.5;">
  <strong>Expiration Warning:</strong> This link is valid for 15 minutes.
</div>
{_cta_button("Reset Password", reset_link, "#6366f1")}
{metadata_html}"""
        html = _base_template(content, "Password reset request for your SISU account")
        return cls.send_email(to, "Reset your password — SISU", html)

    @classmethod
    def send_password_changed(cls, to: str, client_name: str, ip_address: str = None, user_agent: str = None) -> bool:
        metadata_html = ""
        if ip_address or user_agent:
            metadata_html = f"""
<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:24px 0;font-size:12px;color:#6b7280;line-height:1.5;text-align:left;">
  <strong style="color:#374151;">Change Details:</strong><br>
  {f"• IP Address: {ip_address}<br>" if ip_address else ""}
  {f"• Device/Browser: {user_agent}<br>" if user_agent else ""}
  • Time: {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
</div>"""

        content = f"""
<div style="text-align:center;margin-bottom:24px;">
  <div style="display:inline-block;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:24px;color:#10b981;text-align:center;">✓</div>
</div>
<h1 style="color:#10b981;font-size:24px;font-weight:700;margin:0 0 8px;text-align:center;">Password Changed</h1>
<p style="color:#4b5563;font-size:15px;margin:0 0 24px;text-align:left;">Hi {client_name},</p>
<p style="color:#4b5563;font-size:15px;margin:0 0 24px;text-align:left;">This is a confirmation that the password for your SISU account has been successfully changed.</p>
{metadata_html}"""
        html = _base_template(content, "Password change notification for your SISU account")
        return cls.send_email(to, "Your password has been changed — SISU", html)

    @classmethod
    def send_verification_email(cls, to: str, client_name: str, verification_link: str) -> bool:
        content = f"""
<h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 8px;letter-spacing:-0.5px;text-align:center;">Verify Your Email</h1>
<p style="color:#4b5563;font-size:15px;margin:0 0 24px;text-align:left;">Hi {client_name},</p>
<p style="color:#4b5563;font-size:15px;margin:0 0 24px;text-align:left;">Thank you for registering on SISU. Please click the button below to verify your email address and activate your account.</p>
{_cta_button("Verify Email", verification_link, "#6366f1")}"""
        html = _base_template(content, "Email verification link for your SISU account")
        return cls.send_email(to, "Verify your email address — SISU", html)

    @classmethod
    def send_reschedule_proposed(cls, to: str, client_name: str, old_meeting: dict, new_meeting: dict) -> bool:
        content = f"""
<h1 style="color:#f97316;font-size:24px;font-weight:700;margin:0 0 8px;">Reschedule Proposed</h1>
<p style="color:#4b5563;font-size:15px;margin:0 0 24px;">Hi {client_name}, the admin has proposed a new time for your meeting. Please log in to your dashboard to review this proposal.</p>
<p style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;font-weight:600;">Original Time</p>
{_meeting_card(old_meeting.get('title','Meeting'), old_meeting.get('date','TBD'), old_meeting.get('time','TBD'), old_meeting.get('type','Session'), old_meeting.get('duration','60 mins'))}
<p style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;font-weight:600;">Proposed New Time</p>
{_meeting_card(new_meeting.get('title','Meeting'), new_meeting.get('date','TBD'), new_meeting.get('time','TBD'), new_meeting.get('type','Session'), new_meeting.get('duration','60 mins'))}
{_cta_button("Review on Dashboard", settings.FRONTEND_URL, "#f97316")}"""
        html = _base_template(content, "The admin proposed to reschedule your meeting.")
        return cls.send_email(to, "Reschedule Proposed for your meeting — SISU", html)
