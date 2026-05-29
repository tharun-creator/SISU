import os
import datetime
from dotenv import load_dotenv

load_dotenv()

import email_service
import calendar_service

def test_email():
    print("=== Testing Email Service ===")
    to_email = "tharunriot@gmail.com"
    client_name = "Tharun Test User"
    meeting = {
        "title": "Email System Verification",
        "date": "May 30, 2026",
        "time": "02:00 PM IST",
        "type": "Verification Session",
        "duration": "45 mins",
        "priority": "normal"
    }
    
    print(f"Sending test email via {email_service.EMAIL_PROVIDER} to {to_email}...")
    success = email_service.send_booking_received(to_email, client_name, meeting)
    if success:
        print("[OK] Email sent successfully!")
    else:
        print("[ERROR] Email sending failed. Please check logs/API keys.")
    return success

def test_google_calendar_direct():
    print("\n=== Testing Google Calendar (Direct API) ===")
    start = datetime.datetime.now() + datetime.timedelta(days=1)
    end = start + datetime.timedelta(hours=1)
    
    print("Creating a test event directly via Google Calendar API...")
    event = calendar_service.create_event_direct(
        title="Direct API Test Meeting",
        description="Verifying Google Calendar API connection",
        start=start,
        end=end,
        attendees=["tharunriot@gmail.com"],
        meeting_id="TEST-DIR-123",
        preferred_communication="video"
    )
    
    if event:
        print("[OK] Event created successfully directly!")
        print(f"  Event ID: {event.get('id')}")
        print(f"  Event Link: {event.get('htmlLink')}")
        meet_data = event.get("conferenceData")
        if meet_data:
            entry_points = meet_data.get("entryPoints", [])
            for ep in entry_points:
                if ep.get("entryPointType") == "video":
                    print(f"  Google Meet Link: {ep.get('uri')}")
    else:
        print("[ERROR] Google Calendar Direct API failed.")
        
if __name__ == "__main__":
    test_email()
    test_google_calendar_direct()
