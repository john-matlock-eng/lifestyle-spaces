"""
Tests for journal API routes to achieve 95%+ coverage.
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
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from app.services.journal import JournalNotFoundError
from app.services.exceptions import SpaceNotFoundError, UnauthorizedError, ValidationError


class TestJournalRoutes:
    """Test journal API routes."""

    def setup_method(self):
        """Set up test client and mocks."""
        from app.main import app
        from app.core.dependencies import get_current_user

        self.app = app
        self.client = TestClient(app)

        # Mock user for authenticated requests
        self.mock_user = {
            "sub": "user-123",
            "email": "test@example.com",
            "username": "testuser"
        }

        # Override auth dependency
        def override_get_current_user():
            return self.mock_user

        app.dependency_overrides[get_current_user] = override_get_current_user

        # Sample journal response
        self.sample_journal_response = {
            "journal_id": "journal-123",
            "space_id": "space-123",
            "user_id": "user-123",
            "title": "Test Journal",
            "content": "Test content",
            "template_id": None,
            "template_data": {},
            "tags": ["test"],
            "mood": "happy",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "word_count": 2,
            "is_pinned": False,
            "author": {
                "user_id": "user-123",
                "username": "testuser",
                "display_name": "Test User"
            }
        }

    def teardown_method(self):
        """Clean up dependency overrides."""
        self.app.dependency_overrides.clear()

    def test_create_journal_success(self):
        """Test creating journal - success."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.create_journal_entry.return_value = self.sample_journal_response

            response = self.client.post(
                "/api/spaces/space-123/journals",
                json={
                    "spaceId": "space-123",
                    "title": "Test Journal",
                    "content": "Test content",
                    "tags": ["test"],
                    "mood": "happy",
                    "isPinned": False
                }
            )

            assert response.status_code == 201
            data = response.json()
            assert data["journalId"] == "journal-123"
            assert data["title"] == "Test Journal"

    def test_create_journal_validation_error(self):
        """Test creating journal - validation error."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.create_journal_entry.side_effect = ValidationError("Invalid data")

            response = self.client.post(
                "/api/spaces/space-123/journals",
                json={
                    "spaceId": "space-123",
                    "title": "",
                    "content": "Test content"
                }
            )

            assert response.status_code == 422

    def test_create_journal_space_not_found(self):
        """Test creating journal - space not found."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.create_journal_entry.side_effect = SpaceNotFoundError("Space not found")

            response = self.client.post(
                "/api/spaces/space-456/journals",
                json={
                    "spaceId": "space-456",
                    "title": "Test Journal",
                    "content": "Test content"
                }
            )

            assert response.status_code == 404

    def test_create_journal_unauthorized(self):
        """Test creating journal - unauthorized."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.create_journal_entry.side_effect = UnauthorizedError("Not authorized")

            response = self.client.post(
                "/api/spaces/space-123/journals",
                json={
                    "spaceId": "space-123",
                    "title": "Test Journal",
                    "content": "Test content"
                }
            )

            assert response.status_code == 403

    def test_create_journal_server_error(self):
        """Test creating journal - server error."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.create_journal_entry.side_effect = Exception("Database error")

            response = self.client.post(
                "/api/spaces/space-123/journals",
                json={
                    "spaceId": "space-123",
                    "title": "Test Journal",
                    "content": "Test content"
                }
            )

            assert response.status_code == 500

    def test_list_space_journals_success(self):
        """Test listing space journals - success."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.list_space_journals.return_value = {
                "journals": [self.sample_journal_response],
                "total": 1,
                "page": 1,
                "page_size": 20,
                "has_more": False
            }

            response = self.client.get("/api/spaces/space-123/journals")

            assert response.status_code == 200
            data = response.json()
            assert data["total"] == 1
            assert len(data["journals"]) == 1
            assert data["journals"][0]["journalId"] == "journal-123"

    def test_list_space_journals_with_filters(self):
        """Test listing space journals with filters."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.list_space_journals.return_value = {
                "journals": [self.sample_journal_response],
                "total": 1,
                "page": 1,
                "page_size": 20,
                "has_more": False
            }

            response = self.client.get(
                "/api/spaces/space-123/journals?tags=test,daily&authorId=user-123&page=1&pageSize=10"
            )

            assert response.status_code == 200
            mock_service_instance.list_space_journals.assert_called_once_with(
                space_id='space-123',
                user_id='user-123',
                page=1,
                page_size=10,
                tags=['test', 'daily'],
                author_id='user-123'
            )

    def test_list_space_journals_space_not_found(self):
        """Test listing space journals - space not found."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.list_space_journals.side_effect = SpaceNotFoundError("Space not found")

            response = self.client.get("/api/spaces/space-456/journals")

            assert response.status_code == 404

    def test_list_space_journals_unauthorized(self):
        """Test listing space journals - unauthorized."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.list_space_journals.side_effect = UnauthorizedError("Not authorized")

            response = self.client.get("/api/spaces/space-123/journals")

            assert response.status_code == 403

    def test_list_space_journals_server_error(self):
        """Test listing space journals - server error."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.list_space_journals.side_effect = Exception("Database error")

            response = self.client.get("/api/spaces/space-123/journals")

            assert response.status_code == 500

    def test_get_journal_success(self):
        """Test getting journal - success."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.get_journal_entry.return_value = self.sample_journal_response

            response = self.client.get("/api/spaces/space-123/journals/journal-123")

            assert response.status_code == 200
            data = response.json()
            assert data["journalId"] == "journal-123"
            assert data["title"] == "Test Journal"

    def test_get_journal_not_found(self):
        """Test getting journal - not found."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.get_journal_entry.side_effect = JournalNotFoundError("Journal not found")

            response = self.client.get("/api/spaces/space-123/journals/journal-456")

            assert response.status_code == 404

    def test_get_journal_unauthorized(self):
        """Test getting journal - unauthorized."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.get_journal_entry.side_effect = UnauthorizedError("Not authorized")

            response = self.client.get("/api/spaces/space-123/journals/journal-123")

            assert response.status_code == 403

    def test_get_journal_server_error(self):
        """Test getting journal - server error."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.get_journal_entry.side_effect = Exception("Database error")

            response = self.client.get("/api/spaces/space-123/journals/journal-123")

            assert response.status_code == 500

    def test_update_journal_success(self):
        """Test updating journal - success."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance

            updated_response = self.sample_journal_response.copy()
            updated_response["title"] = "Updated Title"
            mock_service_instance.update_journal_entry.return_value = updated_response

            response = self.client.put(
                "/api/spaces/space-123/journals/journal-123",
                json={
                    "title": "Updated Title",
                    "content": "Updated content"
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert data["title"] == "Updated Title"

    def test_update_journal_not_found(self):
        """Test updating journal - not found."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.update_journal_entry.side_effect = JournalNotFoundError("Journal not found")

            response = self.client.put(
                "/api/spaces/space-123/journals/journal-456",
                json={"title": "Updated Title"}
            )

            assert response.status_code == 404

    def test_update_journal_unauthorized(self):
        """Test updating journal - unauthorized."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.update_journal_entry.side_effect = UnauthorizedError("Not authorized")

            response = self.client.put(
                "/api/spaces/space-123/journals/journal-123",
                json={"title": "Updated Title"}
            )

            assert response.status_code == 403

    def test_update_journal_validation_error(self):
        """Test updating journal - validation error."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.update_journal_entry.side_effect = ValidationError("Invalid data")

            response = self.client.put(
                "/api/spaces/space-123/journals/journal-123",
                json={"title": ""}
            )

            assert response.status_code == 422

    def test_update_journal_server_error(self):
        """Test updating journal - server error."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.update_journal_entry.side_effect = Exception("Database error")

            response = self.client.put(
                "/api/spaces/space-123/journals/journal-123",
                json={"title": "Updated Title"}
            )

            assert response.status_code == 500

    def test_delete_journal_success(self):
        """Test deleting journal - success."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.delete_journal_entry.return_value = True

            response = self.client.delete("/api/spaces/space-123/journals/journal-123")

            assert response.status_code == 200
            data = response.json()
            assert "deleted successfully" in data["message"]

    def test_delete_journal_not_found(self):
        """Test deleting journal - not found."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.delete_journal_entry.side_effect = JournalNotFoundError("Journal not found")

            response = self.client.delete("/api/spaces/space-123/journals/journal-456")

            assert response.status_code == 404

    def test_delete_journal_unauthorized(self):
        """Test deleting journal - unauthorized."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.delete_journal_entry.side_effect = UnauthorizedError("Not authorized")

            response = self.client.delete("/api/spaces/space-123/journals/journal-123")

            assert response.status_code == 403

    def test_delete_journal_server_error(self):
        """Test deleting journal - server error."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.delete_journal_entry.side_effect = Exception("Database error")

            response = self.client.delete("/api/spaces/space-123/journals/journal-123")

            assert response.status_code == 500

    def test_list_user_journals_success(self):
        """Test listing user journals - success."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.list_user_journals.return_value = {
                "journals": [self.sample_journal_response],
                "total": 1,
                "page": 1,
                "page_size": 20,
                "has_more": False
            }

            response = self.client.get("/api/users/me/journals")

            assert response.status_code == 200
            data = response.json()
            assert data["total"] == 1
            assert len(data["journals"]) == 1

    def test_list_user_journals_with_pagination(self):
        """Test listing user journals with pagination."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.list_user_journals.return_value = {
                "journals": [self.sample_journal_response],
                "total": 25,
                "page": 2,
                "page_size": 10,
                "has_more": True
            }

            response = self.client.get("/api/users/me/journals?page=2&pageSize=10")

            assert response.status_code == 200
            data = response.json()
            assert data["page"] == 2
            assert data["pageSize"] == 10
            assert data["hasMore"] is True

            mock_service_instance.list_user_journals.assert_called_once_with(
                user_id='user-123',
                page=2,
                page_size=10
            )

    def test_list_user_journals_server_error(self):
        """Test listing user journals - server error."""
        with patch('app.api.routes.journals.JournalService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.list_user_journals.side_effect = Exception("Database error")

            response = self.client.get("/api/users/me/journals")

            assert response.status_code == 500
