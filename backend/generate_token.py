import os
from dotenv import load_dotenv
from google_auth_oauthlib.flow import InstalledAppFlow

load_dotenv()

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

if not CLIENT_ID or not CLIENT_SECRET:
    print("Error: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing from .env")
    exit(1)

client_config = {
    "web": {
        "client_id": CLIENT_ID,
        "project_id": "sisu-project",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_secret": CLIENT_SECRET,
        "redirect_uris": ["http://localhost:8080/"]
    }
}

SCOPES = ["https://www.googleapis.com/auth/calendar"]

def main():
    print("Starting authentication flow...")
    flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
    
    print("WARNING: Make sure you have added http://localhost:8080/ to Authorized Redirect URIs in Google Cloud Console.")
    try:
        creds = flow.run_local_server(port=8080)
        
        print("\n--- Authentication Successful! ---\n")
        print("Your new GOOGLE_REFRESH_TOKEN is:\n")
        print(creds.refresh_token)
        print("\nPlease copy the above token and paste it into your .env file as GOOGLE_REFRESH_TOKEN.")
        print("Then restart your backend service.")
    except Exception as e:
        print(f"Error during auth flow: {e}")

if __name__ == "__main__":
    main()
