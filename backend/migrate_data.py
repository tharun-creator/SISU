import os
import sqlalchemy
from sqlalchemy import create_engine, MetaData
from dotenv import load_dotenv

# Local DB URL
local_url = "mysql+pymysql://root:tharun2004@localhost:3306/sisu_db"

load_dotenv()
aiven_url = os.getenv("DATABASE_URL")
if not aiven_url or "<your_password>" in aiven_url:
    print("ERROR: Please set your Aiven DATABASE_URL in your backend/.env file first (replace <your_password> with your actual Aiven password!).")
    exit(1)

# Strip query parameters for SSL to prevent PyMySQL Connection error
if "?" in aiven_url:
    aiven_url = aiven_url.split("?")[0]

print("Connecting to local database...")
local_engine = create_engine(local_url)
print("Connecting to Aiven database...")
aiven_engine = create_engine(aiven_url, connect_args={"ssl": {}})

print("Reflecting local database schema...")
local_meta = MetaData()
local_meta.reflect(bind=local_engine)

print("Reflecting Aiven database schema...")
aiven_meta = MetaData()
aiven_meta.reflect(bind=aiven_engine)

# Tables in order of dependency to avoid foreign key violations
tables_order = ["users", "meetings", "bookings", "meeting_status_logs", "notifications", "availability_slots"]

for table_name in tables_order:
    if table_name not in local_meta.tables:
        continue
    print(f"Migrating table '{table_name}'...")
    local_table = local_meta.tables[table_name]
    
    if table_name not in aiven_meta.tables:
        print(f"Table '{table_name}' does not exist on Aiven yet. Let's create it!")
        local_table.metadata.create_all(bind=aiven_engine)
        # Re-reflect
        aiven_meta = MetaData()
        aiven_meta.reflect(bind=aiven_engine)
        
    aiven_table = aiven_meta.tables[table_name]
    
    # Read rows
    with local_engine.connect() as local_conn:
        rows = local_conn.execute(local_table.select()).fetchall()
        
    if not rows:
        print(f"No rows in local '{table_name}', skipping.")
        continue
        
    # Write rows to Aiven
    with aiven_engine.connect() as aiven_conn:
        # Clear existing rows to avoid duplicate keys on clean migrations
        aiven_conn.execute(aiven_table.delete())
        
        # Insert
        insert_data = [dict(row._mapping) for row in rows]
        aiven_conn.execute(aiven_table.insert(), insert_data)
        aiven_conn.commit()
    print(f"Successfully migrated {len(rows)} rows for '{table_name}'!")
    
print("\n🎉 Migration completed successfully! Your Aiven cloud database is now fully populated!")
