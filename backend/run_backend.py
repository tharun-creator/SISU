import sys
import os
try:
    print("Starting backend wrapper...", flush=True)
    from app import main
    print("Main imported", flush=True)
    import uvicorn
    print("Uvicorn imported", flush=True)
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    
    print(f"Binding to {host}:{port}", flush=True)
    uvicorn.run(main.app, host=host, port=port)
except Exception as e:
    print(f"Error occurred: {e}", flush=True)
    import traceback
    traceback.print_exc()
