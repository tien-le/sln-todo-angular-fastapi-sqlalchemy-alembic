"""
Custom exception classes.
"""


class AppException(Exception):
    """Base application exception."""
    pass


class NotFoundException(AppException):
    """Resource not found exception."""
    pass


class UnauthorizedException(AppException):
    """Unauthorized access exception."""
    pass


class ForbiddenException(AppException):
    """Forbidden access exception."""
    pass


class ValidationException(AppException):
    """Validation error exception."""
    pass
