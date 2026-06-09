import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from main import app
    print("FastAPI app loaded successfully!")
    routes = [route.path for route in app.routes]
    print("Routes registered:")
    for r in routes:
        if "reschedule" in r:
            print(f"  - {r}")
except Exception as e:
    print(f"Error loading FastAPI app: {e}")
    sys.exit(1)
