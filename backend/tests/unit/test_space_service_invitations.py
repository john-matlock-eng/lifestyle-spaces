"""
Unit tests for SpaceService invitation management methods.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone
from botocore.exceptions import ClientError
from app.services.space import SpaceService
from app.services.exceptions import (
    SpaceNotFoundError,
    InvalidInviteCodeError,
    AlreadyMemberError
)


class TestSpaceServiceInvitations:
    """Test SpaceService invitation management methods."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.service = SpaceService()
        self.mock_table = Mock()
        self.service.table = self.mock_table
    
    def test_get_member_found(self):
        """Test getting an existing member."""
        # Mock DynamoDB response
        self.mock_table.get_item.return_value = {
            'Item': {
                'PK': 'SPACE#space123',
                'SK': 'MEMBER#user456',
                'user_id': 'user456',
                'username': 'testuser',
                'email': 'test@example.com',
                'role': 'admin',
                'joined_at': '2024-01-01T00:00:00Z'
            }
        }
        
        result = self.service.get_member('space123', 'user456')
        
        assert result is not None
        assert result['user_id'] == 'user456'
        assert result['role'] == 'admin'
        
        self.mock_table.get_item.assert_called_once_with(
            Key={'PK': 'SPACE#space123', 'SK': 'MEMBER#user456'}
        )
    
    def test_get_member_not_found(self):
        """Test getting a non-existent member."""
        # Mock DynamoDB response - no item found
        self.mock_table.get_item.return_value = {}
        
        result = self.service.get_member('space123', 'nonexistent')
        
        assert result is None
        
        self.mock_table.get_item.assert_called_once_with(
            Key={'PK': 'SPACE#space123', 'SK': 'MEMBER#nonexistent'}
        )
    
    @patch('app.services.space.datetime')
    @patch('app.services.space.secrets')
    def test_regenerate_invite_code_success(self, mock_secrets, mock_datetime):
        """Test successful invite code regeneration."""
        # Setup mocks
        mock_datetime.now.return_value.isoformat.return_value = '2024-01-01T00:00:00Z'
        mock_secrets.token_urlsafe.return_value = 'NEWCODE123456'
        
        # Mock get_item for existing space
        self.mock_table.get_item.return_value = {
            'Item': {
                'PK': 'SPACE#space123',
                'SK': 'METADATA',
                'invite_code': 'OLDCODE'
            }
        }
        
        # Mock update and put operations
        self.mock_table.update_item.return_value = {}
        self.mock_table.delete_item.return_value = {}
        self.mock_table.put_item.return_value = {}
        
        result = self.service.regenerate_invite_code('space123')
        
        assert result == 'NEWCODE1'  # First 8 chars after upper()
        
        # Verify space was fetched
        self.mock_table.get_item.assert_called_once_with(
            Key={'PK': 'SPACE#space123', 'SK': 'METADATA'}
        )
        
        # Verify space was updated with new code
        self.mock_table.update_item.assert_called_once()
        update_call = self.mock_table.update_item.call_args
        assert update_call[1]['Key'] == {'PK': 'SPACE#space123', 'SK': 'METADATA'}
        assert ':code' in update_call[1]['ExpressionAttributeValues']
        
        # Verify old invite mapping was deleted
        self.mock_table.delete_item.assert_called_once_with(
            Key={'PK': 'INVITE#OLDCODE', 'SK': 'SPACE#space123'}
        )
        
        # Verify new invite mapping was created
        self.mock_table.put_item.assert_called_once()
        put_call = self.mock_table.put_item.call_args
        assert put_call[1]['Item']['PK'] == 'INVITE#NEWCODE1'
        assert put_call[1]['Item']['SK'] == 'SPACE#space123'
        assert put_call[1]['Item']['space_id'] == 'space123'
    
    def test_regenerate_invite_code_space_not_found(self):
        """Test regenerating invite code for non-existent space."""
        # Mock get_item to return no item
        self.mock_table.get_item.return_value = {}
        
        with pytest.raises(SpaceNotFoundError) as exc_info:
            self.service.regenerate_invite_code('nonexistent')
        
        assert "Space nonexistent not found" in str(exc_info.value)
        
        # Verify no update operations were attempted
        self.mock_table.update_item.assert_not_called()
        self.mock_table.put_item.assert_not_called()
    
    @patch('app.services.space.datetime')
    @patch('app.services.space.secrets')
    def test_regenerate_invite_code_no_old_code(self, mock_secrets, mock_datetime):
        """Test regenerating invite code when space has no existing code."""
        # Setup mocks
        mock_datetime.now.return_value.isoformat.return_value = '2024-01-01T00:00:00Z'
        mock_secrets.token_urlsafe.return_value = 'FIRSTCODE123'
        
        # Mock get_item for space without invite_code
        self.mock_table.get_item.return_value = {
            'Item': {
                'PK': 'SPACE#space123',
                'SK': 'METADATA'
                # No invite_code field
            }
        }
        
        self.mock_table.update_item.return_value = {}
        self.mock_table.put_item.return_value = {}
        
        result = self.service.regenerate_invite_code('space123')
        
        assert result == 'FIRSTCOD'  # First 8 chars
        
        # Verify delete was not called (no old code)
        self.mock_table.delete_item.assert_not_called()
        
        # Verify new invite mapping was created
        self.mock_table.put_item.assert_called_once()
    
    @patch('app.services.space.datetime')
    @patch('app.services.space.secrets')  
    def test_regenerate_invite_code_delete_old_fails(self, mock_secrets, mock_datetime):
        """Test that regeneration continues even if old code deletion fails."""
        # Setup mocks
        mock_datetime.now.return_value.isoformat.return_value = '2024-01-01T00:00:00Z'
        mock_secrets.token_urlsafe.return_value = 'NEWCODE789'
        
        # Mock get_item for existing space
        self.mock_table.get_item.return_value = {
            'Item': {
                'PK': 'SPACE#space123',
                'SK': 'METADATA',
                'invite_code': 'OLDCODE'
            }
        }
        
        # Mock delete to fail
        self.mock_table.delete_item.side_effect = Exception("Delete failed")
        self.mock_table.update_item.return_value = {}
        self.mock_table.put_item.return_value = {}
        
        # Should not raise exception
        result = self.service.regenerate_invite_code('space123')
        
        assert result == 'NEWCODE7'  # First 8 chars
        
        # Verify new invite mapping was still created
        self.mock_table.put_item.assert_called_once()
    
    def test_join_space_with_invite_code_already_exists(self):
        """Test that join_space_with_invite_code handles existing members."""
        # Mock initial get_item to look for old pattern (returns no item)
        # Then mock query for invite code
        self.mock_table.get_item.side_effect = [
            {},  # First call for old pattern
            {'Item': {'user_id': 'user456', 'role': 'member'}}  # Second call for member check
        ]
        
        self.mock_table.query.return_value = {
            'Items': [{'space_id': 'space123'}]
        }
        
        with pytest.raises(AlreadyMemberError) as exc_info:
            self.service.join_space_with_invite_code(
                invite_code='VALIDCODE',
                user_id='user456',
                username='testuser',
                email='test@example.com'
            )
        
        assert "already a member" in str(exc_info.value)
    
    def test_join_space_with_invite_code_invalid_code(self):
        """Test joining with invalid invite code."""
        # Mock query to return no items
        self.mock_table.query.return_value = {'Items': []}
        
        with pytest.raises(InvalidInviteCodeError) as exc_info:
            self.service.join_space_with_invite_code(
                invite_code='BADCODE',
                user_id='user456',
                username='testuser',
                email='test@example.com'
            )
        
        assert "Invalid invite code" in str(exc_info.value)