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
        db_name = parsed.path.strip("/") or "sisu_db"
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
        print(f"Database '{db_name}' created successfully or already exists.")
        connection.close()
    except Exception as e:
        print(f"Error creating database from DATABASE_URL: {e}")
else:
    try:
        connection = pymysql.connect(
            host='localhost',
            user='root',
            password='tharun2004',
            port=3306
        )
        cursor = connection.cursor()
        cursor.execute("CREATE DATABASE IF NOT EXISTS sisu_db")
        print("Database 'sisu_db' created successfully or already exists.")
        connection.close()
    except Exception as e:
        print(f"Error creating database: {e}")
