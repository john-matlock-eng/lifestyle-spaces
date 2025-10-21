"""
Tests for space service to achieve 100% coverage.
"""
import pytest
from unittest.mock import patch, MagicMock, Mock
from datetime import datetime
from moto import mock_dynamodb
import boto3
from botocore.exceptions import ClientError
from app.services.space import SpaceService
from app.services.exceptions import SpaceNotFoundError, UnauthorizedError, ValidationError, AlreadyMemberError, InvalidInviteCodeError
from app.models.space import SpaceCreate, SpaceUpdate


@mock_dynamodb
class TestSpaceServiceCoverage:
    """Test space service uncovered methods."""
    
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
    
    def test_create_space_with_all_fields(self):
        """Test creating space with all optional fields."""
        service = SpaceService()
        space = SpaceCreate(
            name="Test Space",
            description="Test Description",
            type="community",
            is_public=True,
            metadata={"key": "value"}
        )
        
        result = service.create_space(
            space=space,
            owner_id="user123"
        )
        
        assert result["name"] == "Test Space"
        assert result["description"] == "Test Description"
        assert result["type"] == "community"
        assert result["is_public"] is True
        assert "invite_code" in result
        assert result["owner_id"] == "user123"
    
    def test_get_space_as_non_member_private(self):
        """Test getting private space as non-member (should fail)."""
        # Pre-populate private space
        self.table.put_item(Item={
            'PK': 'SPACE#123',
            'SK': 'METADATA',
            'id': '123',
            'name': 'Private Space',
            'is_public': False,
            'owner_id': 'owner123',
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z'
        })
        
        service = SpaceService()
        
        with pytest.raises(UnauthorizedError):
            service.get_space(space_id='123', user_id='user456')
    
    def test_update_space_not_owner_or_admin(self):
        """Test updating space without proper permissions."""
        # Pre-populate space
        self.table.put_item(Item={
            'PK': 'SPACE#123',
            'SK': 'METADATA',
            'id': '123',
            'name': 'Test Space',
            'owner_id': 'owner123',
            'is_public': True,
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z'
        })
        
        # Add user as regular member
        self.table.put_item(Item={
            'PK': 'SPACE#123',
            'SK': 'MEMBER#user456',
            'role': 'member'
        })
        
        service = SpaceService()
        update = SpaceUpdate(name="New Name")
        
        with pytest.raises(UnauthorizedError):
            service.update_space(
                space_id='123',
                update=update,
                user_id='user456'
            )
    
    def test_delete_space_not_owner(self):
        """Test deleting space without being owner."""
        # Pre-populate space
        self.table.put_item(Item={
            'PK': 'SPACE#123',
            'SK': 'METADATA',
            'id': '123',
            'name': 'Test Space',
            'owner_id': 'owner123',
            'is_public': True,
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z'
        })
        
        service = SpaceService()
        
        with pytest.raises(UnauthorizedError):
            service.delete_space(space_id='123', user_id='user456')
    
    def test_delete_space_success(self):
        """Test successful space deletion by owner."""
        # Pre-populate space
        self.table.put_item(Item={
            'PK': 'SPACE#123',
            'SK': 'METADATA',
            'id': '123',
            'name': 'Test Space',
            'owner_id': 'user123',
            'is_public': True,
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z'
        })
        
        # Add members to the space
        self.table.put_item(Item={
            'PK': 'SPACE#123',
            'SK': 'MEMBER#user123',
            'role': 'owner'
        })
        self.table.put_item(Item={
            'PK': 'SPACE#123',
            'SK': 'MEMBER#user456',
            'role': 'member'
        })
        
        # Add invite code
        self.table.put_item(Item={
            'PK': 'INVITE#ABC123',
            'SK': 'SPACE#123',
            'space_id': '123'
        })
        
        service = SpaceService()
        service.delete_space(space_id='123', user_id='user123')
        
        # Verify space metadata was deleted
        response = self.table.get_item(
            Key={'PK': 'SPACE#123', 'SK': 'METADATA'}
        )
        assert 'Item' not in response
    
    def test_list_user_spaces_with_filters(self):
        """Test listing user spaces with various filters."""
        # Add user memberships
        self.table.put_item(Item={
            'PK': 'USER#user123',
            'SK': 'SPACE#001',
            'GSI1PK': 'USER#user123',
            'GSI1SK': 'SPACE#001',
            'space_id': '001',
            'role': 'owner',
            'joined_at': '2024-01-01T00:00:00Z'
        })
        
        self.table.put_item(Item={
            'PK': 'USER#user123',
            'SK': 'SPACE#002',
            'GSI1PK': 'USER#user123',
            'GSI1SK': 'SPACE#002',
            'space_id': '002',
            'role': 'member',
            'joined_at': '2024-01-02T00:00:00Z'
        })
        
        # Add space details
        self.table.put_item(Item={
            'PK': 'SPACE#001',
            'SK': 'METADATA',
            'id': '001',
            'name': 'Public Space',
            'is_public': True,
            'owner_id': 'user123',
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z'
        })
        
        self.table.put_item(Item={
            'PK': 'SPACE#002',
            'SK': 'METADATA',
            'id': '002',
            'name': 'Private Space',
            'is_public': False,
            'owner_id': 'other_user',
            'created_at': '2024-01-02T00:00:00Z',
            'updated_at': '2024-01-02T00:00:00Z'
        })
        
        service = SpaceService()
        
        # Test filter by public
        result = service.list_user_spaces(
            user_id='user123',
            is_public=True
        )
        assert len(result['spaces']) == 1
        assert result['spaces'][0]['name'] == 'Public Space'
        
        # Test filter by role
        result = service.list_user_spaces(
            user_id='user123',
            role='owner'
        )
        assert len(result['spaces']) == 1
        assert result['spaces'][0]['id'] == '001'
    
    def test_list_user_spaces_with_search(self):
        """Test listing user spaces with search query."""
        # Add user memberships
        self.table.put_item(Item={
            'PK': 'USER#user123',
            'SK': 'SPACE#001',
            'GSI1PK': 'USER#user123',
            'GSI1SK': 'SPACE#001',
            'space_id': '001',
            'role': 'owner',
            'joined_at': '2024-01-01T00:00:00Z'
        })
        
        self.table.put_item(Item={
            'PK': 'USER#user123',
            'SK': 'SPACE#002',
            'GSI1PK': 'USER#user123',
            'GSI1SK': 'SPACE#002',
            'space_id': '002',
            'role': 'member',
            'joined_at': '2024-01-02T00:00:00Z'
        })
        
        # Add space details
        self.table.put_item(Item={
            'PK': 'SPACE#001',
            'SK': 'METADATA',
            'id': '001',
            'name': 'Development Team',
            'description': 'For developers',
            'is_public': True,
            'owner_id': 'user123',
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z'
        })
        
        self.table.put_item(Item={
            'PK': 'SPACE#002',
            'SK': 'METADATA',
            'id': '002',
            'name': 'Marketing',
            'description': 'Marketing team space',
            'is_public': False,
            'owner_id': 'other_user',
            'created_at': '2024-01-02T00:00:00Z',
            'updated_at': '2024-01-02T00:00:00Z'
        })
        
        service = SpaceService()
        
        # Search for "dev"
        result = service.list_user_spaces(
            user_id='user123',
            search='dev'
        )
        assert len(result['spaces']) == 1
        assert result['spaces'][0]['name'] == 'Development Team'
    
    def test_join_space_already_member(self):
        """Test joining a space when already a member."""
        # Pre-populate space
        self.table.put_item(Item={
            'PK': 'SPACE#123',
            'SK': 'METADATA',
            'id': '123',
            'name': 'Test Space',
            'is_public': True,
            'owner_id': 'owner123',
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z'
        })
        
        # Add invite code
        self.table.put_item(Item={
            'PK': 'INVITE#ABC123',
            'SK': 'SPACE#123',
            'space_id': '123'
        })
        
        # User is already a member
        self.table.put_item(Item={
            'PK': 'SPACE#123',
            'SK': 'MEMBER#user123',
            'role': 'member'
        })
        
        service = SpaceService()
        
        with pytest.raises(AlreadyMemberError, match="already a member"):
            service.join_space_with_invite_code(
                invite_code='ABC123',
                user_id='user123'
            )
    
    def test_join_space_invalid_invite_code(self):
        """Test joining with invalid invite code."""
        service = SpaceService()
        
        with pytest.raises(InvalidInviteCodeError, match="Invalid invite code"):
            service.join_space_with_invite_code(
                invite_code='INVALID',
                user_id='user123'
            )
    
    def test_get_space_members_public_space(self):
        """Test getting members of public space as non-member."""
        # Pre-populate public space
        self.table.put_item(Item={
            'PK': 'SPACE#123',
            'SK': 'METADATA',
            'id': '123',
            'name': 'Public Space',
            'is_public': True,
            'owner_id': 'owner123',
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z'
        })
        
        # Add members
        self.table.put_item(Item={
            'PK': 'SPACE#123',
            'SK': 'MEMBER#user001',
            'user_id': 'user001',
            'username': 'user1',
            'email': 'user1@test.com',
            'role': 'owner',
            'joined_at': '2024-01-01T00:00:00Z'
        })
        
        service = SpaceService()
        members = service.get_space_members(
            space_id='123',
            user_id='user456'  # Not a member
        )
        
        assert len(members) == 1
        assert members[0]['role'] == 'owner'
    
    def test_space_service_database_error_handling(self):
        """Test database error handling in space service."""
        service = SpaceService()
        space = SpaceCreate(name="Test Space")
        
        # Patch the batch_writer since create_space uses batch operations
        with patch.object(service.table, 'batch_writer') as mock_batch:
            mock_context = MagicMock()
            mock_batch.return_value.__enter__ = MagicMock(return_value=mock_context)
            mock_batch.return_value.__exit__ = MagicMock(return_value=None)
            mock_context.put_item.side_effect = ClientError(
                {'Error': {'Code': 'InternalServerError'}},
                'PutItem'
            )
            
            with pytest.raises(ClientError):
                service.create_space(
                    space=space,
                    owner_id="user123"
                )
    
    def test_generate_invite_code(self):
        """Test invite code generation."""
        service = SpaceService()

        # Generate multiple codes and check uniqueness
        codes = set()
        for _ in range(10):
            code = service._generate_invite_code()
            assert len(code) == 8
            # Check it's uppercase hex (0-9A-F only)
            assert code.isupper() or code.isdigit() or all(c in '0123456789ABCDEF' for c in code)
            assert all(c in '0123456789ABCDEF' for c in code)
            codes.add(code)

        # All codes should be unique
        assert len(codes) == 10