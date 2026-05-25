import os
import sqlalchemy
from sqlalchemy import create_engine, MetaData
from dotenv import load_dotenv

load_dotenv()

# SQLite local DB
local_url = "sqlite:///sisu.db"

# MySQL Aiven DB
mysql_url = os.getenv("DATABASE_URL")

if not mysql_url or "sqlite" in mysql_url:
    print("ERROR: Please set your Aiven DATABASE_URL in backend/.env first!")
    print("Example: DATABASE_URL=mysql+pymysql://user:password@host:port/defaultdb")
    exit(1)

# Strip query parameters for SSL to prevent PyMySQL Connection error
db_url = mysql_url
connect_args = {}
if "mysql" in db_url:
    if "?" in db_url:
        db_url = db_url.split("?")[0]
    connect_args = {"ssl": {}}

print(f"Connecting to local SQLite database: {local_url}...")
local_engine = create_engine(local_url)

print(f"Connecting to Aiven MySQL database...")
mysql_engine = create_engine(db_url, connect_args=connect_args)

# Create tables in MySQL by importing the models and using create_all
print("Creating tables on MySQL database if they do not exist...")
from database import Base, AdminEmail, User, Meeting, Booking, MeetingStatusLog, Notification, AvailabilitySlot, DateAvailabilitySignal, PasswordResetToken
Base.metadata.create_all(bind=mysql_engine)

print("Reflecting database schemas...")
local_meta = MetaData()
local_meta.reflect(bind=local_engine)

mysql_meta = MetaData()
mysql_meta.reflect(bind=mysql_engine)

# Tables in order of dependency to avoid foreign key violations
tables_order = [
    "admin_emails",
    "users",
    "meetings",
    "bookings",
    "meeting_status_logs",
    "notifications",
    "availability_slots",
    "date_availability_signals",
    "password_reset_tokens"
]

for table_name in tables_order:
    if table_name not in local_meta.tables:
        print(f"Table '{table_name}' not found in SQLite, skipping.")
        continue
        
    print(f"Migrating table '{table_name}'...")
    local_table = local_meta.tables[table_name]
    mysql_table = mysql_meta.tables[table_name]
    
    # Read rows from SQLite
    with local_engine.connect() as local_conn:
        rows = local_conn.execute(local_table.select()).fetchall()
        
    if not rows:
        print(f"No rows in SQLite '{table_name}', skipping migration of this table.")
        continue
        
    # Write rows to MySQL
    with mysql_engine.connect() as mysql_conn:
        # Clear existing rows in MySQL to avoid duplicate key errors on rerun
        mysql_conn.execute(mysql_table.delete())
        
        # Insert all
        insert_data = [dict(row._mapping) for row in rows]
        mysql_conn.execute(mysql_table.insert(), insert_data)
        mysql_conn.commit()
        
    print(f"Successfully migrated {len(rows)} rows for '{table_name}'!")

print("\n🎉 Migration completed successfully! Your Aiven MySQL database is now fully set up and populated!")
