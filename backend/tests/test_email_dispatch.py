import os
import sys

# Ensure backend root is in the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app"))

import email_service as legacy_email_service
from app.services.email_service import EmailService as ModernEmailService

def run_tests():
    print("="*60)
    print("RUNNING EMAIL DISPATCH INTEGRATION TESTS")
    print("="*60)
    
    test_recipient = os.getenv("FROM_EMAIL", "tharunriot@gmail.com")
    print(f"Target recipient for test emails: {test_recipient}")
    print(f"EMAIL_PROVIDER configuration: {os.getenv('EMAIL_PROVIDER', 'gmail')}")

    # 1. Test Legacy Email Service
    print("\n[TEST 1] Testing Legacy Email Service...")
    meeting_payload = {
        "title": "Legacy System Test Session",
        "date": "June 25, 2026",
        "time": "10:00 AM IST",
        "type": "Mentorship",
        "duration": "60 mins"
    }
    
    try:
        success = legacy_email_service.send_booking_received(
            to=test_recipient,
            client_name="Legacy Test User",
            meeting=meeting_payload
        )
        print(f"  Legacy send_booking_received result: {success}")
        assert success is True, "Legacy email sending failed"
        print("  OK: Legacy email service verified successfully.")
    except Exception as e:
        print(f"  ❌ Legacy Email Service Test Failed: {e}")
        raise e

    # 2. Test Modern Email Service
    print("\n[TEST 2] Testing Modern Email Service...")
    modern_meeting_payload = {
        "title": "Modern System Test Session",
        "date": "June 25, 2026",
        "time": "11:00 AM IST",
        "type": "Mentorship",
        "duration": "60 mins",
        "priority": "high",
        "description": "Verification of modern template layout."
    }
    
    try:
        success = ModernEmailService.send_booking_received(
            to=test_recipient,
            client_name="Modern Test User",
            meeting=modern_meeting_payload
        )
        print(f"  Modern send_booking_received result: {success}")
        assert success is True, "Modern email sending failed"
        print("  OK: Modern email service verified successfully.")
    except Exception as e:
        print(f"  ❌ Modern Email Service Test Failed: {e}")
        raise e

    print("\n" + "="*60)
    print("ALL EMAIL DISPATCH TESTS COMPLETED SUCCESSFULLY!")
    print("="*60)

if __name__ == "__main__":
    run_tests()
