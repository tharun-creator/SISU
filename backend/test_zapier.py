import requests
import json

webhook_url = "https://hooks.zapier.com/hooks/catch/27598358/4yx6sle/"

payload = {
  "title": "Product Demo",
  "description": "Initial product demo meeting",
  "start_time": "2026-05-20T14:00:00+05:30",
  "end_time": "2026-05-20T15:00:00+05:30",
  "clientName": "John Doe",
  "email": "john@example.com",
  "bookingId": "SISU-001",
  "google_meet": True
}

print(f"Sending payload to Zapier: {json.dumps(payload, indent=2)}")
response = requests.post(webhook_url, json=payload)
print(f"Response status: {response.status_code}")
print(f"Response text: {response.text}")
