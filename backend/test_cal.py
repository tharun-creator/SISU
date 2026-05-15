import os
import datetime
from dotenv import load_dotenv

load_dotenv()

import calendar_service

start = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)
end = start + datetime.timedelta(hours=1)

print("Creating event...")
event = calendar_service.create_event(
    title="Test Meeting",
    description="This is a test",
    start=start,
    end=end,
    attendees=["admin@sisu.com"]
)
if event:
    print(f"Success! Event ID: {event.get('id')}")
    if event.get("conferenceData"):
        print("Meet link:", event.get("conferenceData").get("entryPoints", [{}])[0].get("uri"))
else:
    print("Failed to create event.")
