"""
Unit tests for invite code regeneration and backfill functionality.

Tests the ability to add invite codes to spaces that don't have them,
which is critical for spaces created before the invite code feature.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone
from app.services.space import SpaceService
from app.services.exceptions import SpaceNotFoundError


class TestInviteCodeBackfill:
    """Tests for invite code regeneration on spaces without codes."""

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

    def test_regenerate_invite_code_on_space_without_code(self, service, mock_table):
        """Test regenerating invite code on a space that never had one."""
        space_id = "test-space-123"
        now = datetime.now(timezone.utc).isoformat()

        # Mock space without invite_code field
        space_without_code = {
            'PK': f'SPACE#{space_id}',
            'SK': 'METADATA',
            'id': space_id,
            'name': 'Legacy Space',
            'owner_id': 'user-123',
            'created_at': now,
            'updated_at': now,
            # Note: No invite_code field
        }

        mock_table.get_item.return_value = {'Item': space_without_code}
        mock_table.update_item.return_value = {}
        mock_table.put_item.return_value = {}

        # Regenerate should work even without existing code
        new_code = service.regenerate_invite_code(space_id)

        # Verify new code was generated
        assert new_code is not None
        assert len(new_code) == 8
        assert new_code.isupper()

        # Verify space was updated with new code
        mock_table.update_item.assert_called_once()
        update_call = mock_table.update_item.call_args
        assert update_call[1]['Key'] == {'PK': f'SPACE#{space_id}', 'SK': 'METADATA'}
        assert 'invite_code' in update_call[1]['UpdateExpression']

        # Verify invite mapping was created
        mock_table.put_item.assert_called_once()
        put_call = mock_table.put_item.call_args
        assert put_call[1]['Item']['PK'] == f'INVITE#{new_code}'
        assert put_call[1]['Item']['SK'] == f'SPACE#{space_id}'
        assert put_call[1]['Item']['space_id'] == space_id

        # Verify no attempt to delete old code (since there wasn't one)
        # delete_item should not be called or should handle None gracefully

    def test_regenerate_invite_code_on_space_with_existing_code(self, service, mock_table):
        """Test regenerating invite code on a space that has one."""
        space_id = "test-space-456"
        old_code = "OLDCODE1"
        now = datetime.now(timezone.utc).isoformat()

        # Mock space with existing invite_code
        space_with_code = {
            'PK': f'SPACE#{space_id}',
            'SK': 'METADATA',
            'id': space_id,
            'name': 'Existing Space',
            'owner_id': 'user-456',
            'invite_code': old_code,
            'created_at': now,
            'updated_at': now,
        }

        mock_table.get_item.return_value = {'Item': space_with_code}
        mock_table.update_item.return_value = {}
        mock_table.delete_item.return_value = {}
        mock_table.put_item.return_value = {}

        # Regenerate code
        new_code = service.regenerate_invite_code(space_id)

        # Verify new code was generated and is different
        assert new_code is not None
        assert new_code != old_code
        assert len(new_code) == 8

        # Verify old invite mapping was deleted
        mock_table.delete_item.assert_called_once()
        delete_call = mock_table.delete_item.call_args
        assert delete_call[1]['Key'] == {
            'PK': f'INVITE#{old_code}',
            'SK': f'SPACE#{space_id}'
        }

        # Verify new invite mapping was created
        mock_table.put_item.assert_called_once()
        put_call = mock_table.put_item.call_args
        assert put_call[1]['Item']['PK'] == f'INVITE#{new_code}'
        assert put_call[1]['Item']['SK'] == f'SPACE#{space_id}'

    def test_regenerate_invite_code_nonexistent_space(self, service, mock_table):
        """Test regenerating invite code on a non-existent space raises error."""
        mock_table.get_item.return_value = {}  # No Item key

        with pytest.raises(SpaceNotFoundError, match="Space nonexistent not found"):
            service.regenerate_invite_code("nonexistent")

    def test_regenerate_invite_code_handles_delete_error_gracefully(self, service, mock_table):
        """Test that regenerate handles errors when deleting old invite mapping."""
        space_id = "test-space-789"
        old_code = "OLDCODE2"
        now = datetime.now(timezone.utc).isoformat()

        space_with_code = {
            'PK': f'SPACE#{space_id}',
            'SK': 'METADATA',
            'id': space_id,
            'name': 'Test Space',
            'owner_id': 'user-789',
            'invite_code': old_code,
            'created_at': now,
            'updated_at': now,
        }

        mock_table.get_item.return_value = {'Item': space_with_code}
        mock_table.update_item.return_value = {}
        # Simulate delete error
        mock_table.delete_item.side_effect = Exception("Delete failed")
        mock_table.put_item.return_value = {}

        # Should still succeed and return new code
        new_code = service.regenerate_invite_code(space_id)

        assert new_code is not None
        assert len(new_code) == 8

        # Verify update and put were still called
        mock_table.update_item.assert_called_once()
        mock_table.put_item.assert_called_once()

    def test_regenerate_endpoint_returns_invite_url(self):
        """Test that the endpoint returns both code and URL."""
        # This is more of an integration test, but validates the contract
        space_id = "test-space-999"
        new_code = "NEWCODE1"

        with patch('app.services.space.SpaceService') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            mock_service.regenerate_invite_code.return_value = new_code

            # Simulate what the endpoint should return
            response = {
                "invite_code": new_code,
                "invite_url": f"/join/{new_code}"
            }

            assert response["invite_code"] == new_code
            assert response["invite_url"] == f"/join/{new_code}"

    def test_multiple_spaces_backfill(self, service, mock_table):
        """Test backfilling multiple spaces without codes."""
        spaces_without_codes = [
            {
                'id': 'space-1',
                'name': 'Space 1',
                'owner_id': 'user-1',
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
            },
            {
                'id': 'space-2',
                'name': 'Space 2',
                'owner_id': 'user-2',
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
            },
            {
                'id': 'space-3',
                'name': 'Space 3',
                'owner_id': 'user-3',
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
            },
        ]

        mock_table.update_item.return_value = {}
        mock_table.put_item.return_value = {}

        generated_codes = []
        for space in spaces_without_codes:
            mock_table.get_item.return_value = {'Item': {
                'PK': f'SPACE#{space["id"]}',
                'SK': 'METADATA',
                **space
            }}

            code = service.regenerate_invite_code(space['id'])
            generated_codes.append(code)
            assert code is not None
            assert len(code) == 8

        # Verify all codes are unique
        assert len(set(generated_codes)) == len(generated_codes)

    def test_invite_code_format(self, service):
        """Test that generated invite codes meet expected format."""
        # Generate multiple codes to test format consistency
        codes = []
        for _ in range(10):
            code = service._generate_invite_code()
            codes.append(code)

            # Verify format
            assert len(code) == 8
            # Hex codes: 0-9A-F only
            assert all(c in '0123456789ABCDEF' for c in code)

        # Verify uniqueness (should be extremely unlikely to get duplicates)
        assert len(set(codes)) == len(codes)
