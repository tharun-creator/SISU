import os
import sys
import secrets

# Add parent directory to path so we can import local modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import SessionLocal, User, AdminEmail, Meeting
import auth
from auth import RegisterRequest, LoginRequest

def run_full_cycle_test():
    print("--- Starting Full-Cycle Database & Auth Test ---")
    db = SessionLocal()
    
    test_email = f"test_user_{secrets.token_hex(4)}@example.com"
    test_password = "SecurePassword123!"
    
    try:
        # 1. Test User Registration
        print(f"\n1. Registering new client user: {test_email}")
        reg_req = RegisterRequest(
            name="Original Name",
            email=test_email,
            password=test_password
        )
        token_res = auth.register_user(reg_req, db)
        user_id = token_res.user["id"]
        print(f"   Success! User created in database with ID: {user_id}, role: {token_res.user['role']}")
        
        # Verify initial state in DB
        db_user = db.query(User).filter(User.id == user_id).first()
        assert db_user.name == "Original Name", "Name assertion failed"
        assert db_user.role == "client", "Initial role assertion failed"
        print("   Verified: Initial name 'Original Name' and role 'client' written to DB.")

        # 2. Test User Profile Settings Name Update
        print("\n2. Simulating Settings Page Profile Update...")
        db_user.name = "Updated Name"
        db_user.company = "Sisu Inc"
        db_user.phone = "+91 99999 88888"
        db.commit()
        db.refresh(db_user)
        
        # Verify new values in DB
        updated_db_user = db.query(User).filter(User.id == user_id).first()
        assert updated_db_user.name == "Updated Name", "Profile name update failed"
        assert updated_db_user.company == "Sisu Inc", "Profile company update failed"
        assert updated_db_user.phone == "+91 99999 88888", "Profile phone update failed"
        print("   Success! Updated values written and verified in the database:")
        print(f"   Name: '{updated_db_user.name}'")
        print(f"   Company: '{updated_db_user.company}'")
        print(f"   Phone: '{updated_db_user.phone}'")

        # 3. Test Dynamic Admin Promotion (admin_emails Table)
        print(f"\n3. Promoting '{test_email}' to Admin in the admin_emails table...")
        new_admin_email = AdminEmail(email=test_email)
        db.add(new_admin_email)
        db.commit()
        
        # Verify email added to admin_emails table
        admin_email_rec = db.query(AdminEmail).filter(AdminEmail.email == test_email).first()
        assert admin_email_rec is not None, "Failed to insert into admin_emails"
        print(f"   Verified: '{test_email}' inserted into admin_emails table.")

        # 4. Test Dynamic Login Role Synchronization
        print("\n4. Logging in user to verify dynamic role coercion...")
        login_req = LoginRequest(email=test_email, password=test_password)
        login_res = auth.login_user(login_req, db)
        
        # Check if the role sync promoted them to admin in user table
        refreshed_user = db.query(User).filter(User.id == user_id).first()
        assert login_res.user["role"] == "admin", "Login token did not coerce role to admin"
        assert refreshed_user.role == "admin", "User database record did not coerce role to admin"
        print("   Success! User role dynamically updated on login:")
        print(f"   Auth Token User Role: '{login_res.user['role']}'")
        print(f"   Database Record User Role: '{refreshed_user.role}'")

    except AssertionError as ae:
        print(f"\n❌ Assertion Error during verification: {ae}")
    except Exception as e:
        print(f"\n❌ Error during cycle test: {e}")
    finally:
        # Cleanup test data to keep the database clean
        print("\n--- Cleaning Up Test Data ---")
        try:
            # Delete user
            db.query(User).filter(User.email == test_email).delete()
            # Delete admin email
            db.query(AdminEmail).filter(AdminEmail.email == test_email).delete()
            db.commit()
            print("Cleanup successful. Database is clean.")
        except Exception as ex:
            db.rollback()
            print(f"Error during cleanup: {ex}")
        db.close()
        print("\n--- Full-Cycle Test Completed ---")

if __name__ == "__main__":
    run_full_cycle_test()
