import os
import sys
from sqlalchemy.orm import Session

# Add parent directory to path so we can import local modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, User, AdminEmail, Meeting, Notification, MeetingStatusLog, PasswordResetToken
import auth

def reset_database_users():
    print("--- Starting Database User Cleanup and Reset ---")
    db = SessionLocal()
    
    try:
        # 1. Clear related tables first to avoid foreign key violations
        print("Clearing meeting status logs...")
        db.query(MeetingStatusLog).delete()
        
        print("Clearing notifications...")
        db.query(Notification).delete()
        
        print("Clearing meetings...")
        db.query(Meeting).delete()
        
        print("Clearing password reset tokens...")
        db.query(PasswordResetToken).delete()
        
        # 2. Clear users and admin lists
        print("Clearing users table...")
        db.query(User).delete()
        
        print("Clearing admin emails table...")
        db.query(AdminEmail).delete()
        
        db.commit()
        print("Successfully cleared all user and transaction tables.")
        
        # 3. Seed default admin email
        print("\nAdding default admin email: tharunriot@gmail.com")
        db.add(AdminEmail(email="tharunriot@gmail.com"))
        
        # 4. Create default admin user account
        temp_pass = "TharunRiot@2026"
        print(f"Recreating default admin user account with temporary password: {temp_pass}")
        admin_user = User(
            name="Tharun Riot",
            email="tharunriot@gmail.com",
            password_hash=auth.hash_password(temp_pass),
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        print("\nDatabase cleanup and admin reset completed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"\nError during cleanup: {e}")
    finally:
        db.close()
        print("Database connection closed.")

if __name__ == "__main__":
    reset_database_users()
