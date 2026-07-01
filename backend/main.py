"""
main.py — Sisu Executive Meeting Platform — FastAPI Backend
"""
import os
import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from api.limiter import limiter
from api.routers.auth import router as auth_router
from api.routers.meetings import router as meetings_router
from api.routers.admin import router as admin_router
from api.routers.chat import router as chat_router
from api.routers.notes import router as notes_router


# Backwards compatibility imports for tests & external scripts
from api.helpers import (
    to_local, parse_dt_to_ist, meeting_to_dict, 
    create_notification, log_status_change
)

# ── Logging Setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler("backend.log")]
)
logger = logging.getLogger("sisu-api")

# ── App Setup ─────────────────────────────────────────────────────────────────
app = FastAPI(title="Sisu Executive Booking API", version="2.0.0")
app.state.limiter = limiter

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Our team has been notified."}
    )

app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include Routers ───────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(meetings_router)
app.include_router(admin_router)
app.include_router(chat_router)
app.include_router(notes_router)

# ── Static Files for Notebook Uploads ──────────────────────────────────────────
from fastapi.staticfiles import StaticFiles
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

