import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def add_unique_constraint():
    with engine.connect() as conn:
        print("Adding unique constraint to meetings table...")
        try:
            # We use client_id and start_time as the unique pair
            conn.execute(text("ALTER TABLE meetings ADD UNIQUE KEY unique_booking (client_id, start_time)"))
            conn.commit()
            print("SUCCESS: Unique constraint added.")
        except Exception as e:
            if "Duplicate key name" in str(e) or "already exists" in str(e).lower():
                print("INFO: Constraint already exists.")
            else:
                print(f"ERROR adding constraint: {e}")

if __name__ == "__main__":
    add_unique_constraint()
