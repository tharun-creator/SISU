import os
import sys
import datetime
import secrets

# Add parent directory to path so we can import local modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, User, Meeting
from auth import user_to_dict
from main import meeting_to_dict

def test_priority_client_flow():
    print("=== Testing Priority Client Persistence & Serialization ===")
    db = SessionLocal()
    
    test_email = f"test_priority_{secrets.token_hex(4)}@example.com"
    test_password = "SecurePassword123!"
    test_name = "Priority Test User"
    
    user_id = None
    meeting_id = None
    
    try:
        # 1. Create temporary user
        print(f"Creating temporary user: {test_email}")
        user = User(
            name=test_name,
            email=test_email,
            password_hash="fake_hash",
            role="client",
            is_priority=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        user_id = user.id
        
        # Verify initial priority is False
        print(f"Initial user: {user.name}, is_priority={user.is_priority}")
        assert user.is_priority is False, "Initial priority should be False"
        
        # Verify initial serialization
        user_dict = user_to_dict(user)
        print(f"Serialized user: {user_dict}")
        assert user_dict.get("is_priority") is False, "Serialized priority should be False"
        
        # 2. Promote user to priority
        print("Promoting user to priority...")
        user.is_priority = True
        db.commit()
        db.refresh(user)
        
        # Verify priority is True in DB
        print(f"Updated user is_priority={user.is_priority}")
        assert user.is_priority is True, "Priority should be persisted as True"
        
        # Verify serialized user includes priority
        user_dict = user_to_dict(user)
        print(f"Serialized priority user: {user_dict}")
        assert user_dict.get("is_priority") is True, "Serialized priority should be True"
        
        # 3. Create a pending meeting for the user
        print("Creating a test meeting for the priority client...")
        start = datetime.datetime.now() + datetime.timedelta(days=2)
        end = start + datetime.timedelta(hours=1)
        
        meeting = Meeting(
            client_id=user_id,
            title="Priority Client Integration Test",
            description="Testing priority client highlight serialization",
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
        meeting_id = meeting.id
        
        # 4. Verify meeting serialization includes client's priority status
        meeting_dict = meeting_to_dict(meeting)
        print(f"Serialized meeting: {meeting_dict}")
        assert meeting_dict.get("client_is_priority") is True, "meeting_to_dict should serialize client_is_priority as True"
        print("[OK] Meeting serialization correctly includes priority status!")
        
        # 5. Demote user back to standard
        print("Demoting user back to standard...")
        user.is_priority = False
        db.commit()
        db.refresh(user)
        db.refresh(meeting)
        
        # Verify meeting serialization updates to False
        meeting_dict = meeting_to_dict(meeting)
        print(f"Serialized meeting after demotion: {meeting_dict}")
        assert meeting_dict.get("client_is_priority") is False, "meeting_to_dict should serialize client_is_priority as False after demotion"
        print("[OK] Meeting serialization correctly updates when priority status changes!")
        
        print("\n=== All Tests Passed Successfully! ===")
        
    except Exception as e:
        print(f" Test Failed: {e}")
        raise e
    finally:
        # Clean up database records
        print("\nCleaning up database records...")
        try:
            if meeting_id:
                db.query(Meeting).filter(Meeting.id == meeting_id).delete()
            if user_id:
                db.query(User).filter(User.id == user_id).delete()
            db.commit()
            print("Cleanup successful.")
        except Exception as cleanup_err:
            db.rollback()
            print(f"Cleanup failed: {cleanup_err}")
            
        db.close()

if __name__ == "__main__":
    test_priority_client_flow()
