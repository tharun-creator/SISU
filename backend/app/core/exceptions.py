from typing import Any, Optional, Dict

class APIException(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400, details: Optional[Dict[str, Any]] = None):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)

class ValidationException(APIException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__("VALIDATION_ERROR", message, 400, details)

class AuthenticationException(APIException):
    def __init__(self, message: str = "Not authenticated"):
        super().__init__("AUTHENTICATION_FAILED", message, 401)

class AuthorizationException(APIException):
    def __init__(self, message: str = "Access denied"):
        super().__init__("ACCESS_DENIED", message, 403)

class NotFoundException(APIException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__("NOT_FOUND", message, 404)
