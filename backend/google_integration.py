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
    """Loads Google credentials from token.json and refreshes if needed."""
    creds = None
    # We expect token.json to be in the same directory (backend) or current working dir
    token_path = 'token.json'
    
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                with open(token_path, 'w') as token:
                    token.write(creds.to_json())
            except Exception as e:
                logger.error(f"[Google API] Token refresh failed: {e}")
                return None
        else:
            logger.error("[Google API] No valid token found. Please run google_auth_setup.py first.")
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
        return {"success": False, "error": "Google Authentication failed. Missing or expired token."}
        
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
        return {"success": False, "error": "Google Authentication failed. Missing or expired token."}
        
    try:
        service = build('gmail', 'v1', credentials=creds)
        
        message = EmailMessage()
        message.set_content(f"Meeting Confirmed: {title}") # Text fallback
        
        # The exact HTML template from the user's n8n node
        html_body = f"""
        <h2>Meeting Confirmed: {title}</h2>
        <p>Hi {attendee_name},</p>
        <p>Your meeting is confirmed.</p>
        <hr style='border: none; border-top: 1px solid #e0e0e0; margin: 15px 0;'>
        <p><strong>📋 Meeting Details:</strong></p>
        <ul style='list-style: none; padding: 0;'>
        <li><strong>Title:</strong> {title}</li>
        <li><strong>Description:</strong> {description}</li>
        <li><strong>Location:</strong> SPI Edge office</li>
        </ul>
        <hr style='border: none; border-top: 1px solid #e0e0e0; margin: 15px 0;'>
        <p><strong>👥 Meeting Guests (2):</strong></p>
        <table style='width: 100%; border-collapse: collapse;'>
        <tr style='background-color: #f5f5f5;'><td style='padding: 10px; border: 1px solid #ddd;'><strong>Attendee</strong></td><td style='padding: 10px; border: 1px solid #ddd;'><strong>Role</strong></td></tr>
        <tr><td style='padding: 10px; border: 1px solid #ddd;'>tharunriot@gmail.com</td><td style='padding: 10px; border: 1px solid #ddd;'><span style='background-color: #4285F4; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px;'>Organizer</span></td></tr>
        <tr><td style='padding: 10px; border: 1px solid #ddd;'>{attendee_email}</td><td style='padding: 10px; border: 1px solid #ddd;'>Attendee</td></tr>
        </table>
        <hr style='border: none; border-top: 1px solid #e0e0e0; margin: 15px 0;'>
        <p><strong>🎥 Join Your Meeting:</strong></p>
        <p><a href='{meet_link or "#"}' style='background-color: #4285F4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;'>Click Here to Join Google Meet →</a></p>
        <p><strong>📅 Add to Your Calendar:</strong></p>
        <p><a href='{calendar_link or "#"}' style='background-color: #34A853; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;'>View Calendar Event →</a></p>
        <hr style='border: none; border-top: 1px solid #e0e0e0; margin: 15px 0;'>
        <p><strong>📝 Meeting Description:</strong></p>
        <p>{description}</p>
        <p style='color: #666; font-size: 12px; margin-top: 30px;'>Looking forward to speaking with you!<br><br>Best regards,<br>Your Mentorship Team</p>
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
