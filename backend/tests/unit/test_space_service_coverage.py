"""
Tests for space service to achieve 100% coverage.
"""
import pytest
from unittest.mock import patch, MagicMock, Mock
from datetime import datetime
from botocore.exceptions import ClientError
from app.services.space import SpaceService
from app.services.exceptions import SpaceNotFoundError, UnauthorizedError
from app.models.space import SpaceCreate, SpaceUpdate


class TestSpaceServiceCoverage:
    """Test space service uncovered methods."""
    
    @patch('app.services.space.get_db')
    def test_create_space_with_all_fields(self, mock_get_db):
        """Test creating space with all optional fields."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_db.put_item.return_value = True
        
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
            owner_id="user123",
            owner_email="owner@test.com",
            owner_username="owner"
        )
        
        assert result["name"] == "Test Space"
        assert result["description"] == "Test Description"
        assert result["type"] == "community"
        assert result["is_public"] is True
        assert "invite_code" in result
        mock_db.put_item.assert_called()
    
    @patch('app.services.space.get_db')
    def test_get_space_as_non_member_private(self, mock_get_db):
        """Test getting private space as non-member (should fail)."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        # Space exists but is private
        mock_db.get_item.side_effect = [
            {  # First call - get space
                'PK': 'SPACE#123',
                'SK': 'METADATA',
                'id': '123',
                'name': 'Private Space',
                'is_public': False,
                'owner_id': 'owner123'
            },
            None  # Second call - check membership (not a member)
        ]
        
        service = SpaceService()
        
        with pytest.raises(UnauthorizedError):
            service.get_space(space_id='123', user_id='user456')
    
    @patch('app.services.space.get_db')
    def test_update_space_not_owner_or_admin(self, mock_get_db):
        """Test updating space without proper permissions."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        # Mock space exists
        mock_db.get_item.side_effect = [
            {  # Get space
                'PK': 'SPACE#123',
                'SK': 'METADATA',
                'id': '123',
                'owner_id': 'owner123'
            },
            {  # Get membership - user is just a member
                'PK': 'SPACE#123',
                'SK': 'MEMBER#user456',
                'role': 'member'
            }
        ]
        
        service = SpaceService()
        update = SpaceUpdate(name="New Name")
        
        with pytest.raises(UnauthorizedError):
            service.update_space(
                space_id='123',
                space_update=update,
                user_id='user456'
            )
    
    @patch('app.services.space.get_db')
    def test_delete_space_not_owner(self, mock_get_db):
        """Test deleting space without being owner."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        # Mock space exists but user is not owner
        mock_db.get_item.return_value = {
            'PK': 'SPACE#123',
            'SK': 'METADATA',
            'id': '123',
            'owner_id': 'owner123'
        }
        
        service = SpaceService()
        
        with pytest.raises(UnauthorizedError):
            service.delete_space(space_id='123', user_id='user456')
    
    @patch('app.services.space.get_db')
    def test_delete_space_success(self, mock_get_db):
        """Test successful space deletion by owner."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        # Mock space exists and user is owner
        mock_db.get_item.return_value = {
            'PK': 'SPACE#123',
            'SK': 'METADATA',
            'id': '123',
            'owner_id': 'user123'
        }
        
        # Mock getting all members to delete
        mock_db.query.return_value = [
            {'PK': 'SPACE#123', 'SK': 'MEMBER#user123'},
            {'PK': 'SPACE#123', 'SK': 'MEMBER#user456'}
        ]
        
        service = SpaceService()
        service.delete_space(space_id='123', user_id='user123')
        
        # Verify space metadata and members were deleted
        assert mock_db.delete_item.call_count >= 2
    
    @patch('app.services.space.get_db')
    def test_list_user_spaces_with_filters(self, mock_get_db):
        """Test listing user spaces with various filters."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        # Mock user's spaces
        mock_db.query.return_value = [
            {
                'PK': 'USER#user123',
                'SK': 'SPACE#001',
                'space_id': '001',
                'role': 'owner',
                'joined_at': '2024-01-01T00:00:00Z'
            },
            {
                'PK': 'USER#user123',
                'SK': 'SPACE#002',
                'space_id': '002',
                'role': 'member',
                'joined_at': '2024-01-02T00:00:00Z'
            }
        ]
        
        # Mock space details
        def get_item_side_effect(pk, sk):
            if pk == 'SPACE#001':
                return {
                    'id': '001',
                    'name': 'Public Space',
                    'is_public': True,
                    'owner_id': 'user123'
                }
            elif pk == 'SPACE#002':
                return {
                    'id': '002',
                    'name': 'Private Space',
                    'is_public': False,
                    'owner_id': 'other_user'
                }
            return None
        
        mock_db.get_item.side_effect = get_item_side_effect
        
        service = SpaceService()
        
        # Test filter by public
        result = service.list_user_spaces(
            user_id='user123',
            is_public=True
        )
        assert len(result['spaces']) == 1
        assert result['spaces'][0]['name'] == 'Public Space'
        
        # Test filter by role
        mock_db.query.return_value = [
            {
                'PK': 'USER#user123',
                'SK': 'SPACE#001',
                'space_id': '001',
                'role': 'owner',
                'joined_at': '2024-01-01T00:00:00Z'
            }
        ]
        
        result = service.list_user_spaces(
            user_id='user123',
            role='owner'
        )
        assert len(result['spaces']) == 1
        assert result['spaces'][0]['is_owner'] is True
    
    @patch('app.services.space.get_db')
    def test_list_user_spaces_with_search(self, mock_get_db):
        """Test listing user spaces with search query."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        # Mock user's spaces
        mock_db.query.return_value = [
            {
                'PK': 'USER#user123',
                'SK': 'SPACE#001',
                'space_id': '001',
                'role': 'owner',
                'joined_at': '2024-01-01T00:00:00Z'
            },
            {
                'PK': 'USER#user123',
                'SK': 'SPACE#002',
                'space_id': '002',
                'role': 'member',
                'joined_at': '2024-01-02T00:00:00Z'
            }
        ]
        
        # Mock space details
        def get_item_side_effect(pk, sk):
            if pk == 'SPACE#001':
                return {
                    'id': '001',
                    'name': 'Development Team',
                    'description': 'For developers',
                    'is_public': True,
                    'owner_id': 'user123'
                }
            elif pk == 'SPACE#002':
                return {
                    'id': '002',
                    'name': 'Marketing',
                    'description': 'Marketing team space',
                    'is_public': False,
                    'owner_id': 'other_user'
                }
            return None
        
        mock_db.get_item.side_effect = get_item_side_effect
        
        service = SpaceService()
        
        # Search for "dev"
        result = service.list_user_spaces(
            user_id='user123',
            search='dev'
        )
        assert len(result['spaces']) == 1
        assert result['spaces'][0]['name'] == 'Development Team'
    
    @patch('app.services.space.get_db')
    def test_join_space_already_member(self, mock_get_db):
        """Test joining a space when already a member."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        # Space exists
        mock_db.get_item.side_effect = [
            {  # Get space by invite code
                'PK': 'INVITE#ABC123',
                'SK': 'SPACE#123',
                'space_id': '123'
            },
            {  # Get space metadata
                'PK': 'SPACE#123',
                'SK': 'METADATA',
                'id': '123',
                'name': 'Test Space'
            },
            {  # Check membership - already a member
                'PK': 'SPACE#123',
                'SK': 'MEMBER#user123',
                'role': 'member'
            }
        ]
        
        service = SpaceService()
        
        with pytest.raises(ValidationError, match="already a member"):
            service.join_space_by_invite(
                invite_code='ABC123',
                user_id='user123',
                user_email='user@test.com',
                username='testuser'
            )
    
    @patch('app.services.space.get_db')
    def test_join_space_invalid_invite_code(self, mock_get_db):
        """Test joining with invalid invite code."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        # Invite code doesn't exist
        mock_db.get_item.return_value = None
        
        service = SpaceService()
        
        with pytest.raises(SpaceNotFoundError, match="Invalid invite code"):
            service.join_space_by_invite(
                invite_code='INVALID',
                user_id='user123',
                user_email='user@test.com',
                username='testuser'
            )
    
    @patch('app.services.space.get_db')
    def test_get_space_members_public_space(self, mock_get_db):
        """Test getting members of public space as non-member."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        # Space is public
        mock_db.get_item.side_effect = [
            {  # Get space
                'PK': 'SPACE#123',
                'SK': 'METADATA',
                'id': '123',
                'is_public': True
            },
            None  # Not a member
        ]
        
        # Mock members
        mock_db.query.return_value = [
            {
                'PK': 'SPACE#123',
                'SK': 'MEMBER#user001',
                'user_id': 'user001',
                'username': 'user1',
                'email': 'user1@test.com',
                'role': 'owner',
                'joined_at': '2024-01-01T00:00:00Z'
            }
        ]
        
        service = SpaceService()
        members = service.get_space_members(
            space_id='123',
            user_id='user456'  # Not a member
        )
        
        assert len(members) == 1
        assert members[0]['role'] == 'owner'
    
    @patch('app.services.space.get_db')
    def test_space_service_database_error_handling(self, mock_get_db):
        """Test database error handling in space service."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        # Simulate database error
        mock_db.put_item.side_effect = ClientError(
            {'Error': {'Code': 'InternalServerError'}},
            'PutItem'
        )
        
        service = SpaceService()
        space = SpaceCreate(name="Test Space")
        
        with pytest.raises(ClientError):
            service.create_space(
                space=space,
                owner_id="user123",
                owner_email="test@example.com",
                owner_username="testuser"
            )
    
    def test_generate_invite_code(self):
        """Test invite code generation."""
        service = SpaceService()
        
        # Generate multiple codes and check uniqueness
        codes = set()
        for _ in range(10):
            code = service._generate_invite_code()
            assert len(code) == 8
            assert code.isalnum()
            assert code.isupper()
            codes.add(code)
        
        # All codes should be unique
        assert len(codes) == 10