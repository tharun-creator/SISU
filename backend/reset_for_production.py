
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
        # Connect to MySQL (without database name first) to drop and recreate it
        from urllib.parse import urlparse
        
        db_url = os.getenv("DATABASE_URL")
        host = 'localhost'
        user = 'root'
        password = 'tharun2004'
        port = 3306
        db_name = 'sisu_db'
        
        if db_url and "mysql" in db_url:
            cleaned_url = db_url.replace("mysql+pymysql://", "mysql://")
            parsed = urlparse(cleaned_url)
            host = parsed.hostname or host
            user = parsed.username or user
            password = parsed.password or ''
            port = parsed.port or port
            db_name = parsed.path.strip("/") or db_name
            
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
