"""
Unit tests for journal theme filter endpoints.
"""
import os

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
os.environ.setdefault("DYNAMODB_TABLE", "lifestyle-spaces-test")
os.environ.setdefault("CORS_ORIGINS", '["*"]')
os.environ.setdefault("AWS_REGION", "us-east-1")
os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")
os.environ.setdefault("ENVIRONMENT", "test")

from unittest.mock import Mock, patch
from fastapi.testclient import TestClient


class TestGetSpaceThemes:
    """Tests for GET /api/spaces/{space_id}/journals/themes endpoint."""

    def setup_method(self):
        """Set up test client and mocks."""
        from app.main import app
        from app.core.dependencies import get_current_user

        self.app = app
        self.client = TestClient(app)

        # Mock user for authenticated requests
        self.mock_user = {"sub": "user-123", "email": "test@example.com", "username": "testuser"}

        # Override auth dependency
        def override_get_current_user():
            return self.mock_user

        app.dependency_overrides[get_current_user] = override_get_current_user

        # Sample journals with AI metadata
        self.mock_journals_response = {
            "journals": [
                {
                    "journal_id": "journal-1",
                    "space_id": "space-123",
                    "user_id": "user-123",
                    "title": "Morning Reflection",
                    "content": "Today was productive...",
                    "tags": [],
                    "emotions": [],
                    "created_at": "2024-01-15T10:00:00Z",
                    "updated_at": "2024-01-15T10:00:00Z",
                    "word_count": 100,
                    "is_pinned": False,
                    "ai_metadata": {
                        "synopsis": "A productive morning reflection",
                        "themes": ["productivity", "gratitude", "morning routine"],
                        "insights": ["Focus leads to results"],
                        "sentiment": "positive",
                    },
                },
                {
                    "journal_id": "journal-2",
                    "space_id": "space-123",
                    "user_id": "user-123",
                    "title": "Evening Review",
                    "content": "Reflecting on challenges...",
                    "tags": [],
                    "emotions": [],
                    "created_at": "2024-01-16T20:00:00Z",
                    "updated_at": "2024-01-16T20:00:00Z",
                    "word_count": 150,
                    "is_pinned": False,
                    "ai_metadata": {
                        "synopsis": "Evening reflection on challenges",
                        "themes": ["challenges", "growth", "productivity"],
                        "insights": ["Growth comes from struggle"],
                        "sentiment": "reflective",
                    },
                },
                {
                    "journal_id": "journal-3",
                    "space_id": "space-123",
                    "user_id": "user-123",
                    "title": "No Metadata Journal",
                    "content": "Simple journal without AI analysis...",
                    "tags": [],
                    "emotions": [],
                    "created_at": "2024-01-17T12:00:00Z",
                    "updated_at": "2024-01-17T12:00:00Z",
                    "word_count": 50,
                    "is_pinned": False,
                    "ai_metadata": None,
                },
            ],
            "total": 3,
            "page": 1,
            "page_size": 1000,
            "has_more": False,
        }

    def teardown_method(self):
        """Clean up dependency overrides."""
        self.app.dependency_overrides.clear()

    def test_get_themes_success(self):
        """Test successful retrieval of themes."""
        with patch("app.api.routes.journals.JournalService") as mock_service_class:
            mock_service = Mock()
            mock_service.list_space_journals.return_value = self.mock_journals_response
            mock_service_class.return_value = mock_service

            response = self.client.get("/api/spaces/space-123/journals/themes")

            assert response.status_code == 200
            data = response.json()
            assert "themes" in data
            assert "total" in data

            # productivity appears in 2 journals
            themes_dict = {t["theme"]: t["count"] for t in data["themes"]}
            assert "productivity" in themes_dict
            assert themes_dict["productivity"] == 2

            # gratitude appears in 1 journal
            assert "gratitude" in themes_dict
            assert themes_dict["gratitude"] == 1

    def test_get_themes_empty_space(self):
        """Test themes endpoint with no journals."""
        with patch("app.api.routes.journals.JournalService") as mock_service_class:
            mock_service = Mock()
            mock_service.list_space_journals.return_value = {
                "journals": [],
                "total": 0,
                "page": 1,
                "page_size": 1000,
                "has_more": False,
            }
            mock_service_class.return_value = mock_service

            response = self.client.get("/api/spaces/space-123/journals/themes")

            assert response.status_code == 200
            data = response.json()
            assert data["themes"] == []
            assert data["total"] == 0

    def test_get_themes_case_insensitive(self):
        """Test that themes are normalized to lowercase."""
        with patch("app.api.routes.journals.JournalService") as mock_service_class:
            mock_service = Mock()
            mock_service.list_space_journals.return_value = {
                "journals": [
                    {
                        "journal_id": "j1",
                        "space_id": "space-123",
                        "user_id": "user-123",
                        "title": "Test",
                        "content": "Test",
                        "tags": [],
                        "emotions": [],
                        "created_at": "2024-01-15T10:00:00Z",
                        "updated_at": "2024-01-15T10:00:00Z",
                        "word_count": 10,
                        "is_pinned": False,
                        "ai_metadata": {"themes": ["Gratitude", "GRATITUDE", "gratitude"]},
                    },
                ],
                "total": 1,
                "page": 1,
                "page_size": 1000,
                "has_more": False,
            }
            mock_service_class.return_value = mock_service

            response = self.client.get("/api/spaces/space-123/journals/themes")

            assert response.status_code == 200
            data = response.json()
            # All variations should be counted as one theme
            themes_dict = {t["theme"]: t["count"] for t in data["themes"]}
            assert "gratitude" in themes_dict
            assert themes_dict["gratitude"] == 3  # Each occurrence counted


class TestGetJournalsByTheme:
    """Tests for GET /api/spaces/{space_id}/journals/by-theme/{theme} endpoint."""

    def setup_method(self):
        """Set up test client and mocks."""
        from app.main import app
        from app.core.dependencies import get_current_user

        self.app = app
        self.client = TestClient(app)

        # Mock user for authenticated requests
        self.mock_user = {"sub": "user-123", "email": "test@example.com", "username": "testuser"}

        # Override auth dependency
        def override_get_current_user():
            return self.mock_user

        app.dependency_overrides[get_current_user] = override_get_current_user

        # Sample journals with AI metadata
        self.mock_journals_response = {
            "journals": [
                {
                    "journal_id": "journal-1",
                    "space_id": "space-123",
                    "user_id": "user-123",
                    "title": "Morning Reflection",
                    "content": "Today was productive...",
                    "tags": [],
                    "emotions": [],
                    "created_at": "2024-01-15T10:00:00Z",
                    "updated_at": "2024-01-15T10:00:00Z",
                    "word_count": 100,
                    "is_pinned": False,
                    "ai_metadata": {
                        "synopsis": "A productive morning reflection",
                        "themes": ["productivity", "gratitude", "morning routine"],
                        "insights": ["Focus leads to results"],
                        "sentiment": "positive",
                    },
                },
                {
                    "journal_id": "journal-2",
                    "space_id": "space-123",
                    "user_id": "user-123",
                    "title": "Evening Review",
                    "content": "Reflecting on challenges...",
                    "tags": [],
                    "emotions": [],
                    "created_at": "2024-01-16T20:00:00Z",
                    "updated_at": "2024-01-16T20:00:00Z",
                    "word_count": 150,
                    "is_pinned": False,
                    "ai_metadata": {
                        "synopsis": "Evening reflection on challenges",
                        "themes": ["challenges", "growth", "productivity"],
                        "insights": ["Growth comes from struggle"],
                        "sentiment": "reflective",
                    },
                },
                {
                    "journal_id": "journal-3",
                    "space_id": "space-123",
                    "user_id": "user-123",
                    "title": "No Metadata Journal",
                    "content": "Simple journal without AI analysis...",
                    "tags": [],
                    "emotions": [],
                    "created_at": "2024-01-17T12:00:00Z",
                    "updated_at": "2024-01-17T12:00:00Z",
                    "word_count": 50,
                    "is_pinned": False,
                    "ai_metadata": None,
                },
            ],
            "total": 3,
            "page": 1,
            "page_size": 1000,
            "has_more": False,
        }

    def teardown_method(self):
        """Clean up dependency overrides."""
        self.app.dependency_overrides.clear()

    def test_get_journals_by_theme_success(self):
        """Test successful retrieval of journals by theme."""
        with patch("app.api.routes.journals.JournalService") as mock_service_class:
            mock_service = Mock()
            mock_service.list_space_journals.return_value = self.mock_journals_response
            mock_service_class.return_value = mock_service

            response = self.client.get("/api/spaces/space-123/journals/by-theme/productivity")

            assert response.status_code == 200
            data = response.json()
            assert data["theme"] == "productivity"
            assert len(data["journals"]) == 2
            assert data["total"] == 2

    def test_get_journals_by_theme_case_insensitive(self):
        """Test case-insensitive theme matching."""
        with patch("app.api.routes.journals.JournalService") as mock_service_class:
            mock_service = Mock()
            mock_service.list_space_journals.return_value = self.mock_journals_response
            mock_service_class.return_value = mock_service

            response = self.client.get("/api/spaces/space-123/journals/by-theme/PRODUCTIVITY")

            assert response.status_code == 200
            data = response.json()
            assert len(data["journals"]) == 2

    def test_get_journals_by_theme_no_matches(self):
        """Test theme with no matching journals."""
        with patch("app.api.routes.journals.JournalService") as mock_service_class:
            mock_service = Mock()
            mock_service.list_space_journals.return_value = self.mock_journals_response
            mock_service_class.return_value = mock_service

            response = self.client.get("/api/spaces/space-123/journals/by-theme/nonexistent-theme")

            assert response.status_code == 200
            data = response.json()
            assert data["theme"] == "nonexistent-theme"
            assert len(data["journals"]) == 0
            assert data["total"] == 0

    def test_get_journals_by_theme_with_limit(self):
        """Test limit parameter."""
        with patch("app.api.routes.journals.JournalService") as mock_service_class:
            mock_service = Mock()
            mock_service.list_space_journals.return_value = self.mock_journals_response
            mock_service_class.return_value = mock_service

            response = self.client.get("/api/spaces/space-123/journals/by-theme/productivity?limit=1")

            assert response.status_code == 200
            data = response.json()
            assert len(data["journals"]) == 1
            assert data["total"] == 2  # Total matching is still 2

    def test_get_journals_by_theme_sorted_by_date(self):
        """Test that journals are sorted by updated_at descending."""
        with patch("app.api.routes.journals.JournalService") as mock_service_class:
            mock_service = Mock()
            mock_service.list_space_journals.return_value = self.mock_journals_response
            mock_service_class.return_value = mock_service

            response = self.client.get("/api/spaces/space-123/journals/by-theme/productivity")

            assert response.status_code == 200
            data = response.json()
            journals = data["journals"]
            # journal-2 has later date than journal-1
            assert journals[0]["journalId"] == "journal-2"
            assert journals[1]["journalId"] == "journal-1"


class TestThemeEndpointErrors:
    """Tests for error handling in theme endpoints."""

    def setup_method(self):
        """Set up test client and mocks."""
        from app.main import app
        from app.core.dependencies import get_current_user

        self.app = app
        self.client = TestClient(app)

        # Mock user for authenticated requests
        self.mock_user = {"sub": "user-123", "email": "test@example.com", "username": "testuser"}

        # Override auth dependency
        def override_get_current_user():
            return self.mock_user

        app.dependency_overrides[get_current_user] = override_get_current_user

    def teardown_method(self):
        """Clean up dependency overrides."""
        self.app.dependency_overrides.clear()

    def test_get_themes_space_not_found(self):
        """Test themes endpoint when space not found."""
        from app.services.exceptions import SpaceNotFoundError

        with patch("app.api.routes.journals.JournalService") as mock_service_class:
            mock_service = Mock()
            mock_service.list_space_journals.side_effect = SpaceNotFoundError("Space not found")
            mock_service_class.return_value = mock_service

            response = self.client.get("/api/spaces/nonexistent/journals/themes")

            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()

    def test_get_themes_unauthorized(self):
        """Test themes endpoint when user is unauthorized."""
        from app.services.exceptions import UnauthorizedError

        with patch("app.api.routes.journals.JournalService") as mock_service_class:
            mock_service = Mock()
            mock_service.list_space_journals.side_effect = UnauthorizedError("Not authorized")
            mock_service_class.return_value = mock_service

            response = self.client.get("/api/spaces/space-123/journals/themes")

            assert response.status_code == 403

    def test_get_themes_server_error(self):
        """Test themes endpoint when server error occurs."""
        with patch("app.api.routes.journals.JournalService") as mock_service_class:
            mock_service = Mock()
            mock_service.list_space_journals.side_effect = Exception("Database error")
            mock_service_class.return_value = mock_service

            response = self.client.get("/api/spaces/space-123/journals/themes")

            assert response.status_code == 500

    def test_get_journals_by_theme_space_not_found(self):
        """Test by-theme endpoint when space not found."""
        from app.services.exceptions import SpaceNotFoundError

        with patch("app.api.routes.journals.JournalService") as mock_service_class:
            mock_service = Mock()
            mock_service.list_space_journals.side_effect = SpaceNotFoundError("Space not found")
            mock_service_class.return_value = mock_service

            response = self.client.get("/api/spaces/nonexistent/journals/by-theme/test")

            assert response.status_code == 404

    def test_get_journals_by_theme_unauthorized(self):
        """Test by-theme endpoint when user is unauthorized."""
        from app.services.exceptions import UnauthorizedError

        with patch("app.api.routes.journals.JournalService") as mock_service_class:
            mock_service = Mock()
            mock_service.list_space_journals.side_effect = UnauthorizedError("Not authorized")
            mock_service_class.return_value = mock_service

            response = self.client.get("/api/spaces/space-123/journals/by-theme/test")

            assert response.status_code == 403

    def test_get_journals_by_theme_server_error(self):
        """Test by-theme endpoint when server error occurs."""
        with patch("app.api.routes.journals.JournalService") as mock_service_class:
            mock_service = Mock()
            mock_service.list_space_journals.side_effect = Exception("Database error")
            mock_service_class.return_value = mock_service

            response = self.client.get("/api/spaces/space-123/journals/by-theme/test")

            assert response.status_code == 500
