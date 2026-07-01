# Google Cloud Console API Setup Guide

## Prerequisites
1. A Google Cloud Platform account
2. A Google account with admin privileges for the calendar

## Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project"
3. Name: "SISU Booking System"
4. Click "Create"

## Step 2: Enable Required APIs
1. In your project, go to "APIs & Services" > "Library"
2. Search for and enable:
   - Google Calendar API
   - Gmail API

## Step 3: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Application type: "Web application"
4. Name: "SISU Booking System OAuth"
5. Authorized redirect URIs: `http://localhost:8080/`
6. Click "Create"
7. Download the JSON file and save it as `client_secret.json` in the backend directory

## Step 4: Generate Refresh Token
1. Run the authentication script:
   ```bash
   cd backend
   python google_auth_setup.py
   ```
2. A browser window will open
3. Log in with your Google admin account
4. Grant the requested permissions
5. The script will save `token.json` with your refresh token

## Step 5: Configure Environment Variables
1. Copy `.env.example` to `.env` (if it exists) or create `.env`
2. Update the following variables:
   ```
   # Email Configuration
   EMAIL_PROVIDER=gmail  # Use Gmail API instead of Resend
   FROM_EMAIL=your-admin-email@gmail.com
   
   # Google Calendar Integration
   GOOGLE_CLIENT_ID=your-client-id-from-credentials
   GOOGLE_CLIENT_SECRET=your-client-secret-from-credentials
   GOOGLE_REFRESH_TOKEN=your-refresh-token-from-token.json
   ```

## Step 6: Extract Credentials from token.json
If you have a `token.json` file, you can extract the refresh token:
```python
import json
with open('token.json', 'r') as f:
    data = json.load(f)
    refresh_token = data.get('refresh_token')
    print(f"Refresh Token: {refresh_token}")
```

## Step 7: Test the Integration
1. Start the backend:
   ```bash
   python run_backend.py
   ```
2. Test email sending:
   ```bash
   python test_email_calendar_direct.py
   ```
3. Test calendar integration:
   ```bash
   python test_native_flow.py
   ```

## Troubleshooting

### Common Issues

1. **"Invalid Grant" error**
   - Ensure the refresh token is valid
   - Check if the token has expired (refresh tokens can expire)
   - Re-run `google_auth_setup.py` to get a new token

2. **"Access Not Configured" error**
   - Make sure both Calendar API and Gmail API are enabled
   - Check that OAuth consent screen is configured

3. **"Redirect URI mismatch" error**
   - Ensure `http://localhost:8080/` is in Authorized Redirect URIs
   - The port must match what's configured in `google_auth_setup.py`

4. **Emails not sending**
   - Check that the FROM_EMAIL is a valid Gmail address
   - Verify the account has permission to send emails
   - Check the Google Cloud Console logs

## Security Notes
1. Never commit `.env` or `token.json` to version control
2. Use environment variables in production
3. Restrict OAuth consent screen to internal users if possible
4. Regularly rotate refresh tokens
5. Monitor API usage in Google Cloud Console

## Production Deployment
For production, use environment variables instead of `token.json`:
```bash
# Set environment variables
export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_CLIENT_SECRET="your-client-secret"
export GOOGLE_REFRESH_TOKEN="your-refresh-token"
export FROM_EMAIL="your-admin@company.com"
export EMAIL_PROVIDER="gmail"
```

## Support
If you encounter issues:
1. Check the backend logs
2. Review Google Cloud Console error logs
3. Ensure all prerequisites are met
4. Verify OAuth consent screen configuration