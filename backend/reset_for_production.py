
import pymysql
import os
import sys
from dotenv import load_dotenv

# Add current directory to path so we can import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def reset_database():
    print("--- Resetting Database ---")
    try:
        # Connect to MySQL (without database name first)
        # Assuming credentials from .env or default for root
        # Extracting host, user, password from DATABASE_URL if needed, 
        # but create_db.py used hardcoded root:tharun2004
        
        connection = pymysql.connect(
            host='localhost',
            user='root',
            password='tharun2004',
            port=3306
        )
        cursor = connection.cursor()
        
        # Drop and recreate database
        cursor.execute("DROP DATABASE IF EXISTS sisu_db")
        cursor.execute("CREATE DATABASE sisu_db")
        print("Database 'sisu_db' dropped and recreated.")
        
        connection.close()
        
        # Now run database.py to create tables
        print("Initializing tables...")
        import database
        # database.py calls Base.metadata.create_all(bind=engine) on import
        print("Tables initialized successfully.")
        
    except Exception as e:
        print(f"Error resetting database: {e}")

def clear_logs():
    print("--- Clearing Logs ---")
    logs = ["backend.log", "final_test.log"]
    for log in logs:
        log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), log)
        if os.path.exists(log_path):
            with open(log_path, "w") as f:
                f.write("")
            print(f"Cleared {log}")
        else:
            print(f"{log} does not exist, skipping.")

def clear_sqlite():
    print("--- Clearing SQLite (if exists) ---")
    sqlite_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sisu.db")
    if os.path.exists(sqlite_path):
        os.remove(sqlite_path)
        print("Removed sisu.db")

if __name__ == "__main__":
    reset_database()
    clear_logs()
    clear_sqlite()
    print("\n--- Reset Complete! ---")
    print("The system is now in a clean state for production testing.")
    print("Note: The first user to register will automatically be assigned the ADMIN role.")
