from typing import Any, Optional, Dict
from pydantic import BaseModel

class ResponseMeta(BaseModel):
    page: Optional[int] = None
    per_page: Optional[int] = None
    total: Optional[int] = None

class SuccessResponse(BaseModel):
    success: bool = True
    data: Any
    meta: Optional[ResponseMeta] = None

class ErrorDetails(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetails
