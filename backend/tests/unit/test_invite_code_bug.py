"""
Unit tests for invite code visibility bug fix.

This test file verifies that the get_space() method correctly returns
the invite_code field for owners and admins, but not for regular members.

Bug: The original code only checked user_role, but didn't use is_owner check.
"""
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
from app.services.space import SpaceService


class TestInviteCodeVisibilityBug:
    """Tests for invite code visibility in get_space()."""

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

    def test_owner_sees_invite_code(self, service, mock_table):
        """Test that space owner gets invite_code in response."""
        space_id = "space-123"
        owner_id = "owner-456"
        invite_code = "ABC12345"

        # Mock responses
        mock_table.get_item.side_effect = [
            # First call: get space metadata
            {
                'Item': {
                    'id': space_id,
                    'name': 'Test Space',
                    'description': 'Test description',
                    'type': 'workspace',
                    'is_public': False,
                    'owner_id': owner_id,
                    'invite_code': invite_code,
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
            },
            # Second call: check membership (owner has membership with role='owner')
            {
                'Item': {
                    'user_id': owner_id,
                    'role': 'owner',
                    'joined_at': datetime.now(timezone.utc).isoformat()
                }
            }
        ]

        # Mock member count query
        mock_table.query.return_value = {
            'Items': [
                {'PK': f'SPACE#{space_id}', 'SK': f'MEMBER#{owner_id}'}
            ]
        }

        # Act
        result = service.get_space(space_id, owner_id)

        # Assert
        assert result['id'] == space_id
        assert result['is_owner'] is True
        assert 'invite_code' in result, "Owner should see invite_code"
        assert result['invite_code'] == invite_code

    def test_admin_sees_invite_code(self, service, mock_table):
        """Test that space admin gets invite_code in response."""
        space_id = "space-123"
        owner_id = "owner-456"
        admin_id = "admin-789"
        invite_code = "XYZ98765"

        # Mock responses
        mock_table.get_item.side_effect = [
            # First call: get space metadata
            {
                'Item': {
                    'id': space_id,
                    'name': 'Test Space',
                    'description': 'Test description',
                    'type': 'workspace',
                    'is_public': False,
                    'owner_id': owner_id,
                    'invite_code': invite_code,
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
            },
            # Second call: check membership (admin has role='admin')
            {
                'Item': {
                    'user_id': admin_id,
                    'role': 'admin',
                    'joined_at': datetime.now(timezone.utc).isoformat()
                }
            }
        ]

        # Mock member count query
        mock_table.query.return_value = {
            'Items': [
                {'PK': f'SPACE#{space_id}', 'SK': f'MEMBER#{owner_id}'},
                {'PK': f'SPACE#{space_id}', 'SK': f'MEMBER#{admin_id}'}
            ]
        }

        # Act
        result = service.get_space(space_id, admin_id)

        # Assert
        assert result['id'] == space_id
        assert result['is_owner'] is False
        assert 'invite_code' in result, "Admin should see invite_code"
        assert result['invite_code'] == invite_code

    def test_member_does_not_see_invite_code(self, service, mock_table):
        """Test that regular member does NOT get invite_code in response."""
        space_id = "space-123"
        owner_id = "owner-456"
        member_id = "member-789"
        invite_code = "SECRET99"

        # Mock responses
        mock_table.get_item.side_effect = [
            # First call: get space metadata
            {
                'Item': {
                    'id': space_id,
                    'name': 'Test Space',
                    'description': 'Test description',
                    'type': 'workspace',
                    'is_public': False,
                    'owner_id': owner_id,
                    'invite_code': invite_code,
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
            },
            # Second call: check membership (member has role='member')
            {
                'Item': {
                    'user_id': member_id,
                    'role': 'member',
                    'joined_at': datetime.now(timezone.utc).isoformat()
                }
            }
        ]

        # Mock member count query
        mock_table.query.return_value = {
            'Items': [
                {'PK': f'SPACE#{space_id}', 'SK': f'MEMBER#{owner_id}'},
                {'PK': f'SPACE#{space_id}', 'SK': f'MEMBER#{member_id}'}
            ]
        }

        # Act
        result = service.get_space(space_id, member_id)

        # Assert
        assert result['id'] == space_id
        assert result['is_owner'] is False
        assert 'invite_code' not in result, "Regular member should NOT see invite_code"

    def test_viewer_does_not_see_invite_code(self, service, mock_table):
        """Test that viewer role does NOT get invite_code in response."""
        space_id = "space-123"
        owner_id = "owner-456"
        viewer_id = "viewer-789"
        invite_code = "SECRET99"

        # Mock responses
        mock_table.get_item.side_effect = [
            # First call: get space metadata
            {
                'Item': {
                    'id': space_id,
                    'name': 'Test Space',
                    'description': 'Test description',
                    'type': 'workspace',
                    'is_public': False,
                    'owner_id': owner_id,
                    'invite_code': invite_code,
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
            },
            # Second call: check membership (viewer has role='viewer')
            {
                'Item': {
                    'user_id': viewer_id,
                    'role': 'viewer',
                    'joined_at': datetime.now(timezone.utc).isoformat()
                }
            }
        ]

        # Mock member count query
        mock_table.query.return_value = {
            'Items': [
                {'PK': f'SPACE#{space_id}', 'SK': f'MEMBER#{owner_id}'},
                {'PK': f'SPACE#{space_id}', 'SK': f'MEMBER#{viewer_id}'}
            ]
        }

        # Act
        result = service.get_space(space_id, viewer_id)

        # Assert
        assert result['id'] == space_id
        assert result['is_owner'] is False
        assert 'invite_code' not in result, "Viewer should NOT see invite_code"

    def test_non_member_viewing_public_space_no_invite_code(self, service, mock_table):
        """Test that non-member viewing public space does NOT see invite_code."""
        space_id = "space-123"
        owner_id = "owner-456"
        viewer_id = "viewer-999"
        invite_code = "SECRET99"

        # Mock responses
        mock_table.get_item.side_effect = [
            # First call: get space metadata
            {
                'Item': {
                    'id': space_id,
                    'name': 'Public Space',
                    'description': 'Test description',
                    'type': 'workspace',
                    'is_public': True,
                    'owner_id': owner_id,
                    'invite_code': invite_code,
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
            },
            # Second call: check membership (not a member)
            {}
        ]

        # Mock member count query
        mock_table.query.return_value = {
            'Items': [
                {'PK': f'SPACE#{space_id}', 'SK': f'MEMBER#{owner_id}'}
            ]
        }

        # Act
        result = service.get_space(space_id, viewer_id)

        # Assert
        assert result['id'] == space_id
        assert result['is_owner'] is False
        assert 'invite_code' not in result, "Non-member should NOT see invite_code"
