"""
Tests to achieve 100% coverage for services.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from moto import mock_dynamodb
import boto3
from botocore.exceptions import ClientError
from datetime import datetime, timezone


@mock_dynamodb
class TestSpaceServiceCoverage:
    """Test missing coverage areas in Space service."""
    
    def setup_method(self, method):
        """Set up mock DynamoDB table for each test."""
        # Create mock table
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        self.table = dynamodb.create_table(
            TableName='lifestyle-spaces-test',
            KeySchema=[
                {'AttributeName': 'PK', 'KeyType': 'HASH'},
                {'AttributeName': 'SK', 'KeyType': 'RANGE'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'PK', 'AttributeType': 'S'},
                {'AttributeName': 'SK', 'AttributeType': 'S'},
                {'AttributeName': 'GSI1PK', 'AttributeType': 'S'},
                {'AttributeName': 'GSI1SK', 'AttributeType': 'S'}
            ],
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'GSI1',
                    'KeySchema': [
                        {'AttributeName': 'GSI1PK', 'KeyType': 'HASH'},
                        {'AttributeName': 'GSI1SK', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'}
                }
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        self.table.wait_until_exists()
    
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
        
        # Pre-populate space in mock table
        self.table.put_item(Item={
            'PK': 'SPACE#space123',
            'SK': 'METADATA',
            'id': 'space123',
            'name': 'Test Space',
            'type': 'lifestyle',
            'is_public': True,
            'owner_id': 'user123',
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z'
        })
        
        # Add membership
        self.table.put_item(Item={
            'PK': 'SPACE#space123',
            'SK': 'MEMBER#user123',
            'role': 'owner'
        })
        
        service = SpaceService()
        update = SpaceUpdate(description="New description")
        
        result = service.update_space('space123', update, 'user123')
        
        # Verify the space was updated
        assert result is True
        
        # Check the updated item
        response = self.table.get_item(
            Key={'PK': 'SPACE#space123', 'SK': 'METADATA'}
        )
        assert response['Item']['description'] == 'New description'
    
    def test_update_space_with_metadata(self):
        """Test update_space with metadata."""
        from app.services.space import SpaceService
        from app.models.space import SpaceUpdate
        
        # Pre-populate space in mock table
        self.table.put_item(Item={
            'PK': 'SPACE#space123',
            'SK': 'METADATA',
            'id': 'space123',
            'name': 'Test Space',
            'type': 'lifestyle',
            'is_public': True,
            'owner_id': 'user123',
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z'
        })
        
        # Add membership
        self.table.put_item(Item={
            'PK': 'SPACE#space123',
            'SK': 'MEMBER#user123',
            'role': 'owner'
        })
        
        service = SpaceService()
        update = SpaceUpdate(metadata={'key': 'value'})
        
        result = service.update_space('space123', update, 'user123')
        
        # Verify the space was updated
        assert result is True
        
        # Check the updated item
        response = self.table.get_item(
            Key={'PK': 'SPACE#space123', 'SK': 'METADATA'}
        )
        assert response['Item']['metadata'] == {'key': 'value'}
    
    def test_list_user_spaces_with_deleted_space(self):
        """Test list_user_spaces when a space has been deleted."""
        from app.services.space import SpaceService
        
        # Add user memberships
        self.table.put_item(Item={
            'PK': 'USER#user123',
            'SK': 'SPACE#space1',
            'GSI1PK': 'USER#user123',
            'GSI1SK': 'SPACE#space1',
            'space_id': 'space1',
            'role': 'member',
            'joined_at': '2024-01-01T00:00:00Z'
        })
        
        self.table.put_item(Item={
            'PK': 'USER#user123',
            'SK': 'SPACE#space2',
            'GSI1PK': 'USER#user123',
            'GSI1SK': 'SPACE#space2',
            'space_id': 'space2',
            'role': 'member',
            'joined_at': '2024-01-01T00:00:00Z'
        })
        
        # Only add space1, space2 is "deleted"
        self.table.put_item(Item={
            'PK': 'SPACE#space1',
            'SK': 'METADATA',
            'id': 'space1',
            'name': 'Space 1',
            'is_public': True,
            'owner_id': 'user123',
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z'
        })
        
        service = SpaceService()
        result = service.list_user_spaces('user123')
        
        # Should only return the existing space
        assert len(result['spaces']) == 1
        assert result['spaces'][0]['id'] == 'space1'
    
    def test_remove_member_owner_check(self):
        """Test remove_member prevents removing the owner."""
        from app.services.space import SpaceService
        from app.services.exceptions import UnauthorizedError
        
        # Pre-populate space
        self.table.put_item(Item={
            'PK': 'SPACE#space123',
            'SK': 'METADATA',
            'id': 'space123',
            'name': 'Test Space',
            'owner_id': 'owner123',
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z'
        })
        
        # Add admin membership
        self.table.put_item(Item={
            'PK': 'SPACE#space123',
            'SK': 'MEMBER#admin123',
            'role': 'admin'
        })
        
        service = SpaceService()
        
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


@mock_dynamodb
class TestInvitationServiceCoverage:
    """Test missing coverage areas in Invitation service."""

    def setup_method(self, method):
        """Set up mock DynamoDB table for each test."""
        # Create mock table
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

        # Delete table if it exists
        try:
            existing_table = dynamodb.Table('lifestyle-spaces-test')
            existing_table.delete()
            existing_table.wait_until_not_exists()
        except Exception:
            pass

        self.table = dynamodb.create_table(
            TableName='lifestyle-spaces-test',
            KeySchema=[
                {'AttributeName': 'PK', 'KeyType': 'HASH'},
                {'AttributeName': 'SK', 'KeyType': 'RANGE'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'PK', 'AttributeType': 'S'},
                {'AttributeName': 'SK', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        self.table.wait_until_exists()

    def teardown_method(self, method):
        """Clean up DynamoDB table after each test."""
        try:
            self.table.delete()
        except Exception:
            pass
    
    def test_get_or_create_table_exception(self):
        """Test _get_or_create_table when table doesn't exist."""
        from app.services.invitation import InvitationService

        with patch('app.services.invitation.boto3.resource') as mock_boto, \
             patch('app.services.invitation.DynamoDBClient') as mock_db_client:
            mock_dynamodb = Mock()
            mock_boto.return_value = mock_dynamodb

            # Mock DynamoDBClient to avoid initialization errors
            mock_db_client.return_value = MagicMock()

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
        
        # Don't add any invitation to the table
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