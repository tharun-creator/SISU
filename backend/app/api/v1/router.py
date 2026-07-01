from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.meetings import router as meetings_router
from app.api.v1.admin import router as admin_router
from app.api.v1.chat import router as chat_router
from app.api.v1.notes import router as notes_router
from app.api.v1.availability import router as availability_router
from app.api.v1.session_logs import router as session_logs_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.integrations import router as integrations_router
from app.api.v1.invoices import router as invoices_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(meetings_router)
api_router.include_router(admin_router)
api_router.include_router(chat_router)
api_router.include_router(notes_router)
api_router.include_router(availability_router)
api_router.include_router(session_logs_router)
api_router.include_router(notifications_router)
api_router.include_router(dashboard_router)
api_router.include_router(integrations_router)
api_router.include_router(invoices_router)

