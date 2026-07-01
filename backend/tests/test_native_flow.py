import os
import datetime
import secrets
from database import SessionLocal, User, AdminEmail, Meeting
import meeting_booking_service
import calendar_service
import email_service
import auth
from auth import RegisterRequest

def test_native_approval_flow():
    print("=== Testing Synchronous Native Approval Flow ===")
    db = SessionLocal()
    
    test_email = f"test_flow_{secrets.token_hex(4)}@example.com"
    test_password = "SecurePassword123!"
    test_name = "Flow Test User"
    
    try:
        # 1. Register temporary user
        print(f"Registering temporary user: {test_email}")
        reg_req = RegisterRequest(name=test_name, email=test_email, password=test_password)
        token_res = auth.register_user(reg_req, db)
        user_id = token_res.user["id"]
        
        # 2. Create a test pending meeting
        start = datetime.datetime.now() + datetime.timedelta(days=3)
        end = start + datetime.timedelta(hours=1)
        
        meeting = Meeting(
            client_id=user_id,
            title="Direct Native Flow Integration Test",
            description="Testing direct calendar booking and Gmail confirmation",
            meeting_type="Mentorship Session",
            start_time=start,
            end_time=end,
            duration_minutes=60,
            preferred_communication="video",
            status="pending"
        )
        
        db.add(meeting)
        db.commit()
        db.refresh(meeting)
        
        print(f"Created pending meeting: ID {meeting.id} for user {user_id}")
        
        # 3. Simulate Admin Approving it
        print("Approving meeting and running native Google integration synchronously...")
        meeting_booking_service.mark_slot_as_booked(db, meeting.start_time, meeting.end_time)
        
        # Call handle_approved_meeting_native synchronously (using the test user's email)
        # We send Gmail confirmation to the user's email
        res = meeting_booking_service.handle_approved_meeting_native(
            meeting, test_name, "tharunriot@gmail.com"  # Send to organizer/test-admin to avoid spamming fake domains
        )
        
        print(f"Native Handler Response: {res}")
        assert res.get("success") is True, "Approval integration failed"
        
        meeting.google_event_id = res.get("google_event_id")
        meeting.meet_link = res.get("meet_link")
        meeting.status = "approved"
        db.commit()
        db.refresh(meeting)
        
        print("[OK] Meeting status updated in DB:")
        print(f"  Event ID: {meeting.google_event_id}")
        print(f"  Meet Link: {meeting.meet_link}")
        assert meeting.google_event_id is not None, "google_event_id was not populated"
        assert meeting.meet_link is not None, "meet_link was not populated"
        
        # 4. Simulate Cancellation
        print("\nCancelling meeting and deleting Google Calendar event...")
        if meeting.google_event_id:
            del_res = calendar_service.delete_event(meeting.google_event_id)
            print(f"Calendar Delete Result: {del_res}")
            
    except Exception as e:
        print(f"❌ Test Failed: {e}")
    finally:
        # Clean up database records
        print("\nCleaning up test database records...")
        try:
            db.query(Meeting).filter(Meeting.client_id == user_id).delete()
            db.query(User).filter(User.id == user_id).delete()
            db.commit()
            print("Cleanup successful.")
        except Exception as cleanup_err:
            db.rollback()
            print(f"Cleanup failed: {cleanup_err}")
            
        db.close()
        print("\n=== Test Completed ===")

if __name__ == "__main__":
    test_native_approval_flow()
