"""
Unit tests for AI Metadata API Routes
"""
import pytest
from datetime import datetime, timezone
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import FastAPI

from app.api.routes.metadata import router, get_journal_service
from app.core.dependencies import get_current_user
from app.models.ai_metadata import JournalAIMetadata, GenerateMetadataResponse


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
