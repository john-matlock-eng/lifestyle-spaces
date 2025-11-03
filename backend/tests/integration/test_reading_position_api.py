"""
Integration tests for reading position API endpoints.
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
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app


class TestReadingPositionAPI:
    """Integration tests for reading position API endpoints."""

    @pytest.fixture
    def client(self):
        """Create a test client with mocked auth."""
        from app.core.dependencies import get_current_user

        def override_get_current_user():
            return {'sub': 'user-123', 'email': 'test@example.com'}

        app.dependency_overrides[get_current_user] = override_get_current_user
        client = TestClient(app)
        yield client
        app.dependency_overrides.clear()

    @pytest.fixture
    def mock_service(self):
        """Mock ReadingPositionService."""
        with patch('app.api.routes.reading_positions.ReadingPositionService') as mock:
            yield mock

    def test_save_reading_position_success(self, client, mock_service):
        """Test saving a reading position successfully."""
        mock_instance = MagicMock()
        mock_service.return_value = mock_instance
        mock_instance.save_position.return_value = {
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

        response = client.post(
            '/api/reading-positions',
            json={
                'journalId': 'journal-123',
                'spaceId': 'space-123',
                'scrollPosition': 1234,
                'currentSectionId': 'section-2',
                'progressPercent': 45.5,
                'wordsRead': 250,
                'totalWords': 550
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data['userId'] == 'user-123'
        assert data['journalId'] == 'journal-123'
        assert data['spaceId'] == 'space-123'
        assert data['scrollPosition'] == 1234
        assert data['currentSectionId'] == 'section-2'
        assert data['progressPercent'] == 45.5
        assert data['wordsRead'] == 250
        assert data['totalWords'] == 550

    def test_save_reading_position_unauthorized(self, client, mock_service):
        """Test saving position when unauthorized."""
        from app.services.exceptions import UnauthorizedError

        mock_instance = MagicMock()
        mock_service.return_value = mock_instance
        mock_instance.save_position.side_effect = UnauthorizedError("Not authorized")

        response = client.post(
            '/api/reading-positions',
            json={
                'journalId': 'journal-123',
                'spaceId': 'space-123',
                'scrollPosition': 1234,
                'progressPercent': 45.5,
                'wordsRead': 250,
                'totalWords': 550
            }
        )

        assert response.status_code == 403

    def test_save_reading_position_journal_not_found(self, client, mock_service):
        """Test saving position when journal doesn't exist."""
        from app.services.exceptions import JournalNotFoundError

        mock_instance = MagicMock()
        mock_service.return_value = mock_instance
        mock_instance.save_position.side_effect = JournalNotFoundError("Journal not found")

        response = client.post(
            '/api/reading-positions',
            json={
                'journalId': 'journal-123',
                'spaceId': 'space-123',
                'scrollPosition': 1234,
                'progressPercent': 45.5,
                'wordsRead': 250,
                'totalWords': 550
            }
        )

        assert response.status_code == 404

    def test_save_reading_position_validation_error(self, client):
        """Test saving position with invalid data."""
        response = client.post(
            '/api/reading-positions',
            json={
                'journalId': 'journal-123',
                'spaceId': 'space-123',
                'scrollPosition': -100,  # Invalid: negative
                'progressPercent': 150.0,  # Invalid: > 100
                'wordsRead': 250,
                'totalWords': 550
            }
        )

        assert response.status_code == 422

    def test_get_reading_position_success(self, client, mock_service):
        """Test getting a reading position successfully."""
        mock_instance = MagicMock()
        mock_service.return_value = mock_instance
        mock_instance.get_position.return_value = {
            'user_id': 'user-123',
            'journal_id': 'journal-123',
            'space_id': 'space-123',
            'scroll_position': 1234,
            'current_section_id': 'section-2',
            'progress_percent': 45.5,
            'words_read': 250,
            'total_words': 550,
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z'
        }

        response = client.get('/api/reading-positions/journal-123')

        assert response.status_code == 200
        data = response.json()
        assert data['journalId'] == 'journal-123'
        assert data['scrollPosition'] == 1234

    def test_get_reading_position_not_found(self, client, mock_service):
        """Test getting a non-existent reading position."""
        mock_instance = MagicMock()
        mock_service.return_value = mock_instance
        mock_instance.get_position.return_value = None

        response = client.get('/api/reading-positions/journal-123')

        assert response.status_code == 404

    def test_delete_reading_position_success(self, client, mock_service):
        """Test deleting a reading position successfully."""
        mock_instance = MagicMock()
        mock_service.return_value = mock_instance
        mock_instance.delete_position.return_value = True

        response = client.delete('/api/reading-positions/journal-123')

        assert response.status_code == 204

    def test_delete_reading_position_not_found(self, client, mock_service):
        """Test deleting a non-existent reading position."""
        mock_instance = MagicMock()
        mock_service.return_value = mock_instance
        mock_instance.delete_position.return_value = False

        response = client.delete('/api/reading-positions/journal-123')

        assert response.status_code == 404

    def test_get_user_positions_success(self, client, mock_service):
        """Test getting user's reading positions."""
        mock_instance = MagicMock()
        mock_service.return_value = mock_instance
        mock_instance.get_user_positions.return_value = [
            {
                'user_id': 'user-123',
                'journal_id': 'journal-1',
                'space_id': 'space-123',
                'scroll_position': 100,
                'current_section_id': None,
                'progress_percent': 10.0,
                'words_read': 50,
                'total_words': 500,
                'created_at': '2024-01-01T00:00:00Z',
                'updated_at': '2024-01-01T00:00:00Z'
            },
            {
                'user_id': 'user-123',
                'journal_id': 'journal-2',
                'space_id': 'space-456',
                'scroll_position': 200,
                'current_section_id': 'section-1',
                'progress_percent': 20.0,
                'words_read': 100,
                'total_words': 500,
                'created_at': '2024-01-01T00:00:00Z',
                'updated_at': '2024-01-01T00:00:00Z'
            }
        ]

        response = client.get('/api/reading-positions')

        assert response.status_code == 200
        data = response.json()
        assert 'positions' in data
        assert len(data['positions']) == 2
        assert data['total'] == 2

    def test_get_user_positions_with_limit(self, client, mock_service):
        """Test getting user's positions with limit."""
        mock_instance = MagicMock()
        mock_service.return_value = mock_instance
        mock_instance.get_user_positions.return_value = [
            {
                'user_id': 'user-123',
                'journal_id': 'journal-1',
                'space_id': 'space-123',
                'scroll_position': 100,
                'progress_percent': 10.0,
                'words_read': 50,
                'total_words': 500,
                'created_at': '2024-01-01T00:00:00Z',
                'updated_at': '2024-01-01T00:00:00Z'
            }
        ]

        response = client.get('/api/reading-positions?limit=1')

        assert response.status_code == 200
        mock_instance.get_user_positions.assert_called_once_with(user_id='user-123', limit=1)

    def test_get_user_positions_empty(self, client, mock_service):
        """Test getting positions when user has none."""
        mock_instance = MagicMock()
        mock_service.return_value = mock_instance
        mock_instance.get_user_positions.return_value = []

        response = client.get('/api/reading-positions')

        assert response.status_code == 200
        data = response.json()
        assert len(data['positions']) == 0
        assert data['total'] == 0

    def test_save_position_without_optional_fields(self, client, mock_service):
        """Test saving position without optional fields."""
        mock_instance = MagicMock()
        mock_service.return_value = mock_instance
        mock_instance.save_position.return_value = {
            'user_id': 'user-123',
            'journal_id': 'journal-123',
            'space_id': 'space-123',
            'scroll_position': 1234,
            'current_section_id': None,
            'progress_percent': 45.5,
            'words_read': 250,
            'total_words': 550,
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z',
            'expires_at': 1704067200
        }

        response = client.post(
            '/api/reading-positions',
            json={
                'journalId': 'journal-123',
                'spaceId': 'space-123',
                'scrollPosition': 1234,
                'progressPercent': 45.5,
                'wordsRead': 250,
                'totalWords': 550
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data['currentSectionId'] is None
