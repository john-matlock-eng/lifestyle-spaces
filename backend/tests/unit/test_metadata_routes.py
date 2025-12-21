"""
Unit tests for AI Metadata API Routes
"""
import pytest
from datetime import datetime, timezone
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import FastAPI

from app.api.routes.metadata import router, get_journal_service, _get_user_id
from app.core.dependencies import get_current_user
from app.models.ai_metadata import JournalAIMetadata, GenerateMetadataResponse


class TestGetUserIdHelper:
    """Tests for _get_user_id helper function."""

    def test_get_user_id_from_sub(self):
        """Test extracting user ID from 'sub' claim."""
        user = {"sub": "user-123", "email": "test@example.com"}
        assert _get_user_id(user) == "user-123"

    def test_get_user_id_from_userId(self):
        """Test extracting user ID from 'userId' field."""
        user = {"userId": "user-456", "email": "test@example.com"}
        assert _get_user_id(user) == "user-456"

    def test_get_user_id_prefers_sub(self):
        """Test that 'sub' takes precedence over 'userId'."""
        user = {"sub": "user-from-sub", "userId": "user-from-id"}
        assert _get_user_id(user) == "user-from-sub"


@pytest.fixture
def mock_user():
    """Create mock user dict (matches what get_current_user returns)."""
    return {
        "sub": "user-123",
        "userId": "user-123",
        "email": "test@example.com",
        "username": "testuser",
        "display_name": "Test User",
    }


@pytest.fixture
def mock_journal():
    """Create mock journal data."""
    return {
        "journal_id": "journal-123",
        "space_id": "space-123",
        "user_id": "user-123",
        "title": "Test Journal",
        "content": "This is a test journal with enough content. " * 10,
        "content_tiptap": None,
        "template_id": None,
        "ai_metadata": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


@pytest.fixture
def mock_metadata():
    """Create mock AI metadata."""
    return JournalAIMetadata(
        synopsis="This is a test synopsis about the journal entry.",
        themes=["testing", "reflection"],
        insights=["Key insight 1"],
        sentiment="neutral",
        emotionalTone="calm and focused",
        generatedAt=datetime.now(timezone.utc),
        modelUsed="claude-sonnet-4-20250514"
    )


@pytest.fixture
def mock_journal_service():
    """Create mock journal service."""
    return Mock()


@pytest.fixture
def app(mock_user, mock_journal_service):
    """Create test FastAPI app with metadata router and overridden dependencies."""
    test_app = FastAPI()
    test_app.include_router(router)

    # Override dependencies
    test_app.dependency_overrides[get_current_user] = lambda: mock_user
    test_app.dependency_overrides[get_journal_service] = lambda: mock_journal_service

    return test_app


@pytest.fixture
def client(app):
    """Create test client."""
    return TestClient(app)


class TestGenerateJournalMetadata:
    """Tests for POST /metadata/journals/{journal_id}/generate."""

    @patch("app.api.routes.metadata.get_metadata_generator")
    def test_generate_metadata_success(
        self, mock_get_generator, client, mock_journal_service, mock_journal, mock_metadata
    ):
        """Test successful metadata generation."""
        # Setup mocks
        mock_journal_service.get_journal_by_id.return_value = mock_journal
        mock_journal_service._update_ai_metadata.return_value = True

        mock_generator = Mock()
        mock_generator.generate_metadata = AsyncMock(return_value=mock_metadata)
        mock_get_generator.return_value = mock_generator

        # Make request
        response = client.post("/metadata/journals/journal-123/generate")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["journalId"] == "journal-123"
        assert data["wasCached"] is False
        assert "synopsis" in data["metadata"]

    def test_generate_metadata_returns_cached(
        self, client, mock_journal_service, mock_journal, mock_metadata
    ):
        """Test that existing metadata is returned when not forcing regeneration."""
        # Setup mock with existing metadata
        mock_journal["ai_metadata"] = mock_metadata.model_dump(by_alias=True)
        mock_journal_service.get_journal_by_id.return_value = mock_journal

        # Make request
        response = client.post("/metadata/journals/journal-123/generate")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["wasCached"] is True

    @patch("app.api.routes.metadata.get_metadata_generator")
    def test_generate_metadata_force_regenerate(
        self, mock_get_generator, client, mock_journal_service, mock_journal, mock_metadata
    ):
        """Test force regeneration of metadata."""
        # Setup mocks with existing metadata
        mock_journal["ai_metadata"] = {"synopsis": "old synopsis", "themes": ["old"], "insights": [], "sentiment": "neutral"}
        mock_journal_service.get_journal_by_id.return_value = mock_journal
        mock_journal_service._update_ai_metadata.return_value = True

        mock_generator = Mock()
        mock_generator.generate_metadata = AsyncMock(return_value=mock_metadata)
        mock_get_generator.return_value = mock_generator

        # Make request with force regenerate
        response = client.post(
            "/metadata/journals/journal-123/generate",
            json={"forceRegenerate": True}
        )

        # Assert - should generate new metadata
        assert response.status_code == 200
        data = response.json()
        assert data["wasCached"] is False

    def test_generate_metadata_journal_not_found(
        self, client, mock_journal_service
    ):
        """Test 404 when journal not found."""
        mock_journal_service.get_journal_by_id.return_value = None

        response = client.post("/metadata/journals/nonexistent/generate")

        assert response.status_code == 404


class TestGetJournalMetadata:
    """Tests for GET /metadata/journals/{journal_id}."""

    def test_get_metadata_success(
        self, client, mock_journal_service, mock_journal, mock_metadata
    ):
        """Test successful metadata retrieval."""
        mock_journal["ai_metadata"] = mock_metadata.model_dump(by_alias=True)
        mock_journal_service.get_journal_by_id.return_value = mock_journal

        response = client.get("/metadata/journals/journal-123")

        assert response.status_code == 200
        data = response.json()
        assert data["synopsis"] == mock_metadata.synopsis

    def test_get_metadata_not_exists(
        self, client, mock_journal_service, mock_journal
    ):
        """Test when metadata doesn't exist."""
        mock_journal["ai_metadata"] = None
        mock_journal_service.get_journal_by_id.return_value = mock_journal

        response = client.get("/metadata/journals/journal-123")

        assert response.status_code == 200
        assert response.json() is None

    def test_get_metadata_journal_not_found(
        self, client, mock_journal_service
    ):
        """Test 404 when journal not found."""
        mock_journal_service.get_journal_by_id.return_value = None

        response = client.get("/metadata/journals/nonexistent")

        assert response.status_code == 404


class TestGenerateMetadataErrors:
    """Tests for error handling in metadata generation."""

    @patch("app.api.routes.metadata.get_metadata_generator")
    def test_generate_metadata_value_error(
        self, mock_get_generator, client, mock_journal_service, mock_journal
    ):
        """Test ValueError during metadata generation."""
        mock_journal_service.get_journal_by_id.return_value = mock_journal

        mock_generator = Mock()
        mock_generator.generate_metadata = AsyncMock(
            side_effect=ValueError("API key not configured")
        )
        mock_get_generator.return_value = mock_generator

        response = client.post("/metadata/journals/journal-123/generate")

        assert response.status_code == 500
        assert "Failed to generate metadata" in response.json()["detail"]

    @patch("app.api.routes.metadata.get_metadata_generator")
    def test_generate_metadata_unexpected_error(
        self, mock_get_generator, client, mock_journal_service, mock_journal
    ):
        """Test unexpected error during metadata generation."""
        mock_journal_service.get_journal_by_id.return_value = mock_journal

        mock_generator = Mock()
        mock_generator.generate_metadata = AsyncMock(
            side_effect=RuntimeError("Unexpected error")
        )
        mock_get_generator.return_value = mock_generator

        response = client.post("/metadata/journals/journal-123/generate")

        assert response.status_code == 500
        assert "Failed to generate metadata" in response.json()["detail"]


class TestGenerateSpaceMetadata:
    """Tests for POST /metadata/spaces/{space_id}/generate-all."""

    @patch("app.api.routes.metadata.SpaceService")
    @patch("app.api.routes.metadata.JournalService")
    @patch("app.api.routes.metadata.get_metadata_generator")
    def test_generate_space_metadata_success(
        self, mock_get_generator, mock_journal_service_class, mock_space_service_class,
        client, mock_metadata
    ):
        """Test successful space metadata generation."""
        # Setup space service mock
        mock_space_service = Mock()
        mock_space_service.get_space.return_value = {"space_id": "space-123", "name": "Test Space"}
        mock_space_service_class.return_value = mock_space_service

        # Setup journal service mock
        mock_journal_service = Mock()
        mock_journal_service.get_journals_for_space.return_value = {
            "journals": [
                {
                    "journal_id": "j1",
                    "title": "Journal 1",
                    "content": "Content 1",
                    "ai_metadata": None
                }
            ]
        }
        mock_journal_service._update_ai_metadata.return_value = True
        mock_journal_service_class.return_value = mock_journal_service

        # Setup metadata generator mock
        mock_generator = Mock()
        mock_generator.generate_metadata = AsyncMock(return_value=mock_metadata)
        mock_get_generator.return_value = mock_generator

        response = client.post("/metadata/spaces/space-123/generate-all")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["spaceId"] == "space-123"

    @patch("app.api.routes.metadata.SpaceService")
    def test_generate_space_metadata_space_not_found(
        self, mock_space_service_class, client
    ):
        """Test 404 when space not found."""
        mock_space_service = Mock()
        mock_space_service.get_space.return_value = None
        mock_space_service_class.return_value = mock_space_service

        response = client.post("/metadata/spaces/nonexistent/generate-all")

        assert response.status_code == 404

    @patch("app.api.routes.metadata.SpaceService")
    @patch("app.api.routes.metadata.JournalService")
    @patch("app.api.routes.metadata.get_metadata_generator")
    def test_generate_space_metadata_skips_existing(
        self, mock_get_generator, mock_journal_service_class, mock_space_service_class,
        client, mock_metadata
    ):
        """Test that existing metadata is skipped without force flag."""
        mock_space_service = Mock()
        mock_space_service.get_space.return_value = {"space_id": "space-123"}
        mock_space_service_class.return_value = mock_space_service

        mock_journal_service = Mock()
        mock_journal_service.get_journals_for_space.return_value = {
            "journals": [
                {
                    "journal_id": "j1",
                    "title": "Journal 1",
                    "content": "Content",
                    "ai_metadata": {"synopsis": "existing"}
                }
            ]
        }
        mock_journal_service_class.return_value = mock_journal_service

        mock_generator = Mock()
        mock_get_generator.return_value = mock_generator

        response = client.post("/metadata/spaces/space-123/generate-all")

        assert response.status_code == 200
        data = response.json()
        assert data["skipped"] == 1
        # Generator should not have been called
        mock_generator.generate_metadata.assert_not_called()

    @patch("app.api.routes.metadata.SpaceService")
    @patch("app.api.routes.metadata.JournalService")
    @patch("app.api.routes.metadata.get_metadata_generator")
    def test_generate_space_metadata_handles_failure(
        self, mock_get_generator, mock_journal_service_class, mock_space_service_class,
        client
    ):
        """Test handling of metadata generation failure for individual journals."""
        mock_space_service = Mock()
        mock_space_service.get_space.return_value = {"space_id": "space-123"}
        mock_space_service_class.return_value = mock_space_service

        mock_journal_service = Mock()
        mock_journal_service.get_journals_for_space.return_value = {
            "journals": [
                {"journal_id": "j1", "title": "Journal 1", "content": "Content", "ai_metadata": None}
            ]
        }
        mock_journal_service_class.return_value = mock_journal_service

        mock_generator = Mock()
        mock_generator.generate_metadata = AsyncMock(side_effect=Exception("API error"))
        mock_get_generator.return_value = mock_generator

        response = client.post("/metadata/spaces/space-123/generate-all")

        assert response.status_code == 200
        data = response.json()
        assert data["failed"] == 1
