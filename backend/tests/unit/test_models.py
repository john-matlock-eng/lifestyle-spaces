"""
Comprehensive unit tests for Pydantic models.
"""
import pytest
from datetime import datetime, timezone
from typing import Dict, Any
from pydantic import ValidationError
import uuid


class TestUserModels:
    """Test User-related Pydantic models."""
    
    def test_user_base_model_valid(self):
        """Test UserBase model with valid data."""
        from app.models.user import UserBase
        
        user_data = {
            "email": "test@example.com",
            "username": "testuser",
            "full_name": "Test User"
        }
        user = UserBase(**user_data)
        assert user.email == "test@example.com"
        assert user.username == "testuser"
        assert user.full_name == "Test User"
    
    def test_user_base_model_email_validation(self):
        """Test UserBase model email validation."""
        from app.models.user import UserBase
        
        # Invalid email should raise ValidationError
        with pytest.raises(ValidationError) as exc_info:
            UserBase(
                email="invalid-email",
                username="testuser",
                full_name="Test User"
            )
        assert "value is not a valid email address" in str(exc_info.value)
    
    def test_user_base_model_optional_fields(self):
        """Test UserBase model with optional fields."""
        from app.models.user import UserBase
        
        user = UserBase(
            email="test@example.com",
            username="testuser"
        )
        assert user.full_name is None
    
    def test_user_create_model(self):
        """Test UserCreate model with password."""
        from app.models.user import UserCreate
        
        user_data = {
            "email": "test@example.com",
            "username": "testuser",
            "full_name": "Test User",
            "password": "securePassword123!"
        }
        user = UserCreate(**user_data)
        assert user.password == "securePassword123!"
    
    def test_user_create_password_validation(self):
        """Test UserCreate model password validation."""
        from app.models.user import UserCreate
        
        # Short password should raise ValidationError
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="test@example.com",
                username="testuser",
                password="short"
            )
        assert "at least 8 characters" in str(exc_info.value)
    
    def test_user_response_model(self):
        """Test UserResponse model."""
        from app.models.user import UserResponse
        
        user_data = {
            "id": "user123",
            "email": "test@example.com",
            "username": "testuser",
            "full_name": "Test User",
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        user = UserResponse(**user_data)
        assert user.id == "user123"
        assert user.is_active is True
        assert isinstance(user.created_at, datetime)
    
    def test_user_update_model(self):
        """Test UserUpdate model with partial updates."""
        from app.models.user import UserUpdate
        
        # All fields are optional
        user_update = UserUpdate()
        assert user_update.email is None
        assert user_update.full_name is None
        
        # Partial update
        user_update = UserUpdate(full_name="Updated Name")
        assert user_update.full_name == "Updated Name"
        assert user_update.email is None
    
    def test_token_response_model(self):
        """Test TokenResponse model."""
        from app.models.user import TokenResponse
        
        token_data = {
            "access_token": "jwt-token-here",
            "token_type": "bearer",
            "expires_in": 3600
        }
        token = TokenResponse(**token_data)
        assert token.access_token == "jwt-token-here"
        assert token.token_type == "bearer"
        assert token.expires_in == 3600
    
    def test_login_request_model(self):
        """Test LoginRequest model."""
        from app.models.user import LoginRequest
        
        login_data = {
            "email": "test@example.com",
            "password": "password123"
        }
        login = LoginRequest(**login_data)
        assert login.email == "test@example.com"
        assert login.password == "password123"


class TestSpaceModels:
    """Test Space-related Pydantic models."""
    
    def test_space_base_model(self):
        """Test SpaceBase model."""
        from app.models.space import SpaceBase
        
        space_data = {
            "name": "My Workspace",
            "description": "A collaborative workspace",
            "is_public": False
        }
        space = SpaceBase(**space_data)
        assert space.name == "My Workspace"
        assert space.description == "A collaborative workspace"
        assert space.is_public is False
    
    def test_space_base_defaults(self):
        """Test SpaceBase model with defaults."""
        from app.models.space import SpaceBase
        
        space = SpaceBase(
            name="My Workspace"
        )
        assert space.description is None
        assert space.is_public is False  # Default value
    
    def test_space_create_model(self):
        """Test SpaceCreate model."""
        from app.models.space import SpaceCreate
        
        space_data = {
            "name": "New Space",
            "type": "retail",
            "metadata": {"size": "1000sqft", "location": "downtown"}
        }
        space = SpaceCreate(**space_data)
        assert space.metadata == {"size": "1000sqft", "location": "downtown"}
    
    def test_space_response_model(self):
        """Test SpaceResponse model."""
        from app.models.space import SpaceResponse
        
        space_data = {
            "id": "space123",
            "name": "My Space",
            "type": "office",
            "owner_id": "user123",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "member_count": 5,
            "is_owner": True
        }
        space = SpaceResponse(**space_data)
        assert space.id == "space123"
        assert space.owner_id == "user123"
        assert space.member_count == 5
        assert space.is_owner is True
    
    def test_space_update_model(self):
        """Test SpaceUpdate model."""
        from app.models.space import SpaceUpdate
        
        # All fields optional
        update = SpaceUpdate()
        assert update.name is None
        
        # Partial update
        update = SpaceUpdate(name="Updated Name", is_public=True)
        assert update.name == "Updated Name"
        assert update.is_public is True
    
    def test_space_member_model(self):
        """Test SpaceMember model."""
        from app.models.space import SpaceMember
        
        member_data = {
            "user_id": "user123",
            "username": "johndoe",
            "email": "john@example.com",
            "role": "admin",
            "joined_at": datetime.now(timezone.utc)
        }
        member = SpaceMember(**member_data)
        assert member.user_id == "user123"
        assert member.role == "admin"
    
    def test_space_member_role_validation(self):
        """Test SpaceMember role validation."""
        from app.models.space import SpaceMember
        
        # Invalid role should raise ValidationError
        with pytest.raises(ValidationError) as exc_info:
            SpaceMember(
                user_id="user123",
                username="johndoe",
                email="john@example.com",
                role="invalid_role",
                joined_at=datetime.now(timezone.utc)
            )
        assert "Role must be one of" in str(exc_info.value)
    
    def test_space_list_response_model(self):
        """Test SpaceListResponse model."""
        from app.models.space import SpaceListResponse, SpaceResponse
        
        spaces = [
            SpaceResponse(
                id=f"space{i}",
                name=f"Space {i}",
                type="office",
                owner_id="user123",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            for i in range(3)
        ]
        
        list_response = SpaceListResponse(
            spaces=spaces,
            total=3,
            page=1,
            page_size=10
        )
        assert len(list_response.spaces) == 3
        assert list_response.total == 3


class TestInvitationModels:
    """Test Invitation-related Pydantic models."""
    
    def test_invitation_create_model(self):
        """Test InvitationCreate model."""
        from app.models.invitation import InvitationCreate
        
        invitation_data = {
            "email": "invitee@example.com",
            "role": "member",
            "message": "Join our workspace!"
        }
        invitation = InvitationCreate(**invitation_data)
        assert invitation.email == "invitee@example.com"
        assert invitation.role == "member"
    
    def test_invitation_create_defaults(self):
        """Test InvitationCreate model with defaults."""
        from app.models.invitation import InvitationCreate
        
        invitation = InvitationCreate(
            email="invitee@example.com"
        )
        assert invitation.role == "viewer"  # Default role
        assert invitation.message is None
    
    def test_invitation_response_model(self):
        """Test InvitationResponse model."""
        from app.models.invitation import InvitationResponse
        
        invitation_data = {
            "id": "inv123",
            "space_id": "space123",
            "space_name": "My Space",
            "inviter_id": "user123",
            "inviter_name": "John Doe",
            "invitee_email": "invitee@example.com",
            "role": "member",
            "status": "pending",
            "expires_at": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc)
        }
        invitation = InvitationResponse(**invitation_data)
        assert invitation.id == "inv123"
        assert invitation.status == "pending"
    
    def test_invitation_status_validation(self):
        """Test InvitationResponse status validation."""
        from app.models.invitation import InvitationResponse
        
        # Invalid status should raise ValidationError
        with pytest.raises(ValidationError) as exc_info:
            InvitationResponse(
                id="inv123",
                space_id="space123",
                space_name="My Space",
                inviter_id="user123",
                inviter_name="John Doe",
                invitee_email="invitee@example.com",
                role="member",
                status="invalid_status",
                expires_at=datetime.now(timezone.utc),
                created_at=datetime.now(timezone.utc)
            )
        assert "Status must be one of" in str(exc_info.value)
    
    def test_invitation_accept_model(self):
        """Test InvitationAccept model."""
        from app.models.invitation import InvitationAccept
        
        accept_data = {
            "invitation_code": "abc123xyz"
        }
        accept = InvitationAccept(**accept_data)
        assert accept.invitation_code == "abc123xyz"
    
    def test_invitation_list_response_model(self):
        """Test InvitationListResponse model."""
        from app.models.invitation import InvitationListResponse, InvitationResponse
        
        invitations = [
            InvitationResponse(
                id=f"inv{i}",
                space_id="space123",
                space_name="My Space",
                inviter_id="user123",
                inviter_name="John Doe",
                invitee_email=f"user{i}@example.com",
                role="member",
                status="pending",
                expires_at=datetime.now(timezone.utc),
                created_at=datetime.now(timezone.utc)
            )
            for i in range(2)
        ]
        
        list_response = InvitationListResponse(
            invitations=invitations,
            total=2
        )
        assert len(list_response.invitations) == 2
        assert list_response.total == 2


class TestRequestResponseModels:
    """Test general request/response models."""
    
    def test_error_response_model(self):
        """Test ErrorResponse model."""
        from app.models.common import ErrorResponse
        
        error = ErrorResponse(
            detail="Resource not found",
            status_code=404
        )
        assert error.detail == "Resource not found"
        assert error.status_code == 404
    
    def test_success_response_model(self):
        """Test SuccessResponse model."""
        from app.models.common import SuccessResponse
        
        success = SuccessResponse(
            message="Operation completed successfully",
            data={"id": "123"}
        )
        assert success.message == "Operation completed successfully"
        assert success.data == {"id": "123"}
    
    def test_pagination_params_model(self):
        """Test PaginationParams model."""
        from app.models.common import PaginationParams
        
        # Default values
        params = PaginationParams()
        assert params.page == 1
        assert params.page_size == 20
        
        # Custom values
        params = PaginationParams(page=2, page_size=50)
        assert params.page == 2
        assert params.page_size == 50
    
    def test_pagination_params_validation(self):
        """Test PaginationParams validation."""
        from app.models.common import PaginationParams
        
        # Page must be >= 1
        with pytest.raises(ValidationError):
            PaginationParams(page=0)
        
        # Page size must be between 1 and 100
        with pytest.raises(ValidationError):
            PaginationParams(page_size=0)
        
        with pytest.raises(ValidationError):
            PaginationParams(page_size=101)
    
    def test_model_serialization(self):
        """Test model serialization to dict/json."""
        from app.models.user import UserBase
        
        user = UserBase(
            email="test@example.com",
            username="testuser",
            full_name="Test User"
        )
        
        # Test dict serialization
        user_dict = user.model_dump()
        assert user_dict["email"] == "test@example.com"
        assert user_dict["username"] == "testuser"
        
        # Test JSON serialization
        user_json = user.model_dump_json()
        assert isinstance(user_json, str)
        assert "test@example.com" in user_json
    
    def test_model_field_exclusion(self):
        """Test excluding fields during serialization."""
        from app.models.user import UserCreate
        
        user = UserCreate(
            email="test@example.com",
            username="testuser",
            password="secret123"
        )
        
        # Exclude password field
        user_dict = user.model_dump(exclude={"password"})
        assert "password" not in user_dict
        assert "email" in user_dict
    
    def test_model_validation_with_extra_fields(self):
        """Test model behavior with extra fields."""
        from app.models.user import UserBase
        
        # Extra fields should be ignored by default
        user_data = {
            "email": "test@example.com",
            "username": "testuser",
            "extra_field": "should be ignored"
        }
        user = UserBase(**user_data)
        assert not hasattr(user, "extra_field")