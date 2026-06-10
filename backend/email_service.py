"""
email_service.py — Resend email integration with Apple-style HTML templates
"""
import os
import datetime
import requests
import resend
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "onboarding@resend.dev")
EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER", "resend").lower()
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
MAILGUN_API_KEY = os.getenv("MAILGUN_API_KEY", "")
MAILGUN_DOMAIN = os.getenv("MAILGUN_DOMAIN", "")
MAILGUN_API_URL = os.getenv("MAILGUN_API_URL", "https://api.mailgun.net/v3")



def _base_template(content: str, preheader: str = "") -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SISU</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Inter',sans-serif;">
{f'<div style="display:none;max-height:0;overflow:hidden;">{preheader}</div>' if preheader else ''}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;min-height:100vh;padding:48px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <!-- Header -->
      <tr><td style="padding-bottom:32px;text-align:center;">
        <div style="display:inline-block;background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid rgba(99,102,241,0.3);border-radius:16px;padding:16px 32px;">
          <span style="font-size:22px;font-weight:700;background:linear-gradient(135deg,#818cf8,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-0.5px;">SISU</span>
        </div>
      </td></tr>
      <!-- Card -->
      <tr><td style="background:linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01));border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:48px;backdrop-filter:blur(40px);">
        {content}
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding-top:32px;text-align:center;">
        <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0;">© 2024 SISU Mentorship Platform. All rights reserved.</p>
        <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:8px 0 0;">You received this email because you have an account on SISU.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""


def _meeting_card(title: str, date: str, time: str, meeting_type: str, duration: str, priority: str = "normal") -> str:
    priority_colors = {"urgent": "#f87171", "high": "#fb923c", "normal": "#818cf8", "low": "#6ee7b7"}
    color = priority_colors.get(priority, "#818cf8")
    return f"""
<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin:24px 0;">
  <div style="display:flex;align-items:center;margin-bottom:16px;">
    <div style="width:8px;height:8px;border-radius:50%;background:{color};margin-right:10px;"></div>
    <span style="color:rgba(255,255,255,0.5);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">{priority.upper()} PRIORITY</span>
  </div>
  <h3 style="color:#fff;font-size:18px;font-weight:600;margin:0 0 16px;">{title}</h3>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:6px 0;"><span style="color:rgba(255,255,255,0.4);font-size:13px;">📅 Date</span></td>
      <td style="padding:6px 0;text-align:right;"><span style="color:#fff;font-size:13px;font-weight:500;">{date}</span></td>
    </tr>
    <tr>
      <td style="padding:6px 0;"><span style="color:rgba(255,255,255,0.4);font-size:13px;">🕐 Time</span></td>
      <td style="padding:6px 0;text-align:right;"><span style="color:#fff;font-size:13px;font-weight:500;">{time}</span></td>
    </tr>
    <tr>
      <td style="padding:6px 0;"><span style="color:rgba(255,255,255,0.4);font-size:13px;">📋 Type</span></td>
      <td style="padding:6px 0;text-align:right;"><span style="color:#fff;font-size:13px;font-weight:500;">{meeting_type}</span></td>
    </tr>
    <tr>
      <td style="padding:6px 0;"><span style="color:rgba(255,255,255,0.4);font-size:13px;">⏱ Duration</span></td>
      <td style="padding:6px 0;text-align:right;"><span style="color:#fff;font-size:13px;font-weight:500;">{duration}</span></td>
    </tr>
  </table>
</div>"""


def _cta_button(text: str, url: str = "#", color: str = "#818cf8") -> str:
    return f"""
<div style="text-align:center;margin:32px 0 0;">
  <a href="{url}" style="display:inline-block;background:linear-gradient(135deg,{color},{color}cc);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:600;letter-spacing:0.2px;">
    {text}
  </a>
</div>"""


# ── Template builders ──────────────────────────────────────────────────────────

def _booking_received_html(client_name: str, meeting: dict) -> str:
    content = f"""
<h1 style="color:#fff;font-size:28px;font-weight:700;margin:0 0 8px;letter-spacing:-0.5px;">Booking Request Received</h1>
<p style="color:rgba(255,255,255,0.6);font-size:15px;margin:0 0 24px;">Hi {client_name}, we've received your meeting request and it's now under review.</p>
{_meeting_card(meeting.get('title','Meeting'), meeting.get('date','TBD'), meeting.get('time','TBD'), meeting.get('type','Session'), meeting.get('duration','60 mins'), meeting.get('priority','normal'))}
<p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.6;margin:16px 0 0;">
  Our team will review your request and get back to you within 24 hours. You'll receive an email notification once a decision is made.
</p>
{_cta_button("View My Dashboard", "#")}"""
    return _base_template(content, "Your meeting request has been received — we'll be in touch soon.")


def _meeting_approved_html(client_name: str, meeting: dict, meet_link: str = "") -> str:
    meet_section = f"""
<div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:16px;margin:16px 0;text-align:center;">
  <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Meeting Link</p>
  <a href="{meet_link}" style="color:#818cf8;font-size:14px;word-break:break-all;">{meet_link}</a>
</div>""" if meet_link else ""

    description = meeting.get("description", "")
    description_section = f"""
<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;margin:16px 0;">
  <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">Things We Discussed / Agenda</p>
  <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:0;line-height:1.5;">{description}</p>
</div>""" if description else ""

    content = f"""
<div style="text-align:center;margin-bottom:32px;">
  <div style="display:inline-block;background:rgba(110,231,183,0.1);border:1px solid rgba(110,231,183,0.3);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;">✓</div>
</div>
<h1 style="color:#6ee7b7;font-size:28px;font-weight:700;margin:0 0 8px;text-align:center;">Meeting Approved!</h1>
<p style="color:rgba(255,255,255,0.6);font-size:15px;margin:0 0 24px;text-align:center;">Hi {client_name}, the meeting is booked and please make sure to check it in the google calendar.</p>
{_meeting_card(meeting.get('title','Meeting'), meeting.get('date','TBD'), meeting.get('time','TBD'), meeting.get('type','Session'), meeting.get('duration','60 mins'), meeting.get('priority','normal'))}
{description_section}
{meet_section}
{_cta_button("Add to Calendar", "#", "#6ee7b7")}"""
    return _base_template(content, "Great news! Your meeting has been approved.")


def _meeting_rejected_html(client_name: str, meeting: dict, reason: str = "") -> str:
    reason_section = f"""
<div style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);border-radius:12px;padding:16px;margin:16px 0;">
  <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">Reason</p>
  <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:0;">{reason}</p>
</div>""" if reason else ""
    content = f"""
<div style="text-align:center;margin-bottom:32px;">
  <div style="display:inline-block;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;">✕</div>
</div>
<h1 style="color:#f87171;font-size:28px;font-weight:700;margin:0 0 8px;text-align:center;">Meeting Declined</h1>
<p style="color:rgba(255,255,255,0.6);font-size:15px;margin:0 0 24px;text-align:center;">Hi {client_name}, unfortunately your meeting request was not approved at this time.</p>
{_meeting_card(meeting.get('title','Meeting'), meeting.get('date','TBD'), meeting.get('time','TBD'), meeting.get('type','Session'), meeting.get('duration','60 mins'))}
{reason_section}
<p style="color:rgba(255,255,255,0.5);font-size:14px;text-align:center;margin:16px 0 0;">You're welcome to submit a new request with a different time or topic.</p>
{_cta_button("Request New Meeting", "#", "#f87171")}"""
    return _base_template(content, "Your meeting request was not approved — you can try again.")


def _meeting_rescheduled_html(client_name: str, old_meeting: dict, new_meeting: dict) -> str:
    content = f"""
<h1 style="color:#fb923c;font-size:28px;font-weight:700;margin:0 0 8px;">Meeting Rescheduled</h1>
<p style="color:rgba(255,255,255,0.6);font-size:15px;margin:0 0 24px;">Hi {client_name}, your meeting has been rescheduled to a new time.</p>
<p style="color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Original Time</p>
{_meeting_card(old_meeting.get('title','Meeting'), old_meeting.get('date','TBD'), old_meeting.get('time','TBD'), old_meeting.get('type','Session'), old_meeting.get('duration','60 mins'))}
<p style="color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">New Time</p>
{_meeting_card(new_meeting.get('title','Meeting'), new_meeting.get('date','TBD'), new_meeting.get('time','TBD'), new_meeting.get('type','Session'), new_meeting.get('duration','60 mins'))}
{_cta_button("View Updated Meeting", "#", "#fb923c")}"""
    return _base_template(content, "Your meeting has been rescheduled.")


def _cancellation_html(client_name: str, meeting: dict) -> str:
    content = f"""
<h1 style="color:#fff;font-size:28px;font-weight:700;margin:0 0 8px;">Meeting Cancelled</h1>
<p style="color:rgba(255,255,255,0.6);font-size:15px;margin:0 0 24px;">Hi {client_name}, your meeting has been cancelled.</p>
{_meeting_card(meeting.get('title','Meeting'), meeting.get('date','TBD'), meeting.get('time','TBD'), meeting.get('type','Session'), meeting.get('duration','60 mins'))}
<p style="color:rgba(255,255,255,0.5);font-size:14px;text-align:center;margin:16px 0 0;">You can rebook a meeting at any time from your dashboard.</p>
{_cta_button("Book a New Meeting", "#")}"""
    return _base_template(content, "Your meeting has been cancelled.")


def _reminder_html(client_name: str, meeting: dict) -> str:
    content = f"""
<h1 style="color:#fff;font-size:28px;font-weight:700;margin:0 0 8px;">Meeting Reminder</h1>
<p style="color:rgba(255,255,255,0.6);font-size:15px;margin:0 0 24px;">Hi {client_name}, this is a reminder that you have an upcoming meeting.</p>
{_meeting_card(meeting.get('title','Meeting'), meeting.get('date','TBD'), meeting.get('time','TBD'), meeting.get('type','Session'), meeting.get('duration','60 mins'), meeting.get('priority','normal'))}
{_cta_button("Join Meeting", meeting.get('meet_link', '#'), "#818cf8")}"""
    return _base_template(content, "You have a meeting coming up soon!")


# ── Public send functions ──────────────────────────────────────────────────────

def _send(to: str, subject: str, html: str) -> bool:
    try:
        if EMAIL_PROVIDER == "sendgrid":
            if not SENDGRID_API_KEY:
                print("[Email Error] SENDGRID_API_KEY is not set.")
                return False
            url = "https://api.sendgrid.com/v3/mail/send"
            headers = {
                "Authorization": f"Bearer {SENDGRID_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "personalizations": [{"to": [{"email": to}]}],
                "from": {"email": FROM_EMAIL},
                "subject": subject,
                "content": [{"type": "text/html", "value": html}]
            }
            res = requests.post(url, json=payload, headers=headers)
            res.raise_for_status()
            return True
            
        elif EMAIL_PROVIDER == "mailgun":
            if not MAILGUN_API_KEY or not MAILGUN_DOMAIN:
                print("[Email Error] MAILGUN_API_KEY or MAILGUN_DOMAIN is not set.")
                return False
            url = f"{MAILGUN_API_URL.rstrip('/')}/{MAILGUN_DOMAIN}/messages"
            payload = {
                "from": FROM_EMAIL,
                "to": to,
                "subject": subject,
                "html": html
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
                print("[Email Error] SMTP config is incomplete (SMTP_HOST, SMTP_USER, SMTP_PASSWORD required).")
                return False
                
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = FROM_EMAIL or smtp_user
            msg["To"] = to
            
            part = MIMEText(html, "html")
            msg.attach(part)
            
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
                print("[Email Error] EMAIL_WEBHOOK_URL is not set.")
                return False
            payload = {
                "to": to,
                "subject": subject,
                "html": html
            }
            res = requests.post(webhook_url, json=payload, timeout=10)
            res.raise_for_status()
            return True
            
        else:  # Default resend
            resend.Emails.send({
                "from": FROM_EMAIL,
                "to": [to],
                "subject": subject,
                "html": html,
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
<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin:24px 0;font-size:12px;color:rgba(255,255,255,0.4);line-height:1.5;text-align:left;">
  <strong style="color:rgba(255,255,255,0.6);">Request Details:</strong><br>
  {f"• IP Address: {ip_address}<br>" if ip_address else ""}
  {f"• Device/Browser: {user_agent}<br>" if user_agent else ""}
  • Time: {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
</div>"""

    content = f"""
<h1 style="color:#fff;font-size:28px;font-weight:700;margin:0 0 8px;letter-spacing:-0.5px;text-align:center;">Reset Your Password</h1>
<p style="color:rgba(255,255,255,0.6);font-size:15px;margin:0 0 24px;text-align:left;">Hi {client_name},</p>
<p style="color:rgba(255,255,255,0.6);font-size:15px;margin:0 0 24px;text-align:left;">We received a request to reset your password. Click the button below to choose a new password.</p>

<div style="background:rgba(251,146,60,0.08);border:1px solid rgba(251,146,60,0.25);border-radius:12px;padding:12px 16px;margin:16px 0;color:#fb923c;font-size:13px;text-align:left;line-height:1.5;">
  <strong>Expiration Warning:</strong> This link is valid for 15 minutes and can only be used once.
</div>

{_cta_button("Reset Password", reset_link, "#818cf8")}

{metadata_html}

<p style="color:rgba(255,255,255,0.4);font-size:13px;line-height:1.6;margin:24px 0 0;word-break:break-all;text-align:left;">
  If the button above doesn't work, copy and paste this URL into your browser:<br>
  <a href="{reset_link}" style="color:#818cf8;text-decoration:none;">{reset_link}</a>
</p>

<div style="margin-top:24px;border-top:1px solid rgba(255,255,255,0.08);padding-top:16px;text-align:left;">
  <p style="color:rgba(255,255,255,0.4);font-size:12px;line-height:1.5;margin:0;">
    <strong>Security Notice:</strong> If you did not request this password reset, please ignore this email. Your password will remain unchanged, but you may want to review your account security if you suspect unauthorized access.
  </p>
</div>
"""
    return _send(to, "Reset your password — SISU", _base_template(content, "Password reset request for your SISU account"))


def send_password_changed(to: str, client_name: str, ip_address: str = None, user_agent: str = None) -> bool:
    metadata_html = ""
    if ip_address or user_agent:
        metadata_html = f"""
<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin:24px 0;font-size:12px;color:rgba(255,255,255,0.4);line-height:1.5;text-align:left;">
  <strong style="color:rgba(255,255,255,0.6);">Change Details:</strong><br>
  {f"• IP Address: {ip_address}<br>" if ip_address else ""}
  {f"• Device/Browser: {user_agent}<br>" if user_agent else ""}
  • Time: {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
</div>"""

    content = f"""
<div style="text-align:center;margin-bottom:32px;">
  <div style="display:inline-block;background:rgba(110,231,183,0.1);border:1px solid rgba(110,231,183,0.3);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;color:#6ee7b7;">✓</div>
</div>
<h1 style="color:#6ee7b7;font-size:28px;font-weight:700;margin:0 0 8px;text-align:center;">Password Changed</h1>
<p style="color:rgba(255,255,255,0.6);font-size:15px;margin:0 0 24px;text-align:left;">Hi {client_name},</p>
<p style="color:rgba(255,255,255,0.6);font-size:15px;margin:0 0 24px;text-align:left;">This is a confirmation that the password for your SISU account has been successfully changed.</p>

{metadata_html}

<div style="margin-top:24px;border-top:1px solid rgba(255,255,255,0.08);padding-top:16px;text-align:left;">
  <div style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);border-radius:12px;padding:16px;">
    <p style="color:#f87171;font-size:12px;line-height:1.5;margin:0;">
      <strong>Crucial Security Notice:</strong> If you did not make this change, please contact our support team immediately and reset your password to secure your account.
    </p>
  </div>
</div>
"""
    return _send(to, "Your password has been changed — SISU", _base_template(content, "Password change notification for your SISU account"))



def send_reschedule_proposed(to: str, client_name: str, old_meeting: dict, new_meeting: dict) -> bool:
    content = f"""
<h1 style="color:#fb923c;font-size:28px;font-weight:700;margin:0 0 8px;">Reschedule Proposed</h1>
<p style="color:rgba(255,255,255,0.6);font-size:15px;margin:0 0 24px;">Hi {client_name}, the admin has proposed a new time for your meeting. Please log in to your dashboard to Accept & Block this slot or call to negotiate.</p>
<p style="color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Original Time</p>
{_meeting_card(old_meeting.get('title','Meeting'), old_meeting.get('date','TBD'), old_meeting.get('time','TBD'), old_meeting.get('type','Session'), old_meeting.get('duration','60 mins'))}
<p style="color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Proposed New Time</p>
{_meeting_card(new_meeting.get('title','Meeting'), new_meeting.get('date','TBD'), new_meeting.get('time','TBD'), new_meeting.get('type','Session'), new_meeting.get('duration','60 mins'))}
{_cta_button("Review on Dashboard", "#", "#fb923c")}"""
    return _send(to, "Reschedule Proposed for your meeting — SISU", _base_template(content, "The admin proposed to reschedule your meeting."))


