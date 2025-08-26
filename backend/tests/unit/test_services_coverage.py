"""
Tests to achieve 100% coverage for services.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from botocore.exceptions import ClientError
from datetime import datetime, timezone


class TestSpaceServiceCoverage:
    """Test missing coverage areas in Space service."""
    
    def test_get_or_create_table_exception(self):
        """Test _get_or_create_table when table doesn't exist."""
        from app.services.space import SpaceService
        
        with patch('app.services.space.boto3.resource') as mock_boto:
            mock_dynamodb = Mock()
            mock_boto.return_value = mock_dynamodb
            
            # Mock Table to raise ClientError
            mock_dynamodb.Table.side_effect = ClientError(
                error_response={'Error': {'Code': 'ResourceNotFoundException'}}, 
                operation_name='DescribeTable'
            )
            
            # Mock create_table
            mock_table = Mock()
            mock_dynamodb.create_table.return_value = mock_table
            mock_table.wait_until_exists.return_value = None
            
            service = SpaceService()
            # Should call _create_table when table doesn't exist
            assert service.table == mock_table
    
    def test_create_table_already_exists(self):
        """Test _create_table when table already exists."""
        from app.services.space import SpaceService
        
        service = SpaceService()
        
        with patch.object(service.dynamodb, 'create_table') as mock_create, \
             patch.object(service.dynamodb, 'Table') as mock_table_func:
            
            # Mock create_table to raise ResourceInUseException
            mock_create.side_effect = ClientError(
                error_response={'Error': {'Code': 'ResourceInUseException'}}, 
                operation_name='CreateTable'
            )
            
            # Mock Table function to return existing table
            mock_existing_table = Mock()
            mock_table_func.return_value = mock_existing_table
            
            result = service._create_table()
            assert result == mock_existing_table
    
    def test_update_space_with_description_only(self):
        """Test update_space with only description."""
        from app.services.space import SpaceService
        from app.models.space import SpaceUpdate
        
        service = SpaceService()
        update = SpaceUpdate(description="New description")
        
        with patch.object(service, 'can_edit_space') as mock_can_edit, \
             patch.object(service.table, 'update_item') as mock_update:
            
            mock_can_edit.return_value = True
            mock_update.return_value = {
                'Attributes': {
                    'id': 'space123',
                    'name': 'Test Space',
                    'description': 'New description',
                    'type': 'lifestyle',
                    'is_public': True,
                    'owner_id': 'user123',
                    'created_at': '2024-01-01T00:00:00Z',
                    'updated_at': '2024-01-01T00:00:00Z'
                }
            }
            
            result = service.update_space('space123', update, 'user123')
            
            # Verify description was included in update
            call_args = mock_update.call_args
            assert ':description' in call_args[1]['ExpressionAttributeValues']
            assert 'description = :description' in call_args[1]['UpdateExpression']
    
    def test_update_space_with_metadata(self):
        """Test update_space with metadata."""
        from app.services.space import SpaceService
        from app.models.space import SpaceUpdate
        
        service = SpaceService()
        update = SpaceUpdate(metadata={'key': 'value'})
        
        with patch.object(service, 'can_edit_space') as mock_can_edit, \
             patch.object(service.table, 'update_item') as mock_update:
            
            mock_can_edit.return_value = True
            mock_update.return_value = {
                'Attributes': {
                    'id': 'space123',
                    'name': 'Test Space',
                    'type': 'lifestyle',
                    'is_public': True,
                    'owner_id': 'user123',
                    'created_at': '2024-01-01T00:00:00Z',
                    'updated_at': '2024-01-01T00:00:00Z',
                    'metadata': {'key': 'value'}
                }
            }
            
            result = service.update_space('space123', update, 'user123')
            
            # Verify metadata was included in update
            call_args = mock_update.call_args
            assert ':metadata' in call_args[1]['ExpressionAttributeValues']
            assert 'metadata = :metadata' in call_args[1]['UpdateExpression']
    
    def test_list_user_spaces_with_deleted_space(self):
        """Test list_user_spaces when a space has been deleted."""
        from app.services.space import SpaceService
        from app.services.exceptions import SpaceNotFoundError
        
        service = SpaceService()
        
        with patch.object(service.table, 'query') as mock_query, \
             patch.object(service, 'get_space') as mock_get_space:
            
            # Mock query to return space references
            mock_query.return_value = {
                'Items': [
                    {'GSI1SK': 'SPACE#space1'},
                    {'GSI1SK': 'SPACE#space2'}
                ]
            }
            
            # First space exists, second is deleted
            mock_get_space.side_effect = [
                {'id': 'space1', 'name': 'Space 1'},
                SpaceNotFoundError("Space not found")
            ]
            
            result = service.list_user_spaces('user123')
            
            # Should only return the existing space
            assert len(result['spaces']) == 1
            assert result['spaces'][0]['id'] == 'space1'
    
    def test_remove_member_owner_check(self):
        """Test remove_member prevents removing the owner."""
        from app.services.space import SpaceService
        from app.services.exceptions import UnauthorizedError
        
        service = SpaceService()
        
        with patch.object(service, 'can_edit_space') as mock_can_edit, \
             patch.object(service, 'get_space') as mock_get_space:
            
            mock_can_edit.return_value = True
            mock_get_space.return_value = {'owner_id': 'owner123'}
            
            # Try to remove the owner
            with pytest.raises(UnauthorizedError) as exc_info:
                service.remove_member('space123', 'owner123', 'admin123')
            
            assert "Cannot remove space owner" in str(exc_info.value)
    
    def test_can_edit_space_client_error(self):
        """Test can_edit_space when ClientError occurs."""
        from app.services.space import SpaceService
        
        service = SpaceService()
        
        with patch.object(service.table, 'get_item') as mock_get:
            mock_get.side_effect = ClientError(
                error_response={'Error': {'Code': 'InternalError'}}, 
                operation_name='GetItem'
            )
            
            result = service.can_edit_space('space123', 'user123')
            assert result is False


class TestInvitationServiceCoverage:
    """Test missing coverage areas in Invitation service."""
    
    def test_get_or_create_table_exception(self):
        """Test _get_or_create_table when table doesn't exist."""
        from app.services.invitation import InvitationService
        
        with patch('app.services.invitation.boto3.resource') as mock_boto:
            mock_dynamodb = Mock()
            mock_boto.return_value = mock_dynamodb
            
            # Mock Table to raise ClientError
            mock_dynamodb.Table.side_effect = ClientError(
                error_response={'Error': {'Code': 'ResourceNotFoundException'}}, 
                operation_name='DescribeTable'
            )
            
            # Mock create_table
            mock_table = Mock()
            mock_dynamodb.create_table.return_value = mock_table
            mock_table.wait_until_exists.return_value = None
            
            service = InvitationService()
            # Should call _create_table when table doesn't exist
            assert service.table == mock_table
    
    def test_create_table_already_exists(self):
        """Test _create_table when table already exists."""
        from app.services.invitation import InvitationService
        
        service = InvitationService()
        
        with patch.object(service.dynamodb, 'create_table') as mock_create, \
             patch.object(service.dynamodb, 'Table') as mock_table_func:
            
            # Mock create_table to raise ResourceInUseException
            mock_create.side_effect = ClientError(
                error_response={'Error': {'Code': 'ResourceInUseException'}}, 
                operation_name='CreateTable'
            )
            
            # Mock Table function to return existing table
            mock_existing_table = Mock()
            mock_table_func.return_value = mock_existing_table
            
            result = service._create_table()
            assert result == mock_existing_table
    
    def test_cancel_invitation_not_found(self):
        """Test cancel_invitation when invitation not found."""
        from app.services.invitation import InvitationService
        from app.services.exceptions import InvalidInvitationError
        
        service = InvitationService()
        
        with patch.object(service.table, 'get_item') as mock_get:
            mock_get.return_value = {}  # No Item key means not found
            
            with pytest.raises(InvalidInvitationError) as exc_info:
                service.cancel_invitation('inv123', 'user123')
            
            assert "Invitation not found" in str(exc_info.value)


class TestModelsCoverage:
    """Test missing coverage in models."""
    
    def test_pagination_params_invalid_page(self):
        """Test PaginationParams with invalid page."""
        from app.models.common import PaginationParams
        from pydantic import ValidationError
        
        with pytest.raises(ValidationError) as exc_info:
            PaginationParams(page=0)
        
        assert "greater than or equal to 1" in str(exc_info.value)
    
    def test_pagination_params_invalid_page_size(self):
        """Test PaginationParams with invalid page_size."""
        from app.models.common import PaginationParams
        from pydantic import ValidationError
        
        with pytest.raises(ValidationError) as exc_info:
            PaginationParams(page_size=101)
        
        assert "less than or equal to 100" in str(exc_info.value)
    
    def test_user_create_password_validation(self):
        """Test UserCreate password validation."""
        from app.models.user import UserCreate
        from pydantic import ValidationError
        
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="test@example.com",
                username="testuser",
                password="short",  # Less than 8 characters
                full_name="Test User"
            )
        
        assert "at least 8 characters" in str(exc_info.value)