"""
Custom exception classes for service layer.
"""


class ServiceException(Exception):
    """Base exception for service layer."""
    pass


class ValidationError(ServiceException):
    """Raised when input validation fails."""
    pass


class NotFoundError(ServiceException):
    """Base exception for resource not found."""
    pass


class SpaceNotFoundError(NotFoundError):
    """Raised when a space is not found."""
    pass


class UserNotFoundError(NotFoundError):
    """Raised when a user is not found."""
    pass


class InvitationNotFoundError(NotFoundError):
    """Raised when an invitation is not found."""
    pass


class UnauthorizedError(ServiceException):
    """Raised when user is not authorized for an action."""
    pass


class ConflictError(ServiceException):
    """Raised when there's a conflict with existing data."""
    pass


class ExternalServiceError(ServiceException):
    """Raised when an external service (AWS, etc.) fails."""
    pass


class UserAlreadyExistsError(ConflictError):
    """Raised when a user already exists."""
    pass


class InvalidCredentialsError(ServiceException):
    """Raised when credentials are invalid."""
    pass


class InvitationAlreadyExistsError(ConflictError):
    """Raised when an invitation already exists."""
    pass


class InvalidInvitationError(ServiceException):
    """Raised when an invitation is invalid."""
    pass


class InvitationExpiredError(ServiceException):
    """Raised when an invitation has expired."""
    pass


class InvalidInviteCodeError(ServiceException):
    """Raised when an invite code is invalid."""
    pass


class AlreadyMemberError(ConflictError):
    """Raised when user is already a member of a space."""
    pass


class SpaceLimitExceededError(ServiceException):
    """Raised when user has reached maximum number of spaces."""
    pass
