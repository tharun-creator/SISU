
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("DATABASE_URL")
print(f"Testing connection to: {url}")

try:
    # Parse URL manually for psycopg2
    # postgresql://user:pass@host:port/dbname
    from urllib.parse import urlparse
    result = urlparse(url)
    username = result.username
    password = result.password
    database = result.path[1:]
    hostname = result.hostname
    port = result.port

    conn = psycopg2.connect(
        database=database,
        user=username,
        password=password,
        host=hostname,
        port=port,
        connect_timeout=3
    )
    print("Success!")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
