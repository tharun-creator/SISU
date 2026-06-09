import os
from sqlalchemy import create_engine, MetaData, select, func
from dotenv import load_dotenv

load_dotenv()

aiven_url = os.getenv("DATABASE_URL")
if not aiven_url:
    print("DATABASE_URL is not set in your .env file.")
    exit(1)

# Strip query parameters for SSL to prevent PyMySQL Connection error
if "?" in aiven_url:
    aiven_url = aiven_url.split("?")[0]

print(f"Connecting to Aiven database at: {aiven_url.split('@')[-1] if '@' in aiven_url else 'configured path'}...")
try:
    engine = create_engine(aiven_url, connect_args={"ssl": {}})
    meta = MetaData()
    meta.reflect(bind=engine)
    
    print("\nSuccessfully connected! Here are your tables and row counts in Aiven:")
    print("-" * 50)
    for table_name in sorted(meta.tables.keys()):
        table = meta.tables[table_name]
        with engine.connect() as conn:
            # count query using SQLAlchemy select(func.count())
            query = select(func.count()).select_from(table)
            count = conn.execute(query).scalar()
        print(f"Table: {table_name:<25} | Rows: {count}")
    print("-" * 50)
except Exception as e:
    print(f"Error checking Aiven: {e}")
