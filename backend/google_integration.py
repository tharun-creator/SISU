import os
import base64
from email.message import EmailMessage
import logging

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger("sisu-booking")

# Scopes required for Calendar (read/write) and Gmail (send)
SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/gmail.send'
]

def get_credentials():
    """Loads Google credentials from token.json or environment variables.
    
    Priority:
    1. token.json file (local development)
    2. Environment variables: GOOGLE_REFRESH_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (deployment)
    3. Development mode: return None but log instead of error
    """
    creds = None
    token_path = 'token.json'
    
    # Priority 1: Try token.json (local development)
    if os.path.exists(token_path):
        try:
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
            logger.info("[Google API] Using credentials from token.json")
        except Exception as e:
            logger.warning(f"[Google API] Failed to load token.json: {e}")
            creds = None
    
    # Priority 2: Fall back to environment variables (deployment)
    if not creds:
        refresh_token = os.getenv("GOOGLE_REFRESH_TOKEN")
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        
        if refresh_token and client_id and client_secret:
            try:
                creds = Credentials(
                    token=None,
                    refresh_token=refresh_token,
                    token_uri="https://oauth2.googleapis.com/token",
                    client_id=client_id,
                    client_secret=client_secret,
                    scopes=SCOPES,
                )
                logger.info("[Google API] Using credentials from environment variables.")
            except Exception as e:
                logger.error(f"[Google API] Failed to create credentials from env vars: {e}")
                return None
        else:
            # Development mode: log instead of error
            logger.info(
                "[Google API Dev Mode] No Google credentials found. "
                "Calendar events will be logged instead of created."
            )
            return None  # Return None to trigger development mode
        
    # Refresh if expired
    if not creds.valid:
        if creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                # Save refreshed token locally if possible (dev environment)
                if os.path.exists(token_path):
                    with open(token_path, 'w') as token:
                        token.write(creds.to_json())
                    logger.info("[Google API] Refreshed and saved token")
            except Exception as e:
                logger.error(f"[Google API] Token refresh failed: {e}")
                return None
        elif creds.refresh_token:
            # Token has never been used yet — force a refresh
            try:
                creds.refresh(Request())
                logger.info("[Google API] Initial token refresh successful")
            except Exception as e:
                logger.error(f"[Google API] Initial token refresh failed: {e}")
                return None
        else:
            logger.error("[Google API] Credentials are invalid and cannot be refreshed.")
            return None
            
    return creds

def create_calendar_event(
    title: str, 
    description: str, 
    start_iso: str, 
    end_iso: str, 
    attendee_email: str, 
    attendee_name: str,
    organizer_email: str = "tharunriot@gmail.com"
):
    """
    Creates a Google Calendar event with a Google Meet link.
    Matches the Zapier/n8n payload format exactly.
    """
    creds = get_credentials()
    if not creds:
        # Development mode: log instead of creating event
        logger.info(f"[Google Calendar Dev Mode] Would create calendar event:")
        logger.info(f"  Title: {title}")
        logger.info(f"  Description: {description}")
        logger.info(f"  Start: {start_iso}")
        logger.info(f"  End: {end_iso}")
        logger.info(f"  Attendee: {attendee_name} <{attendee_email}>")
        logger.info(f"  Organizer: {organizer_email}")
        # Return mock success response for development
        return {
            "success": True, 
            "meet_link": "https://meet.google.com/dev-test-link",
            "calendar_link": "https://calendar.google.com/event/dev-test",
            "event_id": f"dev-event-{int(time.time())}"
        }
        
    try:
        service = build('calendar', 'v3', credentials=creds)
        
        event = {
            'summary': title,
            'description': description,
            'start': {
                'dateTime': start_iso,
                # Relying on offset string in dateTime (e.g. +05:30) or we can set timeZone
            },
            'end': {
                'dateTime': end_iso,
            },
            'location': 'SPI Edge office',
            'attendees': [
                {'email': organizer_email, 'displayName': 'Organizer', 'responseStatus': 'accepted'},
                {'email': attendee_email, 'displayName': attendee_name, 'responseStatus': 'needsAction'}
            ],
            'conferenceData': {
                'createRequest': {
                    'requestId': f"sisu-booking-{start_iso}-{attendee_email}",
                    'conferenceSolutionKey': {'type': 'hangoutsMeet'}
                }
            }
        }

        # Call the Calendar API
        # We use conferenceDataVersion=1 to allow Meet link generation
        created_event = service.events().insert(
            calendarId=organizer_email,
            body=event,
            conferenceDataVersion=1,
            sendUpdates='none' # We will send the custom email via Gmail instead of standard Google Calendar invite
        ).execute()
        
        # Extract the Meet Link and HTML Link
        meet_link = None
        if 'conferenceData' in created_event and 'entryPoints' in created_event['conferenceData']:
            for entry in created_event['conferenceData']['entryPoints']:
                if entry.get('entryPointType') == 'video':
                    meet_link = entry.get('uri')
                    break
                    
        return {
            "success": True, 
            "meet_link": meet_link,
            "calendar_link": created_event.get('htmlLink'),
            "event_id": created_event.get('id')
        }

    except HttpError as error:
        logger.error(f"[Google Calendar API] An error occurred: {error}")
        return {"success": False, "error": str(error)}

def update_calendar_event(
    event_id: str,
    title: str,
    description: str,
    start_iso: str,
    end_iso: str,
    organizer_email: str = "tharunriot@gmail.com"
):
    """
    Updates an existing Google Calendar event.
    """
    creds = get_credentials()
    if not creds:
        # Development mode: log instead of updating event
        logger.info(f"[Google Calendar Dev Mode] Would update calendar event {event_id}:")
        logger.info(f"  New Title: {title}")
        logger.info(f"  New Description: {description}")
        logger.info(f"  New Start: {start_iso}")
        logger.info(f"  New End: {end_iso}")
        logger.info(f"  Organizer: {organizer_email}")
        # Return mock success response for development
        return {
            "success": True, 
            "meet_link": "https://meet.google.com/dev-test-link-updated",
            "calendar_link": "https://calendar.google.com/event/dev-test-updated",
            "event_id": event_id
        }
        
    try:
        service = build('calendar', 'v3', credentials=creds)
        
        # Fetch the existing event
        event = service.events().get(calendarId=organizer_email, eventId=event_id).execute()
        
        # Update fields
        event['summary'] = title
        event['description'] = description
        event['start'] = {'dateTime': start_iso}
        event['end'] = {'dateTime': end_iso}
        
        updated_event = service.events().update(
            calendarId=organizer_email,
            eventId=event_id,
            body=event,
            conferenceDataVersion=1,
            sendUpdates='none'
        ).execute()
        
        # Extract Meet link if available
        meet_link = None
        if 'conferenceData' in updated_event and 'entryPoints' in updated_event['conferenceData']:
            for entry in updated_event['conferenceData']['entryPoints']:
                if entry.get('entryPointType') == 'video':
                    meet_link = entry.get('uri')
                    break
                    
        return {
            "success": True, 
            "meet_link": meet_link,
            "calendar_link": updated_event.get('htmlLink'),
            "event_id": updated_event.get('id')
        }

    except HttpError as error:
        logger.error(f"[Google Calendar API] An error occurred updating event: {error}")
        return {"success": False, "error": str(error)}

def send_gmail_confirmation(
    title: str,
    description: str,
    attendee_email: str,
    attendee_name: str,
    meet_link: str,
    calendar_link: str
):
    """
    Sends the exact confirmation email template defined in the n8n JSON using Gmail API.
    """
    creds = get_credentials()
    if not creds:
        # Development mode: log instead of sending Gmail
        logger.info(f"[Gmail Dev Mode] Would send confirmation email:")
        logger.info(f"  To: {attendee_name} <{attendee_email}>")
        logger.info(f"  Subject: Meeting Confirmed: {title}")
        logger.info(f"  Meet Link: {meet_link}")
        logger.info(f"  Calendar Link: {calendar_link}")
        # Return mock success response for development
        return {"success": True}
        
    try:
        service = build('gmail', 'v1', credentials=creds)
        
        message = EmailMessage()
        message.set_content(f"Meeting Confirmed: {title}") # Text fallback
        
        # The exact HTML template from the user's n8n node
        html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Meeting Confirmed</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',Helvetica,Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f7;padding:48px 0;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#000000;padding:36px 48px;text-align:center;">
              <h1 style="margin:0;font-size:26px;font-weight:600;color:#ffffff;letter-spacing:-0.3px;line-height:1.3;">Meeting Confirmed</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px 0 48px;">
              <p style="margin:0 0 32px 0;font-size:16px;color:#1d1d1f;line-height:1.6;">Hi {attendee_name},<br><br>Your meeting has been confirmed. Here's everything you need.</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 48px;">
              <hr style="border:none;border-top:1px solid #e5e5ea;margin:0;">
            </td>
          </tr>

          <!-- Meeting Details -->
          <tr>
            <td style="padding:28px 48px 0 48px;">
              <p style="margin:0 0 16px 0;font-size:11px;font-weight:600;letter-spacing:0.08em;color:#6e6e73;text-transform:uppercase;">Meeting Details</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f2f2f7;">
                    <span style="font-size:13px;color:#6e6e73;display:block;margin-bottom:3px;">Title</span>
                    <span style="font-size:15px;color:#1d1d1f;font-weight:500;">{title}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f2f2f7;">
                    <span style="font-size:13px;color:#6e6e73;display:block;margin-bottom:3px;">Location</span>
                    <span style="font-size:15px;color:#1d1d1f;font-weight:500;">SPI Edge Office</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;">
                    <span style="font-size:13px;color:#6e6e73;display:block;margin-bottom:3px;">Things We Discussed / Agenda</span>
                    <span style="font-size:15px;color:#1d1d1f;font-weight:500;line-height:1.5;">{description}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:28px 48px 0 48px;">
              <hr style="border:none;border-top:1px solid #e5e5ea;margin:0;">
            </td>
          </tr>

          <!-- Guests -->
          <tr>
            <td style="padding:28px 48px 0 48px;">
              <p style="margin:0 0 16px 0;font-size:11px;font-weight:600;letter-spacing:0.08em;color:#6e6e73;text-transform:uppercase;">Guests</p>

              <!-- Organizer row -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
                <tr>
                  <td style="vertical-align:middle;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:36px;height:36px;border-radius:50%;background-color:#1d1d1f;text-align:center;vertical-align:middle;">
                          <span style="font-size:14px;color:#ffffff;font-weight:600;line-height:36px;">T</span>
                        </td>
                        <td style="padding-left:12px;">
                          <span style="display:block;font-size:14px;color:#1d1d1f;font-weight:500;">tharunriot@gmail.com</span>
                          <span style="font-size:12px;color:#6e6e73;">Organizer</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Attendee row -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:36px;height:36px;border-radius:50%;background-color:#e5e5ea;text-align:center;vertical-align:middle;">
                          <span style="font-size:14px;color:#6e6e73;font-weight:600;line-height:36px;">{attendee_name[0].upper() if attendee_name else "A"}</span>
                        </td>
                        <td style="padding-left:12px;">
                          <span style="display:block;font-size:14px;color:#1d1d1f;font-weight:500;">{attendee_email}</span>
                          <span style="font-size:12px;color:#6e6e73;">Attendee</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:28px 48px 0 48px;">
              <hr style="border:none;border-top:1px solid #e5e5ea;margin:0;">
            </td>
          </tr>

          <!-- CTAs -->
          <tr>
            <td style="padding:28px 48px 40px 48px;">
              <p style="margin:0 0 16px 0;font-size:11px;font-weight:600;letter-spacing:0.08em;color:#6e6e73;text-transform:uppercase;">Join &amp; Save</p>

              <!-- Join Meet -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
                <tr>
                  <td style="border-radius:980px;background-color:#0071e3;">
                    <a href="{meet_link or '#'}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:500;color:#ffffff;text-decoration:none;letter-spacing:-0.1px;">Join Google Meet</a>
                  </td>
                </tr>
              </table>

              <!-- Add to Calendar -->
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:980px;background-color:#f5f5f7;border:1px solid #d2d2d7;">
                    <a href="{calendar_link or '#'}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:500;color:#0071e3;text-decoration:none;letter-spacing:-0.1px;">Add to Calendar</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f5f5f7;border-top:1px solid #e5e5ea;padding:24px 48px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#6e6e73;line-height:1.6;">Looking forward to speaking with you.<br>Your Mentorship Team</p>
            </td>
          </tr>

        </table>
        <!-- End card -->

      </td>
    </tr>
  </table>
"""
        
        message.add_alternative(html_body, subtype='html')
        
        message['To'] = attendee_email
        message['From'] = "tharunriot@gmail.com"
        message['Subject'] = "Confirmed: Your Mentorship Session is Scheduled!"

        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        create_message = {'raw': encoded_message}

        send_message = (service.users().messages().send(userId="me", body=create_message).execute())
        
        return {"success": True, "message_id": send_message['id']}

    except HttpError as error:
        logger.error(f"[Google Gmail API] An error occurred: {error}")
        return {"success": False, "error": str(error)}
