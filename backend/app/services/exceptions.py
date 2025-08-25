"""
Custom exceptions for service layer.
"""


class ServiceError(Exception):
    """Base exception for service errors."""
    pass


class UserAlreadyExistsError(ServiceError):
    """Raised when trying to create a user that already exists."""
    pass


class InvalidCredentialsError(ServiceError):
    """Raised when authentication credentials are invalid."""
    pass


class SpaceNotFoundError(ServiceError):
    """Raised when a space is not found."""
    pass


class UnauthorizedError(ServiceError):
    """Raised when user is not authorized to perform an action."""
    pass


class InvitationAlreadyExistsError(ServiceError):
    """Raised when trying to create duplicate invitation."""
    pass


class InvalidInvitationError(ServiceError):
    """Raised when invitation is invalid or not found."""
    pass


class InvitationExpiredError(ServiceError):
    """Raised when invitation has expired."""
    pass