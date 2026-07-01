from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import settings

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # HTTPS redirect detection (X-Forwarded-Proto)
        proto = request.headers.get("x-forwarded-proto", "http")
        # Check if we should redirect (usually in production, but let's be safe and check if proto is http and header exists)
        # However, to avoid local dev redirect loops: only redirect if x-forwarded-proto exists and is 'http'
        if proto == "http" and "x-forwarded-proto" in request.headers:
            url = request.url.replace(scheme="https")
            return Response(status_code=301, headers={"Location": str(url)})

        response: Response = await call_next(request)
        
        # CSP Headers
        csp_directives = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com; "
            "frame-src https://challenges.cloudflare.com; "
            "img-src 'self' data: https:;"
        )
        response.headers["Content-Security-Policy"] = csp_directives
        
        # HSTS Header
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Clickjacking and Sniffing protection
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        return response
