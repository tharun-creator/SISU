import os
import requests
import datetime
from sqlalchemy.orm import Session
from database import SessionLocal, Meeting, User
from meeting_booking_service import build_zapier_payload

def send_test_webhook():
    db = SessionLocal()
    try:
        # Create a mock meeting or fetch the first one
        m = db.query(Meeting).first()
        if not m:
            print("No meetings found to send test webhook for.")
            return

        client = db.query(User).filter(User.id == m.client_id).first()
        client_name = client.name if client else "John Doe"
        client_email = client.email if client else "john@example.com"

        payload = build_zapier_payload(m, client_name, client_email)
        webhook_url = os.getenv("ZAPIER_WEBHOOK_URL", "https://hooks.zapier.com/hooks/catch/27598358/4yx6sle/")
        
        print(f"Sending Payload: {payload}")
        
        resp = requests.post(webhook_url, json=payload)
        print(f"Zapier Response: {resp.status_code} - {resp.text}")

    finally:
        db.close()

if __name__ == "__main__":
    send_test_webhook()
