"""
email_service.py — Resend email integration with Apple-style HTML templates
"""
import os
import datetime
import requests
import resend
import re
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "onboarding@resend.dev")
EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER", "resend").lower()
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
MAILGUN_API_KEY = os.getenv("MAILGUN_API_KEY", "")
MAILGUN_DOMAIN = os.getenv("MAILGUN_DOMAIN", "")
MAILGUN_API_URL = os.getenv("MAILGUN_API_URL", "https://api.mailgun.net/v3")


def _html_to_text(html: str) -> str:
    # Remove script and style elements
    text = re.sub(r'<(script|style)\b[^>]*>([\s\S]*?)<\/\1>', '', html, flags=re.IGNORECASE)
    # Remove standard HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)
    # Normalize whitespace
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
      <!-- Header -->
      <tr><td style="padding-bottom:24px;text-align:center;">
        <span style="font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.5px;">SISU</span>
      </td></tr>
      <!-- Card -->
      <tr><td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:40px;box-shadow:0 1px 3px 0 rgba(0,0,0,0.05);">
        {content}
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding-top:24px;text-align:center;">
        <p style="color:#6b7280;font-size:12px;margin:0;">© 2024 SISU Mentorship Platform. All rights reserved.</p>
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


# ── Template builders ──────────────────────────────────────────────────────────

def _booking_received_html(client_name: str, meeting: dict) -> str:
    content = f"""
<h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 8px;letter-spacing:-0.5px;">Booking Request Received</h1>
<p style="color:#4b5563;font-size:15px;margin:0 0 24px;">Hi {client_name}, we've received your meeting request and it's now under review.</p>
{_meeting_card(meeting.get('title','Meeting'), meeting.get('date','TBD'), meeting.get('time','TBD'), meeting.get('type','Session'), meeting.get('duration','60 mins'), meeting.get('priority','normal'))}
<p style="color:#6b7280;font-size:14px;line-height:1.6;margin:16px 0 0;">
  Our team will review your request and get back to you within 24 hours. You'll receive an email notification once a decision is made.
</p>
{_cta_button("View My Dashboard", "#")}"""
    return _base_template(content, "Your meeting request has been received — we'll be in touch soon.")


def _meeting_approved_html(client_name: str, meeting: dict, meet_link: str = "") -> str:
    meet_section = f"""
<div style="background:#e0e7ff;border:1px solid #c7d2fe;border-radius:12px;padding:16px;margin:16px 0;text-align:center;">
  <p style="color:#4338ca;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Meeting Link</p>
  <a href="{meet_link}" style="color:#6366f1;font-size:14px;word-break:break-all;font-weight:500;">{meet_link}</a>
</div>""" if meet_link else ""

    description = meeting.get("description", "")
    description_section = f"""
<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:16px 0;">
  <p style="color:#4b5563;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Things We Discussed / Agenda</p>
  <p style="color:#1f2937;font-size:14px;margin:0;line-height:1.5;">{description}</p>
</div>""" if description else ""

    content = f"""
<div style="text-align:center;margin-bottom:24px;">
  <div style="display:inline-block;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:24px;color:#10b981;text-align:center;">✓</div>
</div>
<h1 style="color:#10b981;font-size:24px;font-weight:700;margin:0 0 8px;text-align:center;">Meeting Approved!</h1>
<p style="color:#4b5563;font-size:15px;margin:0 0 24px;text-align:center;">Hi {client_name}, the meeting is booked and please make sure to check it in the google calendar.</p>
{_meeting_card(meeting.get('title','Meeting'), meeting.get('date','TBD'), meeting.get('time','TBD'), meeting.get('type','Session'), meeting.get('duration','60 mins'), meeting.get('priority','normal'))}
{description_section}
{meet_section}
{_cta_button("Add to Calendar", "#", "#10b981")}"""
    return _base_template(content, "Great news! Your meeting has been approved.")


def _meeting_rejected_html(client_name: str, meeting: dict, reason: str = "") -> str:
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
{_cta_button("Request New Meeting", "#", "#ef4444")}"""
    return _base_template(content, "Your meeting request was not approved — you can try again.")


def _meeting_rescheduled_html(client_name: str, old_meeting: dict, new_meeting: dict) -> str:
    content = f"""
<h1 style="color:#f97316;font-size:24px;font-weight:700;margin:0 0 8px;">Meeting Rescheduled</h1>
<p style="color:#4b5563;font-size:15px;margin:0 0 24px;">Hi {client_name}, your meeting has been rescheduled to a new time.</p>
<p style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;font-weight:600;">Original Time</p>
{_meeting_card(old_meeting.get('title','Meeting'), old_meeting.get('date','TBD'), old_meeting.get('time','TBD'), old_meeting.get('type','Session'), old_meeting.get('duration','60 mins'))}
<p style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;font-weight:600;">New Time</p>
{_meeting_card(new_meeting.get('title','Meeting'), new_meeting.get('date','TBD'), new_meeting.get('time','TBD'), new_meeting.get('type','Session'), new_meeting.get('duration','60 mins'))}
{_cta_button("View Updated Meeting", "#", "#f97316")}"""
    return _base_template(content, "Your meeting has been rescheduled.")


def _cancellation_html(client_name: str, meeting: dict) -> str:
    content = f"""
<h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 8px;">Meeting Cancelled</h1>
<p style="color:#4b5563;font-size:15px;margin:0 0 24px;">Hi {client_name}, your meeting has been cancelled.</p>
{_meeting_card(meeting.get('title','Meeting'), meeting.get('date','TBD'), meeting.get('time','TBD'), meeting.get('type','Session'), meeting.get('duration','60 mins'))}
<p style="color:#6b7280;font-size:14px;text-align:center;margin:16px 0 0;">You can rebook a meeting at any time from your dashboard.</p>
{_cta_button("Book a New Meeting", "#")}"""
    return _base_template(content, "Your meeting has been cancelled.")


def _reminder_html(client_name: str, meeting: dict) -> str:
    content = f"""
<h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 8px;">Meeting Reminder</h1>
<p style="color:#4b5563;font-size:15px;margin:0 0 24px;">Hi {client_name}, this is a reminder that you have an upcoming meeting.</p>
{_meeting_card(meeting.get('title','Meeting'), meeting.get('date','TBD'), meeting.get('time','TBD'), meeting.get('type','Session'), meeting.get('duration','60 mins'), meeting.get('priority','normal'))}
{_cta_button("Join Meeting", meeting.get('meet_link', '#'), "#6366f1")}"""
    return _base_template(content, "You have a meeting coming up soon!")


def _send(to: str, subject: str, html: str) -> bool:
    try:
        text_content = _html_to_text(html)
        
        # Development mode: log emails instead of sending when API keys are not set
        if EMAIL_PROVIDER == "sendgrid":
            if not SENDGRID_API_KEY:
                print(f"[Email Dev Mode] Would send email to {to} with subject: '{subject}'")
                print(f"[Email Dev Mode] Email provider: SendGrid (API key not set)")
                return True  # Return True to allow development to continue
            url = "https://api.sendgrid.com/v3/mail/send"
            headers = {
                "Authorization": f"Bearer {SENDGRID_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "personalizations": [{"to": [{"email": to}]}],
                "from": {"email": FROM_EMAIL},
                "subject": subject,
                "content": [
                    {"type": "text/plain", "value": text_content},
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
            
        elif EMAIL_PROVIDER == "mailgun":
            if not MAILGUN_API_KEY or not MAILGUN_DOMAIN:
                print(f"[Email Dev Mode] Would send email to {to} with subject: '{subject}'")
                print(f"[Email Dev Mode] Email provider: Mailgun (API key not set)")
                return True  # Return True to allow development to continue
            url = f"{MAILGUN_API_URL.rstrip('/')}/{MAILGUN_DOMAIN}/messages"
            payload = {
                "from": FROM_EMAIL,
                "to": to,
                "subject": subject,
                "html": html,
                "text": text_content,
                "h:Auto-Submitted": "auto-generated",
                "h:X-Auto-Response-Suppress": "All",
                "h:Precedence": "bulk"
            }
            res = requests.post(url, auth=("api", MAILGUN_API_KEY), data=payload)
            res.raise_for_status()
            return True
            
        elif EMAIL_PROVIDER == "smtp":
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            smtp_host = os.getenv("SMTP_HOST", "")
            smtp_port_str = os.getenv("SMTP_PORT", "587")
            smtp_port = int(smtp_port_str) if smtp_port_str.isdigit() else 587
            smtp_user = os.getenv("SMTP_USER", "")
            smtp_password = os.getenv("SMTP_PASSWORD", "")
            
            if not smtp_host or not smtp_user or not smtp_password:
                print(f"[Email Dev Mode] Would send email to {to} with subject: '{subject}'")
                print(f"[Email Dev Mode] Email provider: SMTP (config incomplete)")
                return True  # Return True to allow development to continue
                
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = FROM_EMAIL or smtp_user
            msg["To"] = to
            msg["Auto-Submitted"] = "auto-generated"
            msg["X-Auto-Response-Suppress"] = "All"
            msg["Precedence"] = "bulk"
            
            part_text = MIMEText(text_content, "plain")
            part_html = MIMEText(html, "html")
            msg.attach(part_text)
            msg.attach(part_html)
            
            # Direct SSL vs TLS routing
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
            
        elif EMAIL_PROVIDER == "webhook":
            webhook_url = os.getenv("EMAIL_WEBHOOK_URL", "")
            if not webhook_url:
                print(f"[Email Dev Mode] Would send email to {to} with subject: '{subject}'")
                print(f"[Email Dev Mode] Email provider: Webhook (URL not set)")
                return True  # Return True to allow development to continue
            payload = {
                "to": to,
                "subject": subject,
                "html": html,
                "text": text_content
            }
            res = requests.post(webhook_url, json=payload, timeout=10)
            res.raise_for_status()
            return True
            
        elif EMAIL_PROVIDER == "gmail":
            # Use Google Gmail API for sending emails
            try:
                import google_integration
                from google.oauth2.credentials import Credentials
                from googleapiclient.discovery import build
                from google.auth.transport.requests import Request
                import base64
                from email.message import EmailMessage
                
                # Get credentials from google_integration
                creds = google_integration.get_credentials()
                if not creds:
                    print(f"[Email Dev Mode] Would send email to {to} with subject: '{subject}'")
                    print(f"[Email Dev Mode] Email provider: Gmail (credentials not set)")
                    return True  # Return True to allow development to continue
                
                service = build('gmail', 'v1', credentials=creds)
                
                message = EmailMessage()
                message.set_content(text_content)
                message.add_alternative(html, subtype='html')
                message['To'] = to
                message['From'] = FROM_EMAIL
                message['Subject'] = subject
                message['Auto-Submitted'] = 'auto-generated'
                message['X-Auto-Response-Suppress'] = 'All'
                message['Precedence'] = 'bulk'
                
                encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
                
                create_message = {
                    'raw': encoded_message
                }
                
                send_message = service.users().messages().send(
                    userId="me",
                    body=create_message
                ).execute()
                
                print(f"[Gmail API] Email sent successfully. Message ID: {send_message['id']}")
                return True
                
            except Exception as gmail_err:
                print(f"[Gmail API Error] {gmail_err}")
                return False
            
        else:  # Default resend
            if not resend.api_key:
                print(f"[Email Dev Mode] Would send email to {to} with subject: '{subject}'")
                print(f"[Email Dev Mode] Email provider: Resend (API key not set)")
                return True  # Return True to allow development to continue
            resend.Emails.send({
                "from": FROM_EMAIL,
                "to": [to],
                "subject": subject,
                "html": html,
                "text": text_content,
                "headers": {
                    "Auto-Submitted": "auto-generated",
                    "X-Auto-Response-Suppress": "All",
                    "Precedence": "bulk"
                }
            })
            return True
    except Exception as e:
        print(f"[Email Error via {EMAIL_PROVIDER}] {e}")
        return False



def send_booking_received(to: str, client_name: str, meeting: dict) -> bool:
    return _send(to, "Your booking request has been received — SISU", _booking_received_html(client_name, meeting))


def send_meeting_approved(to: str, client_name: str, meeting: dict, meet_link: str = "") -> bool:
    return _send(to, "Your meeting is confirmed — SISU", _meeting_approved_html(client_name, meeting, meet_link))


def send_meeting_rejected(to: str, client_name: str, meeting: dict, reason: str = "") -> bool:
    return _send(to, "Meeting request update — SISU", _meeting_rejected_html(client_name, meeting, reason))


def send_meeting_rescheduled(to: str, client_name: str, old_meeting: dict, new_meeting: dict) -> bool:
    return _send(to, "Your meeting has been rescheduled — SISU", _meeting_rescheduled_html(client_name, old_meeting, new_meeting))


def send_cancellation(to: str, client_name: str, meeting: dict) -> bool:
    return _send(to, "Meeting cancelled — SISU", _cancellation_html(client_name, meeting))


def send_reminder(to: str, client_name: str, meeting: dict) -> bool:
    return _send(to, "Meeting reminder — SISU", _reminder_html(client_name, meeting))


def send_password_reset(to: str, client_name: str, reset_link: str, ip_address: str = None, user_agent: str = None) -> bool:
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
  <strong>Expiration Warning:</strong> This link is valid for 15 minutes and can only be used once.
</div>

{_cta_button("Reset Password", reset_link, "#6366f1")}

{metadata_html}

<p style="color:#6b7280;font-size:13px;line-height:1.6;margin:24px 0 0;word-break:break-all;text-align:left;">
  If the button above doesn't work, copy and paste this URL into your browser:<br>
  <a href="{reset_link}" style="color:#6366f1;text-decoration:none;">{reset_link}</a>
</p>

<div style="margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;text-align:left;">
  <p style="color:#6b7280;font-size:12px;line-height:1.5;margin:0;">
    <strong>Security Notice:</strong> If you did not request this password reset, please ignore this email. Your password will remain unchanged, but you may want to review your account security if you suspect unauthorized access.
  </p>
</div>
"""
    return _send(to, "Reset your password — SISU", _base_template(content, "Password reset request for your SISU account"))


def send_password_changed(to: str, client_name: str, ip_address: str = None, user_agent: str = None) -> bool:
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

{metadata_html}

<div style="margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;text-align:left;">
  <div style="background:#fef2f2;border:1px solid #fee2e2;border-radius:12px;padding:16px;">
    <p style="color:#b91c1c;font-size:12px;line-height:1.5;margin:0;">
      <strong>Crucial Security Notice:</strong> If you did not make this change, please contact our support team immediately and reset your password to secure your account.
    </p>
  </div>
</div>
"""
    return _send(to, "Your password has been changed — SISU", _base_template(content, "Password change notification for your SISU account"))


def send_reschedule_proposed(to: str, client_name: str, old_meeting: dict, new_meeting: dict) -> bool:
    content = f"""
<h1 style="color:#f97316;font-size:24px;font-weight:700;margin:0 0 8px;">Reschedule Proposed</h1>
<p style="color:#4b5563;font-size:15px;margin:0 0 24px;">Hi {client_name}, the admin has proposed a new time for your meeting. Please log in to your dashboard to Accept & Block this slot or call to negotiate.</p>
<p style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;font-weight:600;">Original Time</p>
{_meeting_card(old_meeting.get('title','Meeting'), old_meeting.get('date','TBD'), old_meeting.get('time','TBD'), old_meeting.get('type','Session'), old_meeting.get('duration','60 mins'))}
<p style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;font-weight:600;">Proposed New Time</p>
{_meeting_card(new_meeting.get('title','Meeting'), new_meeting.get('date','TBD'), new_meeting.get('time','TBD'), new_meeting.get('type','Session'), new_meeting.get('duration','60 mins'))}
{_cta_button("Review on Dashboard", "#", "#f97316")}"""
    return _send(to, "Reschedule Proposed for your meeting — SISU", _base_template(content, "The admin proposed to reschedule your meeting."))


