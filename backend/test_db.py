
import os
import sqlalchemy
from sqlalchemy import create_engine
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("DATABASE_URL")
if url.startswith("postgresql://"):
    url = url.replace("postgresql://", "postgresql+psycopg2://", 1)

print(f"Connecting to {url}...")
try:
    engine = create_engine(url, connect_args={'connect_timeout': 5})
    with engine.connect() as conn:
        print("Connected successfully!")
except Exception as e:
    print(f"Connection failed: {e}")
