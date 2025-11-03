"""
Tests for reading position service module to achieve 100% coverage.
"""
# FIRST: Set environment variables before importing any app modules
import os
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret-key-for-testing-only')
os.environ.setdefault('JWT_ALGORITHM', 'HS256')
os.environ.setdefault('ACCESS_TOKEN_EXPIRE_MINUTES', '30')
os.environ.setdefault('DYNAMODB_TABLE', 'lifestyle-spaces-test')
os.environ.setdefault('CORS_ORIGINS', '["*"]')
os.environ.setdefault('AWS_REGION', 'us-east-1')
os.environ.setdefault('AWS_DEFAULT_REGION', 'us-east-1')
os.environ.setdefault('ENVIRONMENT', 'test')

# THEN: Import other modules
import pytest
from unittest.mock import patch, MagicMock, ANY
from datetime import datetime, timezone
from botocore.exceptions import ClientError
from app.services.reading_position import ReadingPositionService
from app.services.exceptions import UnauthorizedError, JournalNotFoundError
from app.models.reading_position import ReadingPositionCreate, ReadingPositionUpdate


class TestReadingPositionService:
    """Test reading position service methods."""

    @pytest.fixture
    def mock_table(self):
        """Create a mock DynamoDB table."""
        with patch('app.services.reading_position.boto3.resource') as mock_resource:
            mock_table = MagicMock()
            mock_resource.return_value.Table.return_value = mock_table
            yield mock_table

    @pytest.fixture
    def reading_position_service(self, mock_table):
        """Create a ReadingPositionService instance with mocked table."""
        return ReadingPositionService()

    @pytest.fixture
    def sample_position_data(self):
        """Sample reading position data for testing."""
        return ReadingPositionCreate(
            journal_id="journal-123",
            space_id="space-123",
            scroll_position=1234,
            current_section_id="section-2",
            progress_percent=45.5,
            words_read=250,
            total_words=550
        )

    def test_save_position_creates_new(self, reading_position_service, mock_table, sample_position_data):
        """Test saving a new reading position."""
        # Mock space membership check, journal exists, and get_position call
        mock_table.get_item.side_effect = [
            {'Item': {'PK': 'SPACE#space-123', 'SK': 'MEMBER#user-123'}},  # is_space_member
            {'Item': {'PK': 'SPACE#space-123', 'SK': 'JOURNAL#journal-123'}},  # journal exists
            {},  # get_position returns nothing (new position)
        ]

        mock_table.put_item.return_value = {}

        result = reading_position_service.save_position(
            user_id='user-123',
            journal_id='journal-123',
            space_id='space-123',
            position_data=sample_position_data
        )

        assert result['user_id'] == 'user-123'
        assert result['journal_id'] == 'journal-123'
        assert result['space_id'] == 'space-123'
        assert result['scroll_position'] == 1234
        assert result['current_section_id'] == 'section-2'
        assert result['progress_percent'] == 45.5
        assert result['words_read'] == 250
        assert result['total_words'] == 550
        assert 'created_at' in result
        assert 'updated_at' in result
        assert 'expires_at' in result

        # Verify put_item was called with correct keys
        mock_table.put_item.assert_called_once()
        call_args = mock_table.put_item.call_args[1]
        item = call_args['Item']
        assert item['PK'] == 'USER#user-123'
        assert item['SK'] == 'READING_POS#journal-123'
        assert item['GSI1PK'] == 'JOURNAL#journal-123'
        assert item['GSI1SK'] == 'USER#user-123'

    def test_save_position_unauthorized_not_member(self, reading_position_service, mock_table, sample_position_data):
        """Test saving position when user is not a space member."""
        # Mock space membership check - user is not a member
        mock_table.get_item.return_value = {}

        with pytest.raises(UnauthorizedError, match="member of the space"):
            reading_position_service.save_position(
                user_id='user-123',
                journal_id='journal-123',
                space_id='space-123',
                position_data=sample_position_data
            )

    def test_save_position_journal_not_found(self, reading_position_service, mock_table, sample_position_data):
        """Test saving position when journal doesn't exist."""
        # Mock space membership check - user is a member
        # Mock journal check - journal doesn't exist
        mock_table.get_item.side_effect = [
            {'Item': {'PK': 'SPACE#space-123', 'SK': 'MEMBER#user-123'}},  # is_space_member
            {},  # journal does not exist
        ]

        with pytest.raises(JournalNotFoundError, match="Journal .* not found"):
            reading_position_service.save_position(
                user_id='user-123',
                journal_id='journal-123',
                space_id='space-123',
                position_data=sample_position_data
            )

    def test_save_position_updates_existing(self, reading_position_service, mock_table, sample_position_data):
        """Test updating an existing reading position."""
        # Mock space membership, journal checks, and existing position
        mock_table.get_item.side_effect = [
            {'Item': {'PK': 'SPACE#space-123', 'SK': 'MEMBER#user-123'}},
            {'Item': {'PK': 'SPACE#space-123', 'SK': 'JOURNAL#journal-123'}},
            {'Item': {  # existing position
                'user_id': 'user-123',
                'journal_id': 'journal-123',
                'space_id': 'space-123',
                'scroll_position': 500,
                'progress_percent': 20.0,
                'words_read': 100,
                'total_words': 500,
                'created_at': '2024-01-01T00:00:00Z',
                'updated_at': '2024-01-01T00:00:00Z'
            }},
        ]

        mock_table.put_item.return_value = {}

        result = reading_position_service.save_position(
            user_id='user-123',
            journal_id='journal-123',
            space_id='space-123',
            position_data=sample_position_data
        )

        assert result['scroll_position'] == 1234
        assert result['created_at'] == '2024-01-01T00:00:00Z'  # Should preserve original created_at
        mock_table.put_item.assert_called_once()

    def test_get_position_exists(self, reading_position_service, mock_table):
        """Test getting an existing reading position."""
        mock_table.get_item.return_value = {
            'Item': {
                'PK': 'USER#user-123',
                'SK': 'READING_POS#journal-123',
                'user_id': 'user-123',
                'journal_id': 'journal-123',
                'space_id': 'space-123',
                'scroll_position': 1234,
                'current_section_id': 'section-2',
                'progress_percent': 45.5,
                'words_read': 250,
                'total_words': 550,
                'created_at': '2024-01-01T00:00:00Z',
                'updated_at': '2024-01-01T00:00:00Z',
                'expires_at': 1704067200
            }
        }

        result = reading_position_service.get_position('user-123', 'journal-123')

        assert result is not None
        assert result['user_id'] == 'user-123'
        assert result['journal_id'] == 'journal-123'
        assert result['scroll_position'] == 1234
        assert result['progress_percent'] == 45.5

    def test_get_position_not_exists(self, reading_position_service, mock_table):
        """Test getting a non-existent reading position."""
        mock_table.get_item.return_value = {}

        result = reading_position_service.get_position('user-123', 'journal-123')

        assert result is None

    def test_get_position_client_error(self, reading_position_service, mock_table):
        """Test getting position with client error."""
        mock_table.get_item.side_effect = ClientError(
            {'Error': {'Code': 'InternalServerError'}},
            'GetItem'
        )

        result = reading_position_service.get_position('user-123', 'journal-123')

        assert result is None

    def test_delete_position_success(self, reading_position_service, mock_table):
        """Test deleting a reading position."""
        mock_table.get_item.return_value = {
            'Item': {
                'PK': 'USER#user-123',
                'SK': 'READING_POS#journal-123'
            }
        }
        mock_table.delete_item.return_value = {}

        result = reading_position_service.delete_position('user-123', 'journal-123')

        assert result is True
        mock_table.delete_item.assert_called_once_with(
            Key={'PK': 'USER#user-123', 'SK': 'READING_POS#journal-123'}
        )

    def test_delete_position_not_exists(self, reading_position_service, mock_table):
        """Test deleting a non-existent reading position."""
        mock_table.get_item.return_value = {}

        result = reading_position_service.delete_position('user-123', 'journal-123')

        assert result is False
        mock_table.delete_item.assert_not_called()

    def test_delete_position_client_error(self, reading_position_service, mock_table):
        """Test deleting position with client error."""
        mock_table.get_item.return_value = {
            'Item': {'PK': 'USER#user-123', 'SK': 'READING_POS#journal-123'}
        }
        mock_table.delete_item.side_effect = ClientError(
            {'Error': {'Code': 'InternalServerError'}},
            'DeleteItem'
        )

        result = reading_position_service.delete_position('user-123', 'journal-123')

        assert result is False

    def test_get_user_positions_success(self, reading_position_service, mock_table):
        """Test getting user's reading positions."""
        mock_table.query.return_value = {
            'Items': [
                {
                    'PK': 'USER#user-123',
                    'SK': 'READING_POS#journal-1',
                    'user_id': 'user-123',
                    'journal_id': 'journal-1',
                    'space_id': 'space-123',
                    'scroll_position': 100,
                    'progress_percent': 10.0,
                    'words_read': 50,
                    'total_words': 500,
                    'created_at': '2024-01-02T00:00:00Z',
                    'updated_at': '2024-01-02T00:00:00Z'
                },
                {
                    'PK': 'USER#user-123',
                    'SK': 'READING_POS#journal-2',
                    'user_id': 'user-123',
                    'journal_id': 'journal-2',
                    'space_id': 'space-456',
                    'scroll_position': 200,
                    'progress_percent': 20.0,
                    'words_read': 100,
                    'total_words': 500,
                    'created_at': '2024-01-01T00:00:00Z',
                    'updated_at': '2024-01-01T00:00:00Z'
                }
            ]
        }

        result = reading_position_service.get_user_positions('user-123', limit=10)

        assert len(result) == 2
        assert result[0]['journal_id'] == 'journal-1'  # Most recent first
        assert result[1]['journal_id'] == 'journal-2'

    def test_get_user_positions_with_limit(self, reading_position_service, mock_table):
        """Test getting user's positions with limit."""
        items = [
            {
                'PK': 'USER#user-123',
                'SK': f'READING_POS#journal-{i}',
                'user_id': 'user-123',
                'journal_id': f'journal-{i}',
                'space_id': 'space-123',
                'scroll_position': i * 100,
                'progress_percent': i * 10.0,
                'words_read': i * 50,
                'total_words': 500,
                'created_at': f'2024-01-0{i}T00:00:00Z',
                'updated_at': f'2024-01-0{i}T00:00:00Z'
            }
            for i in range(1, 6)
        ]
        mock_table.query.return_value = {'Items': items}

        result = reading_position_service.get_user_positions('user-123', limit=3)

        assert len(result) == 3

    def test_get_user_positions_empty(self, reading_position_service, mock_table):
        """Test getting positions when user has none."""
        mock_table.query.return_value = {'Items': []}

        result = reading_position_service.get_user_positions('user-123')

        assert len(result) == 0

    def test_get_user_positions_client_error(self, reading_position_service, mock_table):
        """Test getting positions with client error."""
        mock_table.query.side_effect = ClientError(
            {'Error': {'Code': 'InternalServerError'}},
            'Query'
        )

        result = reading_position_service.get_user_positions('user-123')

        assert len(result) == 0

    def test_cleanup_old_positions_success(self, reading_position_service, mock_table):
        """Test cleaning up old reading positions."""
        # Mock scan to return old positions
        mock_table.scan.return_value = {
            'Items': [
                {
                    'PK': 'USER#user-1',
                    'SK': 'READING_POS#journal-1',
                    'updated_at': '2023-01-01T00:00:00Z'
                },
                {
                    'PK': 'USER#user-2',
                    'SK': 'READING_POS#journal-2',
                    'updated_at': '2023-01-02T00:00:00Z'
                }
            ]
        }
        mock_table.delete_item.return_value = {}

        count = reading_position_service.cleanup_old_positions(days=30)

        assert count == 2
        assert mock_table.delete_item.call_count == 2

    def test_cleanup_old_positions_no_old_items(self, reading_position_service, mock_table):
        """Test cleanup when no old positions exist."""
        mock_table.scan.return_value = {'Items': []}

        count = reading_position_service.cleanup_old_positions(days=30)

        assert count == 0
        mock_table.delete_item.assert_not_called()

    def test_cleanup_old_positions_client_error(self, reading_position_service, mock_table):
        """Test cleanup with client error."""
        mock_table.scan.side_effect = ClientError(
            {'Error': {'Code': 'InternalServerError'}},
            'Scan'
        )

        count = reading_position_service.cleanup_old_positions(days=30)

        assert count == 0

    def test_is_space_member_true(self, reading_position_service, mock_table):
        """Test checking if user is space member - success."""
        mock_table.get_item.return_value = {
            'Item': {'PK': 'SPACE#space-123', 'SK': 'MEMBER#user-123'}
        }

        result = reading_position_service._is_space_member('space-123', 'user-123')
        assert result is True

    def test_is_space_member_false(self, reading_position_service, mock_table):
        """Test checking if user is space member - not a member."""
        mock_table.get_item.return_value = {}

        result = reading_position_service._is_space_member('space-123', 'user-123')
        assert result is False

    def test_is_space_member_client_error(self, reading_position_service, mock_table):
        """Test checking space membership with client error."""
        mock_table.get_item.side_effect = ClientError(
            {'Error': {'Code': 'InternalServerError'}},
            'GetItem'
        )

        result = reading_position_service._is_space_member('space-123', 'user-123')
        assert result is False

    def test_journal_exists_true(self, reading_position_service, mock_table):
        """Test checking if journal exists - success."""
        mock_table.get_item.return_value = {
            'Item': {'PK': 'SPACE#space-123', 'SK': 'JOURNAL#journal-123'}
        }

        result = reading_position_service._journal_exists('space-123', 'journal-123')
        assert result is True

    def test_journal_exists_false(self, reading_position_service, mock_table):
        """Test checking if journal exists - not found."""
        mock_table.get_item.return_value = {}

        result = reading_position_service._journal_exists('space-123', 'journal-123')
        assert result is False

    def test_journal_exists_client_error(self, reading_position_service, mock_table):
        """Test checking journal existence with client error."""
        mock_table.get_item.side_effect = ClientError(
            {'Error': {'Code': 'InternalServerError'}},
            'GetItem'
        )

        result = reading_position_service._journal_exists('space-123', 'journal-123')
        assert result is False

    def test_save_position_with_partial_data(self, reading_position_service, mock_table):
        """Test saving position with minimal data."""
        position_data = ReadingPositionCreate(
            journal_id="journal-123",
            space_id="space-123",
            scroll_position=100,
            progress_percent=10.0,
            words_read=50,
            total_words=500
        )

        mock_table.get_item.side_effect = [
            {'Item': {'PK': 'SPACE#space-123', 'SK': 'MEMBER#user-123'}},
            {'Item': {'PK': 'SPACE#space-123', 'SK': 'JOURNAL#journal-123'}},
            {},  # get_position returns nothing (new position)
        ]
        mock_table.put_item.return_value = {}

        result = reading_position_service.save_position(
            user_id='user-123',
            journal_id='journal-123',
            space_id='space-123',
            position_data=position_data
        )

        assert result['scroll_position'] == 100
        assert result['current_section_id'] is None
        assert result['progress_percent'] == 10.0

    def test_save_position_zero_progress(self, reading_position_service, mock_table):
        """Test saving position with 0% progress."""
        position_data = ReadingPositionCreate(
            journal_id="journal-123",
            space_id="space-123",
            scroll_position=0,
            progress_percent=0.0,
            words_read=0,
            total_words=500
        )

        mock_table.get_item.side_effect = [
            {'Item': {'PK': 'SPACE#space-123', 'SK': 'MEMBER#user-123'}},
            {'Item': {'PK': 'SPACE#space-123', 'SK': 'JOURNAL#journal-123'}},
            {},  # get_position returns nothing (new position)
        ]
        mock_table.put_item.return_value = {}

        result = reading_position_service.save_position(
            user_id='user-123',
            journal_id='journal-123',
            space_id='space-123',
            position_data=position_data
        )

        assert result['progress_percent'] == 0.0
        assert result['words_read'] == 0

    def test_save_position_complete_progress(self, reading_position_service, mock_table):
        """Test saving position with 100% progress."""
        position_data = ReadingPositionCreate(
            journal_id="journal-123",
            space_id="space-123",
            scroll_position=5000,
            progress_percent=100.0,
            words_read=500,
            total_words=500
        )

        mock_table.get_item.side_effect = [
            {'Item': {'PK': 'SPACE#space-123', 'SK': 'MEMBER#user-123'}},
            {'Item': {'PK': 'SPACE#space-123', 'SK': 'JOURNAL#journal-123'}},
            {},  # get_position returns nothing (new position)
        ]
        mock_table.put_item.return_value = {}

        result = reading_position_service.save_position(
            user_id='user-123',
            journal_id='journal-123',
            space_id='space-123',
            position_data=position_data
        )

        assert result['progress_percent'] == 100.0
        assert result['words_read'] == 500
        assert result['total_words'] == 500
