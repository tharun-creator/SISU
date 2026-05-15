
import sys
try:
    print("Starting backend wrapper...", flush=True)
    import main
    print("Main imported", flush=True)
    import uvicorn
    print("Uvicorn imported", flush=True)
    uvicorn.run(main.app, host="127.0.0.1", port=8000)
except Exception as e:
    print(f"Error occurred: {e}", flush=True)
    import traceback
    traceback.print_exc()
