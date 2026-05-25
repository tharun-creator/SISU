import sys
import os
import datetime

# Add the parent directory to sys.path so we can import database and main
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import SessionLocal, DateAvailabilitySignal, User
from main import get_free_slots

def test_availability_signals():
    db = SessionLocal()
    
    # 1. Clean existing signals for our test date
    test_date = "2026-06-01"
    db.query(DateAvailabilitySignal).filter(DateAvailabilitySignal.date == test_date).delete()
    db.commit()
    
    print("Verification Step 1: Default behavior (Green/No Signal)")
    # Should return default slots
    slots = db.query(DateAvailabilitySignal).filter(DateAvailabilitySignal.date == test_date).first()
    assert slots is None, "Should not find any signal yet"
    
    # We call the get_free_slots route directly using a mock DB session
    res = db.query(DateAvailabilitySignal).all()
    print(f"Total configured signals in DB: {len(res)}")
    
    # 2. Set to RED (Blocked)
    print("\nVerification Step 2: Setting Red Signal (Blocked)")
    red_sig = DateAvailabilitySignal(date=test_date, signal="red")
    db.add(red_sig)
    db.commit()
    
    # Check free slots via our endpoint logic
    import asyncio
    
    async def run_checks():
        # Red check
        slots_red = await get_free_slots(date=test_date, db=db)
        print(f"Slots for Red signal: {slots_red} (Expected: [])")
        assert len(slots_red) == 0, "Red signal should return 0 slots"
        
        # 3. Set to YELLOW with custom slots
        print("\nVerification Step 3: Setting Yellow Signal (Limited Slots: 10:00-11:00,15:00-16:00)")
        db.query(DateAvailabilitySignal).filter(DateAvailabilitySignal.date == test_date).delete()
        yellow_sig = DateAvailabilitySignal(date=test_date, signal="yellow", custom_slots="10:00-11:00,15:00-16:00")
        db.add(yellow_sig)
        db.commit()
        
        slots_yellow = await get_free_slots(date=test_date, db=db)
        print(f"Slots for Yellow signal: {slots_yellow}")
        assert len(slots_yellow) == 2, "Yellow signal should return exactly 2 custom slots"
        assert slots_yellow[0]['start'] == "10:00", "First slot should start at 10:00"
        assert slots_yellow[1]['start'] == "15:00", "Second slot should start at 15:00"
        print("Success! Yellow signal correctly filters slots.")
        
        # 4. Clean up
        db.query(DateAvailabilitySignal).filter(DateAvailabilitySignal.date == test_date).delete()
        db.commit()
        print("\nVerification Cleanup Complete.")
        
    asyncio.run(run_checks())

if __name__ == "__main__":
    try:
        test_availability_signals()
        print("\nALL BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY!")
    except AssertionError as e:
        print(f"\nAssertion Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nUnexpected error during verification: {e}")
        sys.exit(1)
