from database import SessionLocal, Meeting
db = SessionLocal()
meetings = db.query(Meeting).order_by(Meeting.id.desc()).limit(5).all()
for m in meetings:
    print(f"ID: {m.id}, Title: {m.title}, Start: {m.start_time}, End: {m.end_time}, Duration: {m.duration_minutes}, Status: {m.status}, Event: {m.google_event_id}")
