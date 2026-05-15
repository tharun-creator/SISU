
import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

# We connect to MySQL without specifying a database first to create it
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
