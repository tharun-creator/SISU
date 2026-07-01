import os
from dotenv import load_dotenv
load_dotenv()

from app.database import engine, Base
from app.models.invoice import Invoice

def init_table():
    print("Initializing invoice table...")
    try:
        # Create all tables that don't exist yet (specifically our new Invoice table)
        Base.metadata.create_all(bind=engine)
        print("Invoice table created successfully or already exists!")
    except Exception as e:
        print(f"Error creating table: {e}")

if __name__ == "__main__":
    init_table()
