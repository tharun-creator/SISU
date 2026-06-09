import datetime
from database import SessionLocal, Meeting, User
from main import to_local, meeting_to_dict

db = SessionLocal()
try:
    meeting = db.query(Meeting).first()
    if meeting:
        print(f"DB Start Time: {meeting.start_time} (Type: {type(meeting.start_time)})")
        local_dt = to_local(meeting.start_time)
        print(f"Local DT: {local_dt} (TZ: {local_dt.tzinfo})")
        m_dict = meeting_to_dict(meeting)
        print(f"Dict Start Time: {m_dict['start_time']}")
    else:
        print("No meetings found")
finally:
    db.close()
