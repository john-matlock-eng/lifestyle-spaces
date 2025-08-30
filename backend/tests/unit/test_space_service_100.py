"""Comprehensive tests for achieving 100% coverage of app/services/space.py."""

import pytest
from unittest.mock import Mock, patch, MagicMock
from botocore.exceptions import ClientError
from datetime import datetime, timezone
from decimal import Decimal

from app.services.space import SpaceService
from app.services.exceptions import (
    ValidationError, SpaceNotFoundError, UnauthorizedError,
    InvalidInviteCodeError, AlreadyMemberError
)


class TestSpaceService100Coverage:
    """Test class for 100% coverage of SpaceService."""
    
    @pytest.fixture
    def mock_table(self):
        """Create a mock DynamoDB table."""
        table = Mock()
        return table
    
    @pytest.fixture
    def space_service(self, mock_table):
        """Create SpaceService instance with mocked table."""
        with patch('app.services.space.boto3.resource') as mock_resource:
            mock_resource.return_value.Table.return_value = mock_table
            service = SpaceService()
            service.table = mock_table
            return service
    
    def test_create_space_validation_error_empty_name(self, space_service):
        """Test create_space raises ValidationError for empty name - Line 84."""
        # Use a mock to bypass Pydantic validation
        space = Mock()
        space.name = "   "  # Empty after strip
        space.description = "Test"
        space.is_public = False
        space.metadata = {}
        
        with pytest.raises(ValidationError, match="Space name is required"):
            space_service.create_space(space, "user123", "", "")
        
        # Test with None name
        space.name = None
        with pytest.raises(ValidationError, match="Space name is required"):
            space_service.create_space(space, "user123", "", "")
    
    def test_update_space_not_found_client_error(self, space_service, mock_table):
        """Test update_space handles ClientError when space not found - Line 199."""
        from app.models.space import SpaceUpdate
        
        # Mock table.get_item to raise ClientError
        mock_table.get_item.side_effect = ClientError(
            error_response={'Error': {'Code': 'ResourceNotFoundException'}},
            operation_name='GetItem'
        )
        
        update = SpaceUpdate(name="New Name")
        with pytest.raises(SpaceNotFoundError, match="Space space123 not found"):
            space_service.update_space("space123", update, "user123")
    
    def test_update_space_validation_error_empty_name(self, space_service, mock_table):
        """Test update_space raises ValidationError for empty name - Line 207."""
        from app.models.space import SpaceUpdate
        
        # Mock successful get_item
        mock_table.get_item.return_value = {
            'Item': {
                'space_id': 'space123',
                'owner_id': 'user123',
                'name': 'Old Name'
            }
        }
        
        # Mock can_edit_space to return True
        with patch.object(space_service, 'can_edit_space', return_value=True):
            # Test with empty string after strip
            update = SpaceUpdate(name="   ")
            with pytest.raises(ValidationError, match="Space name cannot be empty"):
                space_service.update_space("space123", update, "user123")
    
    def test_list_user_spaces_handles_missing_space(self, space_service, mock_table):
        """Test list_user_spaces handles SpaceNotFoundError gracefully - Lines 326-327."""
        # Mock query to return user's space memberships with proper GSI fields
        mock_table.query.return_value = {
            'Items': [
                {'GSI1SK': 'SPACE#space1', 'role': 'admin'},
                {'GSI1SK': 'SPACE#space2', 'role': 'member'}
            ]
        }
        
        # Mock get_item to fail for first space, succeed for second
        def get_item_side_effect(Key):
            if 'space1' in Key['PK']:
                raise ClientError(
                    error_response={'Error': {'Code': 'ResourceNotFoundException'}},
                    operation_name='GetItem'
                )
            return {
                'Item': {
                    'space_id': 'space2',
                    'name': 'Space 2',
                    'description': 'Test',
                    'created_at': '2024-01-01T00:00:00Z',
                    'updated_at': '2024-01-01T00:00:00Z'
                }
            }
        
        mock_table.get_item.side_effect = get_item_side_effect
        
        # Should only return the space that exists
        result = space_service.list_user_spaces("user123")
        assert result['total'] == 1
        assert len(result['spaces']) == 1
        assert result['spaces'][0]['space_id'] == 'space2'
    
    def test_list_user_spaces_handles_space_not_found_error(self, space_service, mock_table):
        """Test list_user_spaces handles SpaceNotFoundError exception - Lines 326-327."""
        # Mock query to return user's space memberships with proper GSI fields
        mock_table.query.return_value = {
            'Items': [
                {'GSI1SK': 'SPACE#space1', 'role': 'admin'}
            ]
        }
        
        # Mock get_space to raise SpaceNotFoundError
        with patch.object(space_service, 'get_space', side_effect=SpaceNotFoundError("Space not found")):
            result = space_service.list_user_spaces("user123")
            assert result['total'] == 0
            assert len(result['spaces']) == 0
    
    def test_get_space_client_error(self, space_service, mock_table):
        """Test get_space handles generic ClientError - Line 394."""
        # Mock table.get_item to raise generic ClientError
        mock_table.get_item.side_effect = ClientError(
            error_response={'Error': {'Code': 'InternalServerError'}},
            operation_name='GetItem'
        )
        
        with pytest.raises(SpaceNotFoundError, match="Space space123 not found"):
            space_service.get_space("space123", "user123")
    
    def test_get_user_role_client_error(self, space_service, mock_table):
        """Test get_user_role handles ClientError and returns None - Lines 453-454."""
        # Mock table.get_item to raise ClientError
        mock_table.get_item.side_effect = ClientError(
            error_response={'Error': {'Code': 'InternalServerError'}},
            operation_name='GetItem'
        )
        
        result = space_service.get_user_role("space123", "user123")
        assert result is None
    
    def test_join_space_with_invite_code_no_space_id_in_invite(self, space_service, mock_table):
        """Test join_space handles invite without space_id - Lines 476, 479."""
        # First get_item returns an item without space_id
        mock_table.get_item.return_value = {
            'Item': {
                'PK': 'INVITE#ABC123',
                'SK': 'SPACE#ABC123'
                # Missing space_id field
            }
        }
        
        with pytest.raises(InvalidInviteCodeError, match="Invalid invite code"):
            space_service.join_space_with_invite_code("ABC123", "user123", "testuser", "test@example.com")
    
    def test_join_space_with_invite_code_query_fallback_no_space_id(self, space_service, mock_table):
        """Test join_space query fallback when space_id missing - Lines 478-479."""
        # First get_item returns no item
        mock_table.get_item.return_value = {}
        
        # Query returns items but without space_id
        mock_table.query.return_value = {
            'Items': [{
                'PK': 'INVITE#ABC123',
                'SK': 'SPACE#ABC123'
                # Missing space_id
            }]
        }
        
        with pytest.raises(InvalidInviteCodeError, match="Invalid invite code"):
            space_service.join_space_with_invite_code("ABC123", "user123", "testuser", "test@example.com")
    
    def test_join_space_with_invite_code_generic_exception(self, space_service, mock_table):
        """Test join_space handles generic exception - Lines 519-520."""
        # Mock successful invite lookup
        mock_table.get_item.return_value = {
            'Item': {
                'space_id': 'space123'
            }
        }
        
        # Mock member check to show not a member
        def get_item_side_effect(Key):
            if 'INVITE#' in Key['PK']:
                return {'Item': {'space_id': 'space123'}}
            elif 'MEMBER#' in Key['SK']:
                return {}  # Not a member
            else:
                raise Exception("Unexpected database error")
        
        mock_table.get_item.side_effect = get_item_side_effect
        
        # Mock put_item to raise generic exception
        mock_table.put_item.side_effect = Exception("Database write failed")
        
        with pytest.raises(InvalidInviteCodeError, match="Invalid invite code"):
            space_service.join_space_with_invite_code("ABC123", "user123", "testuser", "test@example.com")
    
    def test_join_space_success_flow_lines_490_508(self, space_service, mock_table):
        """Test successful join_space flow covering lines 490-508."""
        # Setup mocks for successful flow
        # Mock member check - not a member yet
        def get_item_side_effect(Key):
            if 'INVITE#' in Key['PK']:
                return {'Item': {'space_id': 'space123'}}
            elif 'MEMBER#' in Key['SK'] and 'user123' in Key['SK']:
                return {}  # Not a member yet
            else:
                # For space metadata lookup
                return {
                    'Item': {
                        'space_id': 'space123',
                        'name': 'Test Space',
                        'owner_id': 'owner123',
                        'is_public': True
                    }
                }
        
        mock_table.get_item.side_effect = get_item_side_effect
        
        # Mock query for members list (for get_space)
        mock_table.query.return_value = {
            'Items': [
                {'user_id': 'owner123', 'role': 'owner', 'username': 'owner'}
            ]
        }
        
        # Mock successful put_item
        mock_table.put_item.return_value = {}
        
        # Call the method
        result = space_service.join_space_with_invite_code(
            "ABC123", "user123", "testuser", "test@example.com"
        )
        
        # Verify result
        assert result['space_id'] == 'space123'
        assert result['name'] == 'Test Space'
        assert result['role'] == 'member'
        assert 'joined_at' in result
        
        # Verify put_item was called with correct member data
        put_call = mock_table.put_item.call_args
        item = put_call.kwargs['Item']
        assert item['PK'] == 'SPACE#space123'
        assert item['SK'] == 'MEMBER#user123'
        assert item['user_id'] == 'user123'
        assert item['username'] == 'testuser'
        assert item['email'] == 'test@example.com'
        assert item['role'] == 'member'
        assert 'joined_at' in item