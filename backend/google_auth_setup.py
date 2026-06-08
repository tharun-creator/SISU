import os
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

# Scopes required for Calendar (read/write) and Gmail (send)
SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/gmail.send'
]

def main():
    creds = None
    # We use the client_secret JSON file the user provided
    # Let's try to find it in the current directory or the parent directory
    client_secret_file = 'client_secret.json'
    
    # Try finding the specific filename given by the user earlier if we can
    for file in os.listdir('.'):
        if file.startswith('client_secret_') and file.endswith('.json'):
            client_secret_file = file
            break
            
    if not os.path.exists(client_secret_file):
        # Look in parent dir (wheure the user had it)
        parent_dir = os.path.dirname(os.getcwd())
        for file in os.listdir(parent_dir):
            if file.startswith('client_secret_') and file.endswith('.json'):
                client_secret_file = os.path.join(parent_dir, file)
                break

    if not os.path.exists(client_secret_file):
        print(f"Error: Could not find {client_secret_file} or any file starting with 'client_secret_'")
        print("Please place the downloaded OAuth client secret JSON file in this directory.")
        return

    print(f"Using client secret file: {client_secret_file}")

    if os.path.exists('token.json'):
        print("Loading existing token.json...")
        try:
            creds = Credentials.from_authorized_user_file('token.json', SCOPES)
        except ValueError as ve:
            print(f"Token is invalid or incomplete ({ve}). Re-authenticating...")
            creds = None

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("Refreshing existing token...")
            creds.refresh(Request())
        else:
            print("Starting new authentication flow...")
            print("A browser window should open. Please log in with your admin Google account.")
            flow = InstalledAppFlow.from_client_secrets_file(
                client_secret_file, SCOPES)
            creds = flow.run_local_server(port=8080, prompt='consent', access_type='offline')
            
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
            print("\nSuccessfully saved new token.json!")
            print("You can now run your backend server.")

if __name__ == '__main__':
    main()
