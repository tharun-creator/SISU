import pymysql
import os
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()

# We connect to MySQL without specifying a database first to create it
db_url = os.getenv("DATABASE_URL")
if db_url and "mysql" in db_url:
    try:
        cleaned_url = db_url.replace("mysql+pymysql://", "mysql://")
        parsed = urlparse(cleaned_url)
        connection = pymysql.connect(
            host=parsed.hostname or 'localhost',
            user=parsed.username or 'root',
            password=parsed.password or '',
            port=parsed.port or 3306
        )
        cursor = connection.cursor()
        db_name = parsed.path.strip("/")
        if not db_name:
            raise ValueError("DATABASE_URL must include a database name")
            
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
        print(f"Database '{db_name}' created successfully or already exists.")
        connection.close()
    except Exception as e:
        print(f"Error creating database from DATABASE_URL: {e}")
else:
    raise ValueError("DATABASE_URL must be set in .env and must be a valid MySQL URL.")
