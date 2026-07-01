import os
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.limiter import limiter
from app.api.v1.router import api_router
from app.core.middleware import SecurityHeadersMiddleware
from app.core.exceptions import APIException
from app.core.logging import logger
from app.config import settings

app = FastAPI(
    title="Sisu Executive Booking API", 
    version="2.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)
app.state.limiter = limiter

# Rate limit exceeded handler
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Custom API Exception Handler
@app.exception_handler(APIException)
async def api_exception_handler(request: Request, exc: APIException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details
            }
        }
    )

# FastAPI Request Validation Exception Handler
from fastapi.exceptions import RequestValidationError
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    details = {}
    for error in exc.errors():
        loc = ".".join(str(l) for l in error.get("loc", []))
        details[loc] = error.get("msg", "Validation error")
    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request body validation failed",
                "details": details
            }
        }
    )

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled system error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred. Our team has been notified."
            }
        }
    )

# Security Headers & HTTPS Redirect Middleware
app.add_middleware(SecurityHeadersMiddleware)

# CORS Middleware (require explicit ALLOWED_ORIGINS config)
allowed_origins = settings.allowed_origins_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else [
        "http://localhost:5173", 
        "http://localhost:3000", 
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all endpoints under /api/v1/ and /api/ for backwards compatibility
app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router, prefix="/api")

# Static files (Notebook uploads) protected by uploads directory mount
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
