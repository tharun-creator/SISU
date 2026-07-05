import pymysql
import os
import sys
from dotenv import load_dotenv

# Add parent directory to path so we can import local modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def reset_database():
    print("--- Resetting Database ---")
    try:
        from urllib.parse import urlparse
        
        db_url = os.getenv("DATABASE_URL")
        
        if not db_url or "mysql" not in db_url:
            raise ValueError("DATABASE_URL must be set in .env and must be a valid MySQL URL to use this script.")
            
        cleaned_url = db_url.replace("mysql+pymysql://", "mysql://")
        parsed = urlparse(cleaned_url)
        host = parsed.hostname
        user = parsed.username
        password = parsed.password or ''
        port = parsed.port or 3306
        db_name = parsed.path.strip("/")
        
        if not host or not user or not db_name:
            raise ValueError("Invalid DATABASE_URL format. It must contain host, user, and database name.")
            
        connection = pymysql.connect(
            host=host,
            user=user,
            password=password,
            port=port
        )
        cursor = connection.cursor()
        
        # Drop and recreate database
        cursor.execute(f"DROP DATABASE IF EXISTS {db_name}")
        cursor.execute(f"CREATE DATABASE {db_name}")
        print(f"Database '{db_name}' dropped and recreated.")
        
        connection.close()
        
        # Now run database.py to create tables
        print("Initializing tables...")
        import database
        print("Tables initialized successfully.")
        
    except Exception as e:
        print(f"Error resetting database: {e}")

def clear_logs():
    print("--- Clearing Logs ---")
    logs = ["backend.log", "final_test.log"]
    for log in logs:
        log_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), log)
        if os.path.exists(log_path):
            with open(log_path, "w") as f:
                f.write("")
            print(f"Cleared {log}")
        else:
            print(f"{log} does not exist, skipping.")

def clear_sqlite():
    print("--- Clearing SQLite (if exists) ---")
    sqlite_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sisu.db")
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
