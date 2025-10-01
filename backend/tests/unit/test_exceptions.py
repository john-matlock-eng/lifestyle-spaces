"""
Tests for custom exception classes.

This test file ensures 100% coverage of app/core/exceptions.py by
instantiating and testing all custom exception classes.
"""
import pytest
from app.core.exceptions import (
    ServiceException,
    ValidationError,
    NotFoundError,
    SpaceNotFoundError,
    UserNotFoundError,
    InvitationNotFoundError,
    UnauthorizedError,
    ConflictError,
    ExternalServiceError,
    UserAlreadyExistsError,
    InvalidCredentialsError,
    InvitationAlreadyExistsError,
    InvalidInvitationError,
    InvitationExpiredError,
    InvalidInviteCodeError,
    AlreadyMemberError,
    SpaceLimitExceededError,
    InvitationNotFoundException,
    UserNotFoundException,
    SpaceNotFoundException,
)


class TestServiceException:
    """Test ServiceException base class."""

    def test_service_exception_init(self):
        """Test ServiceException can be instantiated."""
        exc = ServiceException("Test error")
        assert str(exc) == "Test error"
        assert isinstance(exc, Exception)

    def test_service_exception_no_message(self):
        """Test ServiceException with no message."""
        exc = ServiceException()
        assert isinstance(exc, Exception)

    def test_service_exception_raise(self):
        """Test ServiceException can be raised and caught."""
        with pytest.raises(ServiceException) as exc_info:
            raise ServiceException("Service error")
        assert str(exc_info.value) == "Service error"


class TestValidationError:
    """Test ValidationError."""

    def test_validation_error_init(self):
        """Test ValidationError can be instantiated."""
        exc = ValidationError("Invalid input")
        assert str(exc) == "Invalid input"
        assert isinstance(exc, ServiceException)

    def test_validation_error_raise(self):
        """Test ValidationError can be raised and caught."""
        with pytest.raises(ValidationError) as exc_info:
            raise ValidationError("Validation failed")
        assert str(exc_info.value) == "Validation failed"


class TestNotFoundError:
    """Test NotFoundError base class."""

    def test_not_found_error_init(self):
        """Test NotFoundError can be instantiated."""
        exc = NotFoundError("Resource not found")
        assert str(exc) == "Resource not found"
        assert isinstance(exc, ServiceException)

    def test_not_found_error_raise(self):
        """Test NotFoundError can be raised and caught."""
        with pytest.raises(NotFoundError) as exc_info:
            raise NotFoundError("Not found")
        assert str(exc_info.value) == "Not found"


class TestSpaceNotFoundError:
    """Test SpaceNotFoundError."""

    def test_space_not_found_error_init(self):
        """Test SpaceNotFoundError can be instantiated."""
        exc = SpaceNotFoundError("Space not found")
        assert str(exc) == "Space not found"
        assert isinstance(exc, NotFoundError)

    def test_space_not_found_error_raise(self):
        """Test SpaceNotFoundError can be raised and caught."""
        with pytest.raises(SpaceNotFoundError) as exc_info:
            raise SpaceNotFoundError("Space 123 not found")
        assert "Space 123 not found" in str(exc_info.value)


class TestUserNotFoundError:
    """Test UserNotFoundError."""

    def test_user_not_found_error_init(self):
        """Test UserNotFoundError can be instantiated."""
        exc = UserNotFoundError("User not found")
        assert str(exc) == "User not found"
        assert isinstance(exc, NotFoundError)

    def test_user_not_found_error_raise(self):
        """Test UserNotFoundError can be raised and caught."""
        with pytest.raises(UserNotFoundError) as exc_info:
            raise UserNotFoundError("User ABC not found")
        assert "User ABC not found" in str(exc_info.value)


class TestInvitationNotFoundError:
    """Test InvitationNotFoundError."""

    def test_invitation_not_found_error_init(self):
        """Test InvitationNotFoundError can be instantiated."""
        exc = InvitationNotFoundError("Invitation not found")
        assert str(exc) == "Invitation not found"
        assert isinstance(exc, NotFoundError)

    def test_invitation_not_found_error_raise(self):
        """Test InvitationNotFoundError can be raised and caught."""
        with pytest.raises(InvitationNotFoundError) as exc_info:
            raise InvitationNotFoundError("Invitation XYZ not found")
        assert "Invitation XYZ not found" in str(exc_info.value)


class TestUnauthorizedError:
    """Test UnauthorizedError."""

    def test_unauthorized_error_init(self):
        """Test UnauthorizedError can be instantiated."""
        exc = UnauthorizedError("Unauthorized access")
        assert str(exc) == "Unauthorized access"
        assert isinstance(exc, ServiceException)

    def test_unauthorized_error_raise(self):
        """Test UnauthorizedError can be raised and caught."""
        with pytest.raises(UnauthorizedError) as exc_info:
            raise UnauthorizedError("Access denied")
        assert str(exc_info.value) == "Access denied"


class TestConflictError:
    """Test ConflictError."""

    def test_conflict_error_init(self):
        """Test ConflictError can be instantiated."""
        exc = ConflictError("Resource conflict")
        assert str(exc) == "Resource conflict"
        assert isinstance(exc, ServiceException)

    def test_conflict_error_raise(self):
        """Test ConflictError can be raised and caught."""
        with pytest.raises(ConflictError) as exc_info:
            raise ConflictError("Duplicate entry")
        assert str(exc_info.value) == "Duplicate entry"


class TestExternalServiceError:
    """Test ExternalServiceError."""

    def test_external_service_error_init(self):
        """Test ExternalServiceError can be instantiated."""
        exc = ExternalServiceError("AWS service error")
        assert str(exc) == "AWS service error"
        assert isinstance(exc, ServiceException)

    def test_external_service_error_raise(self):
        """Test ExternalServiceError can be raised and caught."""
        with pytest.raises(ExternalServiceError) as exc_info:
            raise ExternalServiceError("S3 upload failed")
        assert str(exc_info.value) == "S3 upload failed"


class TestUserAlreadyExistsError:
    """Test UserAlreadyExistsError."""

    def test_user_already_exists_error_init(self):
        """Test UserAlreadyExistsError can be instantiated."""
        exc = UserAlreadyExistsError("User already exists")
        assert str(exc) == "User already exists"
        assert isinstance(exc, ConflictError)

    def test_user_already_exists_error_raise(self):
        """Test UserAlreadyExistsError can be raised and caught."""
        with pytest.raises(UserAlreadyExistsError) as exc_info:
            raise UserAlreadyExistsError("Email already registered")
        assert str(exc_info.value) == "Email already registered"


class TestInvalidCredentialsError:
    """Test InvalidCredentialsError."""

    def test_invalid_credentials_error_init(self):
        """Test InvalidCredentialsError can be instantiated."""
        exc = InvalidCredentialsError("Invalid credentials")
        assert str(exc) == "Invalid credentials"
        assert isinstance(exc, ServiceException)

    def test_invalid_credentials_error_raise(self):
        """Test InvalidCredentialsError can be raised and caught."""
        with pytest.raises(InvalidCredentialsError) as exc_info:
            raise InvalidCredentialsError("Wrong password")
        assert str(exc_info.value) == "Wrong password"


class TestInvitationAlreadyExistsError:
    """Test InvitationAlreadyExistsError."""

    def test_invitation_already_exists_error_init(self):
        """Test InvitationAlreadyExistsError can be instantiated."""
        exc = InvitationAlreadyExistsError("Invitation already exists")
        assert str(exc) == "Invitation already exists"
        assert isinstance(exc, ConflictError)

    def test_invitation_already_exists_error_raise(self):
        """Test InvitationAlreadyExistsError can be raised and caught."""
        with pytest.raises(InvitationAlreadyExistsError) as exc_info:
            raise InvitationAlreadyExistsError("Duplicate invitation")
        assert str(exc_info.value) == "Duplicate invitation"


class TestInvalidInvitationError:
    """Test InvalidInvitationError."""

    def test_invalid_invitation_error_init(self):
        """Test InvalidInvitationError can be instantiated."""
        exc = InvalidInvitationError("Invalid invitation")
        assert str(exc) == "Invalid invitation"
        assert isinstance(exc, ServiceException)

    def test_invalid_invitation_error_raise(self):
        """Test InvalidInvitationError can be raised and caught."""
        with pytest.raises(InvalidInvitationError) as exc_info:
            raise InvalidInvitationError("Invitation code invalid")
        assert str(exc_info.value) == "Invitation code invalid"


class TestInvitationExpiredError:
    """Test InvitationExpiredError."""

    def test_invitation_expired_error_init(self):
        """Test InvitationExpiredError can be instantiated."""
        exc = InvitationExpiredError("Invitation expired")
        assert str(exc) == "Invitation expired"
        assert isinstance(exc, ServiceException)

    def test_invitation_expired_error_raise(self):
        """Test InvitationExpiredError can be raised and caught."""
        with pytest.raises(InvitationExpiredError) as exc_info:
            raise InvitationExpiredError("Invitation has expired")
        assert str(exc_info.value) == "Invitation has expired"


class TestInvalidInviteCodeError:
    """Test InvalidInviteCodeError."""

    def test_invalid_invite_code_error_init(self):
        """Test InvalidInviteCodeError can be instantiated."""
        exc = InvalidInviteCodeError("Invalid invite code")
        assert str(exc) == "Invalid invite code"
        assert isinstance(exc, ServiceException)

    def test_invalid_invite_code_error_raise(self):
        """Test InvalidInviteCodeError can be raised and caught."""
        with pytest.raises(InvalidInviteCodeError) as exc_info:
            raise InvalidInviteCodeError("Code not found")
        assert str(exc_info.value) == "Code not found"


class TestAlreadyMemberError:
    """Test AlreadyMemberError."""

    def test_already_member_error_init(self):
        """Test AlreadyMemberError can be instantiated."""
        exc = AlreadyMemberError("Already a member")
        assert str(exc) == "Already a member"
        assert isinstance(exc, ConflictError)

    def test_already_member_error_raise(self):
        """Test AlreadyMemberError can be raised and caught."""
        with pytest.raises(AlreadyMemberError) as exc_info:
            raise AlreadyMemberError("User is already a member")
        assert str(exc_info.value) == "User is already a member"


class TestSpaceLimitExceededError:
    """Test SpaceLimitExceededError."""

    def test_space_limit_exceeded_error_init(self):
        """Test SpaceLimitExceededError can be instantiated."""
        exc = SpaceLimitExceededError("Space limit exceeded")
        assert str(exc) == "Space limit exceeded"
        assert isinstance(exc, ServiceException)

    def test_space_limit_exceeded_error_raise(self):
        """Test SpaceLimitExceededError can be raised and caught."""
        with pytest.raises(SpaceLimitExceededError) as exc_info:
            raise SpaceLimitExceededError("Maximum spaces reached")
        assert str(exc_info.value) == "Maximum spaces reached"


class TestInvitationNotFoundException:
    """Test InvitationNotFoundException (alternative name)."""

    def test_invitation_not_found_exception_init(self):
        """Test InvitationNotFoundException can be instantiated."""
        exc = InvitationNotFoundException("Invitation not found")
        assert str(exc) == "Invitation not found"
        assert isinstance(exc, NotFoundError)

    def test_invitation_not_found_exception_raise(self):
        """Test InvitationNotFoundException can be raised and caught."""
        with pytest.raises(InvitationNotFoundException) as exc_info:
            raise InvitationNotFoundException("Not found")
        assert str(exc_info.value) == "Not found"


class TestUserNotFoundException:
    """Test UserNotFoundException (alternative name)."""

    def test_user_not_found_exception_init(self):
        """Test UserNotFoundException can be instantiated."""
        exc = UserNotFoundException("User not found")
        assert str(exc) == "User not found"
        assert isinstance(exc, NotFoundError)

    def test_user_not_found_exception_raise(self):
        """Test UserNotFoundException can be raised and caught."""
        with pytest.raises(UserNotFoundException) as exc_info:
            raise UserNotFoundException("Not found")
        assert str(exc_info.value) == "Not found"


class TestSpaceNotFoundException:
    """Test SpaceNotFoundException (alternative name)."""

    def test_space_not_found_exception_init(self):
        """Test SpaceNotFoundException can be instantiated."""
        exc = SpaceNotFoundException("Space not found")
        assert str(exc) == "Space not found"
        assert isinstance(exc, NotFoundError)

    def test_space_not_found_exception_raise(self):
        """Test SpaceNotFoundException can be raised and caught."""
        with pytest.raises(SpaceNotFoundException) as exc_info:
            raise SpaceNotFoundException("Not found")
        assert str(exc_info.value) == "Not found"


class TestExceptionHierarchy:
    """Test exception hierarchy and inheritance."""

    def test_all_exceptions_inherit_from_base(self):
        """Test that all custom exceptions inherit from ServiceException or its children."""
        # ServiceException children
        assert issubclass(ValidationError, ServiceException)
        assert issubclass(NotFoundError, ServiceException)
        assert issubclass(UnauthorizedError, ServiceException)
        assert issubclass(ConflictError, ServiceException)
        assert issubclass(ExternalServiceError, ServiceException)
        assert issubclass(InvalidCredentialsError, ServiceException)
        assert issubclass(InvalidInvitationError, ServiceException)
        assert issubclass(InvitationExpiredError, ServiceException)
        assert issubclass(InvalidInviteCodeError, ServiceException)
        assert issubclass(SpaceLimitExceededError, ServiceException)

    def test_not_found_error_children(self):
        """Test NotFoundError children."""
        assert issubclass(SpaceNotFoundError, NotFoundError)
        assert issubclass(UserNotFoundError, NotFoundError)
        assert issubclass(InvitationNotFoundError, NotFoundError)
        assert issubclass(InvitationNotFoundException, NotFoundError)
        assert issubclass(UserNotFoundException, NotFoundError)
        assert issubclass(SpaceNotFoundException, NotFoundError)

    def test_conflict_error_children(self):
        """Test ConflictError children."""
        assert issubclass(UserAlreadyExistsError, ConflictError)
        assert issubclass(InvitationAlreadyExistsError, ConflictError)
        assert issubclass(AlreadyMemberError, ConflictError)

    def test_exception_catching_hierarchy(self):
        """Test that parent exceptions can catch child exceptions."""
        # NotFoundError can catch SpaceNotFoundError
        with pytest.raises(NotFoundError):
            raise SpaceNotFoundError("Space not found")

        # ConflictError can catch UserAlreadyExistsError
        with pytest.raises(ConflictError):
            raise UserAlreadyExistsError("User exists")

        # ServiceException can catch all custom exceptions
        with pytest.raises(ServiceException):
            raise ValidationError("Validation failed")
