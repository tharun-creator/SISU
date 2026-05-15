
try:
    import fastapi
    import pydantic
    import sqlalchemy
    import slowapi
    import uvicorn
    import google.auth
    import resend
    print("All dependencies present")
except ImportError as e:
    print(f"Missing dependency: {e}")
