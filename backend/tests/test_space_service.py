"""
Unit tests for SpaceService.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone
from botocore.exceptions import ClientError
from app.services.space import SpaceService
from app.services.exceptions import (
    SpaceNotFoundError,
    UnauthorizedError,
    ValidationError,
    InvalidInviteCodeError,
    AlreadyMemberError
)
from app.models.space import SpaceCreate, SpaceUpdate


class TestSpaceService:
    """Tests for SpaceService class."""
    
    @pytest.fixture
    def mock_table(self):
        """Create a mock DynamoDB table."""
        with patch('app.services.space.boto3.resource') as mock_resource:
            mock_table = MagicMock()
            mock_resource.return_value.Table.return_value = mock_table
            yield mock_table
    
    @pytest.fixture
    def service(self, mock_table):
        """Create a SpaceService instance with mocked DynamoDB."""
        with patch.object(SpaceService, '_get_or_create_table', return_value=mock_table):
            return SpaceService()
    
    def test_create_space_with_empty_name(self, service):
        """Test that creating a space with empty name raises ValidationError."""
        # Pydantic validates at model creation, so this should fail
        from pydantic import ValidationError as PydanticValidationError
        
        with pytest.raises(PydanticValidationError):
            space = SpaceCreate(name="", type="workspace")
    
    def test_create_space_with_whitespace_name(self, service):
        """Test that creating a space with whitespace-only name raises ValidationError."""
        # Pydantic validator strips whitespace and raises error
        from pydantic import ValidationError as PydanticValidationError
        
        with pytest.raises(PydanticValidationError):
            space = SpaceCreate(name="   ", type="workspace")
    
    def test_get_space_not_found(self, service, mock_table):
        """Test getting a non-existent space raises SpaceNotFoundError."""
        mock_table.get_item.return_value = {}  # No 'Item' key means not found
        
        with pytest.raises(SpaceNotFoundError, match="Space test-id not found"):
            service.get_space("test-id", "user-123")
    
    def test_get_space_non_member_private(self, service, mock_table):
        """Test non-member cannot access private space."""
        # Space exists
        mock_table.get_item.side_effect = [
            {'Item': {
                'id': 'test-id',
                'name': 'Private Space',
                'is_public': False,
                'owner_id': 'owner-123',
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }},
            {}  # User is not a member
        ]
        
        with pytest.raises(UnauthorizedError, match="You are not a member of this space"):
            service.get_space("test-id", "user-456")
    
    def test_update_space_not_found(self, service, mock_table):
        """Test updating non-existent space raises SpaceNotFoundError."""
        mock_table.get_item.return_value = {}
        update = SpaceUpdate(name="New Name")
        
        with pytest.raises(SpaceNotFoundError, match="Space test-id not found"):
            service.update_space("test-id", update, "user-123")
    
    def test_update_space_without_permission(self, service, mock_table):
        """Test that members without permission cannot update space."""
        mock_table.get_item.return_value = {'Item': {'id': 'test-id'}}
        update = SpaceUpdate(name="New Name")
        
        with patch.object(service, 'can_edit_space', return_value=False):
            with pytest.raises(UnauthorizedError, match="Only admins can update space settings"):
                service.update_space("test-id", update, "user-123")
    
    def test_update_space_empty_name(self, service, mock_table):
        """Test updating space with empty name raises ValidationError."""
        # Pydantic validates at model creation
        from pydantic import ValidationError as PydanticValidationError
        
        with pytest.raises(PydanticValidationError):
            update = SpaceUpdate(name="")
    
    def test_generate_invite_code(self, service):
        """Test invite code generation."""
        code = service._generate_invite_code()
        assert len(code) == 8
        assert code.isupper() or code.isalnum()
    
    def test_can_edit_space_owner(self, service, mock_table):
        """Test that owner can edit space."""
        mock_table.get_item.return_value = {
            'Item': {'role': 'owner'}
        }
        
        assert service.can_edit_space("space-id", "user-123") is True
    
    def test_can_edit_space_admin(self, service, mock_table):
        """Test that admin can edit space."""
        mock_table.get_item.return_value = {
            'Item': {'role': 'admin'}
        }
        
        assert service.can_edit_space("space-id", "user-123") is True
    
    def test_can_edit_space_member(self, service, mock_table):
        """Test that regular member cannot edit space."""
        mock_table.get_item.return_value = {
            'Item': {'role': 'member'}
        }
        
        assert service.can_edit_space("space-id", "user-123") is False
    
    def test_can_edit_space_non_member(self, service, mock_table):
        """Test that non-member cannot edit space."""
        mock_table.get_item.return_value = {}
        
        assert service.can_edit_space("space-id", "user-123") is False
    
    def test_get_space_member_role(self, service, mock_table):
        """Test getting user's role in a space."""
        mock_table.get_item.return_value = {
            'Item': {'role': 'admin'}
        }
        
        role = service.get_space_member_role("space-id", "user-123")
        assert role == 'admin'
    
    def test_get_space_member_role_not_member(self, service, mock_table):
        """Test getting role for non-member returns None."""
        mock_table.get_item.return_value = {}
        
        role = service.get_space_member_role("space-id", "user-123")
        assert role is None
    
    def test_get_space_members_not_found(self, service, mock_table):
        """Test getting members of non-existent space."""
        mock_table.get_item.return_value = {}
        
        with pytest.raises(SpaceNotFoundError, match="Space test-id not found"):
            service.get_space_members("test-id", "user-123")
    
    def test_get_space_members_non_member_private(self, service, mock_table):
        """Test non-member cannot get members of private space."""
        mock_table.get_item.side_effect = [
            {'Item': {'is_public': False}},  # Space exists and is private
            {}  # User is not a member
        ]
        
        with pytest.raises(UnauthorizedError, match="You are not a member of this space"):
            service.get_space_members("test-id", "user-456")
    
    def test_join_space_with_invalid_invite_code(self, service, mock_table):
        """Test joining with invalid invite code."""
        mock_table.get_item.return_value = {}
        mock_table.query.return_value = {'Items': []}
        
        with pytest.raises(InvalidInviteCodeError, match="Invalid invite code"):
            service.join_space_with_invite_code("INVALID", "user-123", "user", "user@example.com")
    
    def test_join_space_already_member(self, service, mock_table):
        """Test joining space when already a member."""
        # First get_item for invite code lookup returns valid space_id
        # Second get_item checks membership and finds user is already a member
        mock_table.get_item.side_effect = [
            {},  # No direct invite code match
            {'Item': {'user_id': 'user-123'}}  # User is already a member
        ]
        mock_table.query.return_value = {'Items': [{'space_id': 'space-123'}]}
        
        with pytest.raises(AlreadyMemberError, match="You are already a member of this space"):
            service.join_space_with_invite_code("VALID123", "user-123", "user", "user@example.com")