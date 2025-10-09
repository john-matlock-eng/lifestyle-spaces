"""
Tests for journal service module to achieve 95%+ coverage.
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
from app.services.journal import JournalService, JournalNotFoundError
from app.services.exceptions import SpaceNotFoundError, UnauthorizedError, ValidationError
from app.models.journal import JournalCreate, JournalUpdate


class TestJournalService:
    """Test journal service methods."""

    @pytest.fixture
    def mock_table(self):
        """Create a mock DynamoDB table."""
        with patch('app.services.journal.boto3.resource') as mock_resource:
            mock_table = MagicMock()
            mock_resource.return_value.Table.return_value = mock_table
            yield mock_table

    @pytest.fixture
    def journal_service(self, mock_table):
        """Create a JournalService instance with mocked table."""
        return JournalService()

    @pytest.fixture
    def sample_journal_data(self):
        """Sample journal data for testing."""
        return JournalCreate(
            space_id="space-123",
            title="My Daily Journal",
            content="Today was a great day. I learned a lot.",
            tags=["daily", "learning"],
            mood="happy",
            is_pinned=False
        )

    def test_calculate_word_count(self, journal_service):
        """Test word count calculation."""
        assert journal_service._calculate_word_count("Hello world") == 2
        assert journal_service._calculate_word_count("One two three four") == 4
        assert journal_service._calculate_word_count("") == 0
        assert journal_service._calculate_word_count("   ") == 0
        assert journal_service._calculate_word_count("Single") == 1

    def test_is_space_member_true(self, journal_service, mock_table):
        """Test checking if user is space member - success."""
        mock_table.get_item.return_value = {
            'Item': {
                'PK': 'SPACE#space-123',
                'SK': 'MEMBER#user-123',
                'user_id': 'user-123',
                'role': 'member'
            }
        }

        result = journal_service._is_space_member('space-123', 'user-123')
        assert result is True

    def test_is_space_member_false(self, journal_service, mock_table):
        """Test checking if user is space member - not a member."""
        mock_table.get_item.return_value = {}

        result = journal_service._is_space_member('space-123', 'user-456')
        assert result is False

    def test_is_space_member_error(self, journal_service, mock_table):
        """Test checking if user is space member - error."""
        mock_table.get_item.side_effect = ClientError(
            {'Error': {'Code': 'InternalServerError'}},
            'GetItem'
        )

        result = journal_service._is_space_member('space-123', 'user-123')
        assert result is False

    def test_get_space_success(self, journal_service, mock_table):
        """Test getting space metadata - success."""
        mock_table.get_item.return_value = {
            'Item': {
                'PK': 'SPACE#space-123',
                'SK': 'METADATA',
                'id': 'space-123',
                'name': 'Test Space'
            }
        }

        result = journal_service._get_space('space-123')
        assert result is not None
        assert result['id'] == 'space-123'

    def test_get_space_not_found(self, journal_service, mock_table):
        """Test getting space metadata - not found."""
        mock_table.get_item.return_value = {}

        result = journal_service._get_space('space-456')
        assert result is None

    def test_get_space_error(self, journal_service, mock_table):
        """Test getting space metadata - error."""
        mock_table.get_item.side_effect = ClientError(
            {'Error': {'Code': 'InternalServerError'}},
            'GetItem'
        )

        result = journal_service._get_space('space-123')
        assert result is None

    def test_get_user_role_success(self, journal_service, mock_table):
        """Test getting user role - success."""
        mock_table.get_item.return_value = {
            'Item': {
                'PK': 'SPACE#space-123',
                'SK': 'MEMBER#user-123',
                'role': 'owner'
            }
        }

        result = journal_service._get_user_role('space-123', 'user-123')
        assert result == 'owner'

    def test_get_user_role_not_found(self, journal_service, mock_table):
        """Test getting user role - not found."""
        mock_table.get_item.return_value = {}

        result = journal_service._get_user_role('space-123', 'user-456')
        assert result is None

    def test_get_user_role_error(self, journal_service, mock_table):
        """Test getting user role - error."""
        mock_table.get_item.side_effect = ClientError(
            {'Error': {'Code': 'InternalServerError'}},
            'GetItem'
        )

        result = journal_service._get_user_role('space-123', 'user-123')
        assert result is None

    @patch('app.services.journal.JournalService._is_space_member')
    @patch('app.services.journal.JournalService._get_space')
    def test_create_journal_entry_success(self, mock_get_space, mock_is_member, journal_service, mock_table, sample_journal_data):
        """Test creating journal entry - success."""
        # Mock space exists
        mock_get_space.return_value = {
            'id': 'space-123',
            'name': 'Test Space'
        }

        # Mock user is member
        mock_is_member.return_value = True

        result = journal_service.create_journal_entry(
            space_id='space-123',
            user_id='user-123',
            data=sample_journal_data
        )

        assert result['journal_id'] is not None
        assert result['space_id'] == 'space-123'
        assert result['user_id'] == 'user-123'
        assert result['title'] == 'My Daily Journal'
        assert result['word_count'] == 9  # "Today was a great day. I learned a lot."
        # Tags are stored as a set, so order may vary
        assert set(result['tags']) == {'daily', 'learning'}
        assert result['mood'] == 'happy'
        assert result['is_pinned'] is False
        mock_table.put_item.assert_called_once()

    @patch('app.services.journal.JournalService._get_space')
    def test_create_journal_entry_space_not_found(self, mock_get_space, journal_service, sample_journal_data):
        """Test creating journal entry - space not found."""
        mock_get_space.return_value = None

        with pytest.raises(SpaceNotFoundError):
            journal_service.create_journal_entry(
                space_id='space-456',
                user_id='user-123',
                data=sample_journal_data
            )

    @patch('app.services.journal.JournalService._is_space_member')
    @patch('app.services.journal.JournalService._get_space')
    def test_create_journal_entry_not_member(self, mock_get_space, mock_is_member, journal_service, sample_journal_data):
        """Test creating journal entry - user not a member."""
        mock_get_space.return_value = {'id': 'space-123'}
        mock_is_member.return_value = False

        with pytest.raises(UnauthorizedError):
            journal_service.create_journal_entry(
                space_id='space-123',
                user_id='user-456',
                data=sample_journal_data
            )

    @patch('app.services.journal.JournalService._is_space_member')
    def test_get_journal_entry_success(self, mock_is_member, journal_service, mock_table):
        """Test getting journal entry - success."""
        # Mock query response
        mock_table.query.return_value = {
            'Items': [{
                'PK': 'SPACE#space-123',
                'SK': 'JOURNAL#journal-123',
                'journal_id': 'journal-123',
                'space_id': 'space-123',
                'user_id': 'user-123',
                'title': 'Test Journal',
                'content': 'Test content',
                'tags': ['test'],
                'mood': 'happy',
                'created_at': '2024-01-01T00:00:00Z',
                'updated_at': '2024-01-01T00:00:00Z',
                'word_count': 2,
                'is_pinned': False
            }]
        }

        # Mock user is member
        mock_is_member.return_value = True

        with patch('app.services.journal.JournalService._get_author_info') as mock_author:
            mock_author.return_value = {
                'user_id': 'user-123',
                'username': 'testuser',
                'display_name': 'Test User'
            }

            result = journal_service.get_journal_entry('journal-123', 'user-123')

            assert result['journal_id'] == 'journal-123'
            assert result['title'] == 'Test Journal'
            assert result['author'] is not None

    def test_get_journal_entry_not_found(self, journal_service, mock_table):
        """Test getting journal entry - not found."""
        mock_table.query.return_value = {'Items': []}
        mock_table.scan.return_value = {'Items': []}

        with pytest.raises(JournalNotFoundError):
            journal_service.get_journal_entry('journal-456', 'user-123')

    @patch('app.services.journal.JournalService._is_space_member')
    def test_get_journal_entry_unauthorized(self, mock_is_member, journal_service, mock_table):
        """Test getting journal entry - unauthorized."""
        mock_table.query.return_value = {
            'Items': [{
                'journal_id': 'journal-123',
                'space_id': 'space-123',
                'user_id': 'user-123'
            }]
        }
        mock_is_member.return_value = False

        with pytest.raises(UnauthorizedError):
            journal_service.get_journal_entry('journal-123', 'user-456')

    @patch('app.services.journal.JournalService._get_author_info')
    def test_update_journal_entry_success(self, mock_author, journal_service, mock_table):
        """Test updating journal entry - success."""
        # Mock query response
        mock_table.query.return_value = {
            'Items': [{
                'PK': 'SPACE#space-123',
                'SK': 'JOURNAL#journal-123',
                'journal_id': 'journal-123',
                'space_id': 'space-123',
                'user_id': 'user-123',
                'title': 'Old Title',
                'content': 'Old content',
                'tags': ['old'],
                'created_at': '2024-01-01T00:00:00Z',
                'updated_at': '2024-01-01T00:00:00Z',
                'word_count': 2
            }]
        }

        # Mock update response
        mock_table.update_item.return_value = {
            'Attributes': {
                'journal_id': 'journal-123',
                'space_id': 'space-123',
                'user_id': 'user-123',
                'title': 'New Title',
                'content': 'New content',
                'tags': ['new'],
                'created_at': '2024-01-01T00:00:00Z',
                'updated_at': '2024-01-02T00:00:00Z',
                'word_count': 2,
                'is_pinned': True
            }
        }

        mock_author.return_value = {'user_id': 'user-123', 'username': 'testuser', 'display_name': 'Test User'}

        update_data = JournalUpdate(
            title='New Title',
            content='New content',
            tags=['new'],
            is_pinned=True
        )

        result = journal_service.update_journal_entry('journal-123', 'user-123', update_data)

        assert result['title'] == 'New Title'
        assert result['content'] == 'New content'
        assert result['is_pinned'] is True
        mock_table.update_item.assert_called_once()

    def test_update_journal_entry_not_found(self, journal_service, mock_table):
        """Test updating journal entry - not found."""
        mock_table.query.return_value = {'Items': []}
        mock_table.scan.return_value = {'Items': []}

        update_data = JournalUpdate(title='New Title')

        with pytest.raises(JournalNotFoundError):
            journal_service.update_journal_entry('journal-456', 'user-123', update_data)

    def test_update_journal_entry_not_author(self, journal_service, mock_table):
        """Test updating journal entry - not the author."""
        mock_table.query.return_value = {
            'Items': [{
                'journal_id': 'journal-123',
                'user_id': 'user-123',
                'space_id': 'space-123'
            }]
        }

        update_data = JournalUpdate(title='New Title')

        with pytest.raises(UnauthorizedError):
            journal_service.update_journal_entry('journal-123', 'user-456', update_data)

    @patch('app.services.journal.JournalService._get_user_role')
    def test_delete_journal_entry_by_author(self, mock_role, journal_service, mock_table):
        """Test deleting journal entry - by author."""
        mock_table.query.return_value = {
            'Items': [{
                'PK': 'SPACE#space-123',
                'SK': 'JOURNAL#journal-123',
                'journal_id': 'journal-123',
                'space_id': 'space-123',
                'user_id': 'user-123'
            }]
        }

        mock_role.return_value = 'member'

        result = journal_service.delete_journal_entry('journal-123', 'user-123')

        assert result is True
        mock_table.delete_item.assert_called_once()

    @patch('app.services.journal.JournalService._get_user_role')
    def test_delete_journal_entry_by_space_owner(self, mock_role, journal_service, mock_table):
        """Test deleting journal entry - by space owner."""
        mock_table.query.return_value = {
            'Items': [{
                'PK': 'SPACE#space-123',
                'SK': 'JOURNAL#journal-123',
                'journal_id': 'journal-123',
                'space_id': 'space-123',
                'user_id': 'user-123'
            }]
        }

        mock_role.return_value = 'owner'

        result = journal_service.delete_journal_entry('journal-123', 'user-456')

        assert result is True
        mock_table.delete_item.assert_called_once()

    def test_delete_journal_entry_not_found(self, journal_service, mock_table):
        """Test deleting journal entry - not found."""
        mock_table.query.return_value = {'Items': []}
        mock_table.scan.return_value = {'Items': []}

        with pytest.raises(JournalNotFoundError):
            journal_service.delete_journal_entry('journal-456', 'user-123')

    @patch('app.services.journal.JournalService._get_user_role')
    def test_delete_journal_entry_unauthorized(self, mock_role, journal_service, mock_table):
        """Test deleting journal entry - unauthorized."""
        mock_table.query.return_value = {
            'Items': [{
                'journal_id': 'journal-123',
                'space_id': 'space-123',
                'user_id': 'user-123'
            }]
        }

        mock_role.return_value = 'member'

        with pytest.raises(UnauthorizedError):
            journal_service.delete_journal_entry('journal-123', 'user-456')

    @patch('app.services.journal.JournalService._get_author_info')
    @patch('app.services.journal.JournalService._is_space_member')
    @patch('app.services.journal.JournalService._get_space')
    def test_list_space_journals_success(self, mock_get_space, mock_is_member, mock_author, journal_service, mock_table):
        """Test listing space journals - success."""
        mock_get_space.return_value = {'id': 'space-123'}
        mock_is_member.return_value = True
        mock_author.return_value = {'user_id': 'user-123', 'username': 'testuser', 'display_name': 'Test User'}

        mock_table.query.return_value = {
            'Items': [
                {
                    'journal_id': 'journal-1',
                    'space_id': 'space-123',
                    'user_id': 'user-123',
                    'title': 'Journal 1',
                    'content': 'Content 1',
                    'tags': ['tag1'],
                    'mood': 'happy',
                    'created_at': '2024-01-02T00:00:00Z',
                    'updated_at': '2024-01-02T00:00:00Z',
                    'word_count': 2,
                    'is_pinned': True
                },
                {
                    'journal_id': 'journal-2',
                    'space_id': 'space-123',
                    'user_id': 'user-123',
                    'title': 'Journal 2',
                    'content': 'Content 2',
                    'tags': ['tag2'],
                    'created_at': '2024-01-01T00:00:00Z',
                    'updated_at': '2024-01-01T00:00:00Z',
                    'word_count': 2,
                    'is_pinned': False
                }
            ]
        }

        result = journal_service.list_space_journals('space-123', 'user-123')

        assert result['total'] == 2
        assert len(result['journals']) == 2
        # Pinned journal should be first, then sorted by date (newer first)
        # journal-1 is pinned with date 2024-01-02
        # journal-2 is not pinned with date 2024-01-01
        # Since pinned items come first, journal-1 should be first
        pinned_journals = [j for j in result['journals'] if j.get('is_pinned')]
        assert len(pinned_journals) == 1
        assert pinned_journals[0]['journal_id'] == 'journal-1'

    @patch('app.services.journal.JournalService._get_author_info')
    @patch('app.services.journal.JournalService._is_space_member')
    @patch('app.services.journal.JournalService._get_space')
    def test_list_space_journals_with_filters(self, mock_get_space, mock_is_member, mock_author, journal_service, mock_table):
        """Test listing space journals with filters."""
        mock_get_space.return_value = {'id': 'space-123'}
        mock_is_member.return_value = True
        mock_author.return_value = {'user_id': 'user-123', 'username': 'testuser', 'display_name': 'Test User'}

        mock_table.query.return_value = {
            'Items': [
                {
                    'journal_id': 'journal-1',
                    'space_id': 'space-123',
                    'user_id': 'user-123',
                    'title': 'Journal 1',
                    'content': 'Content 1',
                    'tags': ['tag1', 'tag2'],
                    'mood': 'happy',
                    'created_at': '2024-01-01T00:00:00Z',
                    'updated_at': '2024-01-01T00:00:00Z',
                    'word_count': 2,
                    'is_pinned': False
                },
                {
                    'journal_id': 'journal-2',
                    'space_id': 'space-123',
                    'user_id': 'user-456',
                    'title': 'Journal 2',
                    'content': 'Content 2',
                    'tags': ['tag3'],
                    'mood': 'sad',
                    'created_at': '2024-01-02T00:00:00Z',
                    'updated_at': '2024-01-02T00:00:00Z',
                    'word_count': 2,
                    'is_pinned': False
                }
            ]
        }

        # Filter by tags
        result = journal_service.list_space_journals('space-123', 'user-123', tags=['tag1'])
        assert result['total'] == 1
        assert result['journals'][0]['journal_id'] == 'journal-1'

        # Filter by mood
        result = journal_service.list_space_journals('space-123', 'user-123', mood='sad')
        assert result['total'] == 1
        assert result['journals'][0]['journal_id'] == 'journal-2'

        # Filter by author
        result = journal_service.list_space_journals('space-123', 'user-123', author_id='user-456')
        assert result['total'] == 1
        assert result['journals'][0]['journal_id'] == 'journal-2'

    @patch('app.services.journal.JournalService._is_space_member')
    @patch('app.services.journal.JournalService._get_space')
    def test_list_space_journals_space_not_found(self, mock_get_space, mock_is_member, journal_service):
        """Test listing space journals - space not found."""
        mock_get_space.return_value = None

        with pytest.raises(SpaceNotFoundError):
            journal_service.list_space_journals('space-456', 'user-123')

    @patch('app.services.journal.JournalService._is_space_member')
    @patch('app.services.journal.JournalService._get_space')
    def test_list_space_journals_unauthorized(self, mock_get_space, mock_is_member, journal_service):
        """Test listing space journals - unauthorized."""
        mock_get_space.return_value = {'id': 'space-123'}
        mock_is_member.return_value = False

        with pytest.raises(UnauthorizedError):
            journal_service.list_space_journals('space-123', 'user-456')

    @patch('app.services.journal.JournalService._get_author_info')
    @patch('app.services.journal.JournalService._is_space_member')
    @patch('app.services.journal.JournalService._get_space')
    def test_list_space_journals_pagination(self, mock_get_space, mock_is_member, mock_author, journal_service, mock_table):
        """Test listing space journals with pagination."""
        mock_get_space.return_value = {'id': 'space-123'}
        mock_is_member.return_value = True
        mock_author.return_value = {'user_id': 'user-123', 'username': 'testuser', 'display_name': 'Test User'}

        # Create 25 journals
        items = []
        for i in range(25):
            items.append({
                'journal_id': f'journal-{i}',
                'space_id': 'space-123',
                'user_id': 'user-123',
                'title': f'Journal {i}',
                'content': f'Content {i}',
                'tags': [],
                'created_at': f'2024-01-{i+1:02d}T00:00:00Z',
                'updated_at': f'2024-01-{i+1:02d}T00:00:00Z',
                'word_count': 2,
                'is_pinned': False
            })

        mock_table.query.return_value = {'Items': items}

        # Page 1
        result = journal_service.list_space_journals('space-123', 'user-123', page=1, page_size=20)
        assert len(result['journals']) == 20
        assert result['total'] == 25
        assert result['has_more'] is True

        # Page 2
        result = journal_service.list_space_journals('space-123', 'user-123', page=2, page_size=20)
        assert len(result['journals']) == 5
        assert result['total'] == 25
        assert result['has_more'] is False

    @patch('app.services.journal.JournalService._get_author_info')
    @patch('app.services.journal.JournalService._is_space_member')
    def test_list_user_journals_success(self, mock_is_member, mock_author, journal_service, mock_table):
        """Test listing user journals - success."""
        mock_is_member.return_value = True
        mock_author.return_value = {'user_id': 'user-123', 'username': 'testuser', 'display_name': 'Test User'}

        mock_table.query.return_value = {
            'Items': [
                {
                    'journal_id': 'journal-1',
                    'space_id': 'space-123',
                    'user_id': 'user-123',
                    'title': 'Journal 1',
                    'content': 'Content 1',
                    'tags': [],
                    'created_at': '2024-01-02T00:00:00Z',
                    'updated_at': '2024-01-02T00:00:00Z',
                    'word_count': 2,
                    'is_pinned': False
                },
                {
                    'journal_id': 'journal-2',
                    'space_id': 'space-456',
                    'user_id': 'user-123',
                    'title': 'Journal 2',
                    'content': 'Content 2',
                    'tags': [],
                    'created_at': '2024-01-01T00:00:00Z',
                    'updated_at': '2024-01-01T00:00:00Z',
                    'word_count': 2,
                    'is_pinned': False
                }
            ]
        }

        result = journal_service.list_user_journals('user-123')

        assert result['total'] == 2
        assert len(result['journals']) == 2
        # Should be sorted by created_at desc
        assert result['journals'][0]['journal_id'] == 'journal-1'

    @patch('app.services.journal.JournalService._is_space_member')
    def test_list_user_journals_filters_inaccessible_spaces(self, mock_is_member, journal_service, mock_table):
        """Test listing user journals filters out inaccessible spaces."""
        # User is member of first space but not second
        mock_is_member.side_effect = [True, False]

        mock_table.query.return_value = {
            'Items': [
                {
                    'journal_id': 'journal-1',
                    'space_id': 'space-123',
                    'user_id': 'user-123',
                    'title': 'Journal 1',
                    'content': 'Content 1',
                    'tags': [],
                    'created_at': '2024-01-01T00:00:00Z',
                    'updated_at': '2024-01-01T00:00:00Z',
                    'word_count': 2,
                    'is_pinned': False
                },
                {
                    'journal_id': 'journal-2',
                    'space_id': 'space-456',
                    'user_id': 'user-123',
                    'title': 'Journal 2',
                    'content': 'Content 2',
                    'tags': [],
                    'created_at': '2024-01-02T00:00:00Z',
                    'updated_at': '2024-01-02T00:00:00Z',
                    'word_count': 2,
                    'is_pinned': False
                }
            ]
        }

        result = journal_service.list_user_journals('user-123')

        # Should only include journal from accessible space
        assert result['total'] == 1
        assert result['journals'][0]['journal_id'] == 'journal-1'

    def test_get_author_info_success(self, journal_service):
        """Test getting author info - success."""
        with patch('app.services.user_profile.UserProfileService') as mock_profile_service:
            mock_service = MagicMock()
            mock_profile_service.return_value = mock_service
            mock_service.get_user_profile.return_value = {
                'username': 'testuser',
                'display_name': 'Test User'
            }

            result = journal_service._get_author_info('user-123')

            assert result['user_id'] == 'user-123'
            assert result['username'] == 'testuser'
            assert result['display_name'] == 'Test User'

    def test_get_author_info_profile_not_found(self, journal_service):
        """Test getting author info - profile not found."""
        with patch('app.services.user_profile.UserProfileService') as mock_profile_service:
            mock_service = MagicMock()
            mock_profile_service.return_value = mock_service
            mock_service.get_user_profile.return_value = None

            result = journal_service._get_author_info('user-123')

            assert result['user_id'] == 'user-123'
            assert result['username'] == 'Unknown'
            assert result['display_name'] == 'Unknown'

    def test_get_author_info_error(self, journal_service):
        """Test getting author info - error."""
        with patch('app.services.user_profile.UserProfileService') as mock_profile_service:
            mock_service = MagicMock()
            mock_profile_service.return_value = mock_service
            mock_service.get_user_profile.side_effect = Exception('Service error')

            result = journal_service._get_author_info('user-123')

            assert result['user_id'] == 'user-123'
            assert result['username'] == 'Unknown'
            assert result['display_name'] == 'Unknown'

    @patch('app.services.journal.JournalService._get_author_info')
    def test_update_journal_with_mood_only(self, mock_author, journal_service, mock_table):
        """Test updating journal with mood only."""
        mock_table.query.return_value = {
            'Items': [{
                'PK': 'SPACE#space-123',
                'SK': 'JOURNAL#journal-123',
                'journal_id': 'journal-123',
                'space_id': 'space-123',
                'user_id': 'user-123',
                'title': 'Title',
                'content': 'Content',
                'created_at': '2024-01-01T00:00:00Z',
                'updated_at': '2024-01-01T00:00:00Z',
                'word_count': 1
            }]
        }

        mock_table.update_item.return_value = {
            'Attributes': {
                'journal_id': 'journal-123',
                'space_id': 'space-123',
                'user_id': 'user-123',
                'title': 'Title',
                'content': 'Content',
                'mood': 'excited',
                'created_at': '2024-01-01T00:00:00Z',
                'updated_at': '2024-01-02T00:00:00Z',
                'word_count': 1,
                'is_pinned': False
            }
        }

        mock_author.return_value = {'user_id': 'user-123', 'username': 'testuser', 'display_name': 'Test User'}

        update_data = JournalUpdate(mood='excited')
        result = journal_service.update_journal_entry('journal-123', 'user-123', update_data)

        assert result['mood'] == 'excited'
