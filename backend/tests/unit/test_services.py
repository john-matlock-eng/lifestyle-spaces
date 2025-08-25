"""
Comprehensive unit tests for service layer.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock, AsyncMock
from datetime import datetime, timezone, timedelta
import uuid
import boto3
from moto import mock_cognitoidp, mock_dynamodb
from botocore.exceptions import ClientError


class TestCognitoService:
    """Test Cognito authentication service."""
    
    @mock_cognitoidp
    def test_create_user_pool(self):
        """Test creating Cognito user pool."""
        from app.services.cognito import CognitoService
        
        service = CognitoService()
        assert service.client is not None
        assert service.user_pool_id is not None
        assert service.client_id is not None
    
    @mock_cognitoidp
    def test_sign_up_user_success(self):
        """Test successful user sign up."""
        from app.services.cognito import CognitoService
        from app.models.user import UserCreate
        
        service = CognitoService()
        user = UserCreate(
            email="test@example.com",
            username="testuser",
            password="Test123!@#",
            full_name="Test User"
        )
        
        result = service.sign_up(user)
        assert result["user_sub"] is not None
        assert result["username"] == "testuser"
    
    @mock_cognitoidp
    def test_sign_up_duplicate_user(self):
        """Test sign up with duplicate username."""
        from app.services.cognito import CognitoService
        from app.models.user import UserCreate
        from app.services.exceptions import UserAlreadyExistsError
        
        service = CognitoService()
        user = UserCreate(
            email="test@example.com",
            username="testuser",
            password="Test123!@#"
        )
        
        # First sign up should succeed
        service.sign_up(user)
        
        # Second sign up should fail
        with pytest.raises(UserAlreadyExistsError):
            service.sign_up(user)
    
    @mock_cognitoidp
    def test_sign_in_success(self):
        """Test successful user sign in."""
        from app.services.cognito import CognitoService
        from app.models.user import UserCreate, LoginRequest
        
        service = CognitoService()
        
        # First create a user
        user = UserCreate(
            email="test@example.com",
            username="testuser",
            password="Test123!@#"
        )
        service.sign_up(user)
        service.confirm_user("test@example.com")  # Auto-confirm for testing
        
        # Then sign in
        login = LoginRequest(
            email="test@example.com",
            password="Test123!@#"
        )
        result = service.sign_in(login)
        assert "access_token" in result
        assert "id_token" in result
        assert "refresh_token" in result
    
    @mock_cognitoidp
    def test_sign_in_invalid_credentials(self):
        """Test sign in with invalid credentials."""
        from app.services.cognito import CognitoService
        from app.models.user import LoginRequest
        from app.services.exceptions import InvalidCredentialsError
        
        service = CognitoService()
        
        login = LoginRequest(
            email="nonexistent@example.com",
            password="WrongPassword"
        )
        
        with pytest.raises(InvalidCredentialsError):
            service.sign_in(login)
    
    @mock_cognitoidp
    def test_refresh_token_success(self):
        """Test refreshing access token."""
        from app.services.cognito import CognitoService
        from app.models.user import UserCreate, LoginRequest
        
        service = CognitoService()
        
        # Create and sign in user
        user = UserCreate(
            email="test@example.com",
            username="testuser",
            password="Test123!@#"
        )
        service.sign_up(user)
        service.confirm_user("test@example.com")
        
        login = LoginRequest(
            email="test@example.com",
            password="Test123!@#"
        )
        tokens = service.sign_in(login)
        
        # Refresh token
        new_tokens = service.refresh_token(tokens["refresh_token"])
        assert "access_token" in new_tokens
        assert "id_token" in new_tokens
    
    @mock_cognitoidp
    def test_sign_out_success(self):
        """Test user sign out."""
        from app.services.cognito import CognitoService
        from app.models.user import UserCreate, LoginRequest
        
        service = CognitoService()
        
        # Create and sign in user
        user = UserCreate(
            email="test@example.com",
            username="testuser",
            password="Test123!@#"
        )
        service.sign_up(user)
        service.confirm_user("test@example.com")
        
        login = LoginRequest(
            email="test@example.com",
            password="Test123!@#"
        )
        tokens = service.sign_in(login)
        
        # Sign out should not raise exception
        service.sign_out(tokens["access_token"])
    
    @mock_cognitoidp
    def test_get_user_info(self):
        """Test getting user information."""
        from app.services.cognito import CognitoService
        from app.models.user import UserCreate, LoginRequest
        
        service = CognitoService()
        
        # Create and sign in user
        user = UserCreate(
            email="test@example.com",
            username="testuser",
            password="Test123!@#",
            full_name="Test User"
        )
        service.sign_up(user)
        service.confirm_user("test@example.com")
        
        login = LoginRequest(
            email="test@example.com",
            password="Test123!@#"
        )
        tokens = service.sign_in(login)
        
        # Get user info
        user_info = service.get_user(tokens["access_token"])
        assert user_info["username"] == "test@example.com"
        assert user_info["email"] == "test@example.com"
    
    @mock_cognitoidp
    def test_update_user_attributes(self):
        """Test updating user attributes."""
        from app.services.cognito import CognitoService
        from app.models.user import UserCreate, LoginRequest, UserUpdate
        
        service = CognitoService()
        
        # Create and sign in user
        user = UserCreate(
            email="test@example.com",
            username="testuser",
            password="Test123!@#"
        )
        service.sign_up(user)
        service.confirm_user("test@example.com")
        
        login = LoginRequest(
            email="test@example.com",
            password="Test123!@#"
        )
        tokens = service.sign_in(login)
        
        # Update user
        update = UserUpdate(full_name="Updated Name")
        service.update_user(tokens["access_token"], update)
        
        # Verify update
        user_info = service.get_user(tokens["access_token"])
        assert user_info["full_name"] == "Updated Name"


class TestSpaceService:
    """Test Space management service."""
    
    @mock_dynamodb
    def test_create_dynamodb_table(self):
        """Test creating DynamoDB table."""
        from app.services.space import SpaceService
        
        service = SpaceService()
        assert service.table is not None
        assert service.table.table_name == "lifestyle-spaces"
    
    @mock_dynamodb
    def test_create_space_success(self):
        """Test creating a new space."""
        from app.services.space import SpaceService
        from app.models.space import SpaceCreate
        
        service = SpaceService()
        
        space = SpaceCreate(
            name="My Office",
            type="office",
            description="A collaborative workspace"
        )
        
        result = service.create_space(space, owner_id="user123")
        assert result["name"] == "My Office"
        assert result["owner_id"] == "user123"
        assert "id" in result
        assert "created_at" in result
    
    @mock_dynamodb
    def test_get_space_by_id(self):
        """Test getting space by ID."""
        from app.services.space import SpaceService
        from app.models.space import SpaceCreate
        
        service = SpaceService()
        
        # Create a space
        space = SpaceCreate(name="My Office", type="office")
        created = service.create_space(space, owner_id="user123")
        
        # Get the space
        retrieved = service.get_space(created["id"], user_id="user123")
        assert retrieved["id"] == created["id"]
        assert retrieved["name"] == "My Office"
        assert retrieved["is_owner"] is True
    
    @mock_dynamodb
    def test_get_space_not_found(self):
        """Test getting non-existent space."""
        from app.services.space import SpaceService
        from app.services.exceptions import SpaceNotFoundError
        
        service = SpaceService()
        
        with pytest.raises(SpaceNotFoundError):
            service.get_space("non-existent-id", user_id="user123")
    
    @mock_dynamodb
    def test_update_space_success(self):
        """Test updating a space."""
        from app.services.space import SpaceService
        from app.models.space import SpaceCreate, SpaceUpdate
        
        service = SpaceService()
        
        # Create a space
        space = SpaceCreate(name="My Office", type="office")
        created = service.create_space(space, owner_id="user123")
        
        # Update the space
        update = SpaceUpdate(name="Updated Office", is_public=True)
        updated = service.update_space(created["id"], update, user_id="user123")
        
        assert updated["name"] == "Updated Office"
        assert updated["is_public"] is True
    
    @mock_dynamodb
    def test_update_space_unauthorized(self):
        """Test updating space without permission."""
        from app.services.space import SpaceService
        from app.models.space import SpaceCreate, SpaceUpdate
        from app.services.exceptions import UnauthorizedError
        
        service = SpaceService()
        
        # Create a space
        space = SpaceCreate(name="My Office", type="office")
        created = service.create_space(space, owner_id="user123")
        
        # Try to update as different user
        update = SpaceUpdate(name="Hacked Office")
        with pytest.raises(UnauthorizedError):
            service.update_space(created["id"], update, user_id="user456")
    
    @mock_dynamodb
    def test_delete_space_success(self):
        """Test deleting a space."""
        from app.services.space import SpaceService
        from app.models.space import SpaceCreate
        
        service = SpaceService()
        
        # Create a space
        space = SpaceCreate(name="My Office", type="office")
        created = service.create_space(space, owner_id="user123")
        
        # Delete the space
        service.delete_space(created["id"], user_id="user123")
        
        # Verify it's deleted
        from app.services.exceptions import SpaceNotFoundError
        with pytest.raises(SpaceNotFoundError):
            service.get_space(created["id"], user_id="user123")
    
    @mock_dynamodb
    def test_list_user_spaces(self):
        """Test listing user's spaces."""
        from app.services.space import SpaceService
        from app.models.space import SpaceCreate
        
        service = SpaceService()
        
        # Create multiple spaces
        for i in range(3):
            space = SpaceCreate(name=f"Space {i}", type="office")
            service.create_space(space, owner_id="user123")
        
        # List spaces
        result = service.list_user_spaces("user123", page=1, page_size=10)
        assert result["total"] == 3
        assert len(result["spaces"]) == 3
    
    @mock_dynamodb
    def test_add_space_member(self):
        """Test adding member to space."""
        from app.services.space import SpaceService
        from app.models.space import SpaceCreate
        
        service = SpaceService()
        
        # Create a space
        space = SpaceCreate(name="My Office", type="office")
        created = service.create_space(space, owner_id="user123")
        
        # Add a member
        service.add_member(
            space_id=created["id"],
            user_id="user456",
            username="johndoe",
            email="john@example.com",
            role="member",
            added_by="user123"
        )
        
        # Verify member was added
        members = service.get_space_members(created["id"], user_id="user123")
        assert len(members) == 2  # Owner + new member
        assert any(m["user_id"] == "user456" for m in members)
    
    @mock_dynamodb
    def test_remove_space_member(self):
        """Test removing member from space."""
        from app.services.space import SpaceService
        from app.models.space import SpaceCreate
        
        service = SpaceService()
        
        # Create a space and add a member
        space = SpaceCreate(name="My Office", type="office")
        created = service.create_space(space, owner_id="user123")
        
        service.add_member(
            space_id=created["id"],
            user_id="user456",
            username="johndoe",
            email="john@example.com",
            role="member",
            added_by="user123"
        )
        
        # Remove the member
        service.remove_member(
            space_id=created["id"],
            member_id="user456",
            removed_by="user123"
        )
        
        # Verify member was removed
        members = service.get_space_members(created["id"], user_id="user123")
        assert len(members) == 1  # Only owner remains
        assert members[0]["user_id"] == "user123"
    
    @mock_dynamodb
    def test_space_member_permissions(self):
        """Test space member permission checks."""
        from app.services.space import SpaceService
        from app.models.space import SpaceCreate
        
        service = SpaceService()
        
        # Create a space
        space = SpaceCreate(name="My Office", type="office")
        created = service.create_space(space, owner_id="user123")
        
        # Add members with different roles
        service.add_member(created["id"], "user_admin", "admin", "admin@test.com", "admin", "user123")
        service.add_member(created["id"], "user_member", "member", "member@test.com", "member", "user123")
        service.add_member(created["id"], "user_viewer", "viewer", "viewer@test.com", "viewer", "user123")
        
        # Check permissions
        assert service.can_edit_space(created["id"], "user123") is True  # Owner
        assert service.can_edit_space(created["id"], "user_admin") is True  # Admin
        assert service.can_edit_space(created["id"], "user_member") is False  # Member
        assert service.can_edit_space(created["id"], "user_viewer") is False  # Viewer


class TestInvitationService:
    """Test Invitation service."""
    
    @mock_dynamodb
    def test_create_invitation(self):
        """Test creating an invitation."""
        from app.services.invitation import InvitationService
        from app.models.invitation import InvitationCreate
        
        service = InvitationService()
        
        invitation = InvitationCreate(
            email="invitee@example.com",
            role="member",
            message="Join our workspace!"
        )
        
        result = service.create_invitation(
            invitation=invitation,
            space_id="space123",
            space_name="My Office",
            inviter_id="user123",
            inviter_name="John Doe"
        )
        
        assert result["invitee_email"] == "invitee@example.com"
        assert result["status"] == "pending"
        assert "id" in result
        assert "invitation_code" in result
    
    @mock_dynamodb
    def test_create_duplicate_invitation(self):
        """Test creating duplicate invitation."""
        from app.services.invitation import InvitationService
        from app.models.invitation import InvitationCreate
        from app.services.exceptions import InvitationAlreadyExistsError
        
        service = InvitationService()
        
        invitation = InvitationCreate(email="invitee@example.com")
        
        # First invitation should succeed
        service.create_invitation(
            invitation=invitation,
            space_id="space123",
            space_name="My Office",
            inviter_id="user123",
            inviter_name="John Doe"
        )
        
        # Second invitation to same email/space should fail
        with pytest.raises(InvitationAlreadyExistsError):
            service.create_invitation(
                invitation=invitation,
                space_id="space123",
                space_name="My Office",
                inviter_id="user123",
                inviter_name="John Doe"
            )
    
    @mock_dynamodb
    def test_accept_invitation(self):
        """Test accepting an invitation."""
        from app.services.invitation import InvitationService
        from app.models.invitation import InvitationCreate
        
        service = InvitationService()
        
        # Create invitation
        invitation = InvitationCreate(email="invitee@example.com")
        created = service.create_invitation(
            invitation=invitation,
            space_id="space123",
            space_name="My Office",
            inviter_id="user123",
            inviter_name="John Doe"
        )
        
        # Accept invitation
        result = service.accept_invitation(
            invitation_code=created["invitation_code"],
            user_id="user456",
            username="invitee",
            email="invitee@example.com"
        )
        
        assert result["status"] == "accepted"
        assert result["space_id"] == "space123"
    
    @mock_dynamodb
    def test_accept_invalid_invitation(self):
        """Test accepting invalid invitation."""
        from app.services.invitation import InvitationService
        from app.services.exceptions import InvalidInvitationError
        
        service = InvitationService()
        
        with pytest.raises(InvalidInvitationError):
            service.accept_invitation(
                invitation_code="invalid-code",
                user_id="user456",
                username="invitee",
                email="invitee@example.com"
            )
    
    @mock_dynamodb
    def test_accept_expired_invitation(self):
        """Test accepting expired invitation."""
        from app.services.invitation import InvitationService
        from app.models.invitation import InvitationCreate
        from app.services.exceptions import InvitationExpiredError
        
        service = InvitationService()
        
        # Create invitation with past expiry
        with patch('app.services.invitation.datetime') as mock_datetime:
            mock_datetime.now.return_value = datetime.now(timezone.utc) - timedelta(days=8)
            mock_datetime.timezone = timezone
            
            invitation = InvitationCreate(email="invitee@example.com")
            created = service.create_invitation(
                invitation=invitation,
                space_id="space123",
                space_name="My Office",
                inviter_id="user123",
                inviter_name="John Doe"
            )
        
        # Try to accept expired invitation
        with pytest.raises(InvitationExpiredError):
            service.accept_invitation(
                invitation_code=created["invitation_code"],
                user_id="user456",
                username="invitee",
                email="invitee@example.com"
            )
    
    @mock_dynamodb
    def test_list_user_invitations(self):
        """Test listing user's invitations."""
        from app.services.invitation import InvitationService
        from app.models.invitation import InvitationCreate
        
        service = InvitationService()
        
        # Create multiple invitations
        for i in range(3):
            invitation = InvitationCreate(email="invitee@example.com")
            service.create_invitation(
                invitation=invitation,
                space_id=f"space{i}",
                space_name=f"Space {i}",
                inviter_id="user123",
                inviter_name="John Doe"
            )
        
        # List invitations
        result = service.list_user_invitations("invitee@example.com")
        assert result["total"] == 3
        assert len(result["invitations"]) == 3
    
    @mock_dynamodb
    def test_list_space_invitations(self):
        """Test listing space invitations."""
        from app.services.invitation import InvitationService
        from app.models.invitation import InvitationCreate
        
        service = InvitationService()
        
        # Create invitations for a space
        for i in range(2):
            invitation = InvitationCreate(email=f"user{i}@example.com")
            service.create_invitation(
                invitation=invitation,
                space_id="space123",
                space_name="My Office",
                inviter_id="user123",
                inviter_name="John Doe"
            )
        
        # List space invitations
        result = service.list_space_invitations("space123", requester_id="user123")
        assert result["total"] == 2
        assert len(result["invitations"]) == 2
    
    @mock_dynamodb
    def test_cancel_invitation(self):
        """Test canceling an invitation."""
        from app.services.invitation import InvitationService
        from app.models.invitation import InvitationCreate
        
        service = InvitationService()
        
        # Create invitation
        invitation = InvitationCreate(email="invitee@example.com")
        created = service.create_invitation(
            invitation=invitation,
            space_id="space123",
            space_name="My Office",
            inviter_id="user123",
            inviter_name="John Doe"
        )
        
        # Cancel invitation
        service.cancel_invitation(created["id"], cancelled_by="user123")
        
        # Verify it's cancelled
        from app.services.exceptions import InvalidInvitationError
        with pytest.raises(InvalidInvitationError):
            service.accept_invitation(
                invitation_code=created["invitation_code"],
                user_id="user456",
                username="invitee",
                email="invitee@example.com"
            )