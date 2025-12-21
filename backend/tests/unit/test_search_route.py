"""
Tests for Search API route.

Tests the semantic search endpoint with section-level search.
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI

from app.api.routes.search import router, SearchResult, SearchResponse
from app.services.vector_store.base import SectionSearchResult
from app.services.exceptions import SpaceNotFoundError, UnauthorizedError


@pytest.fixture
def app():
    """Create a test FastAPI app."""
    app = FastAPI()
    app.include_router(router)
    return app


@pytest.fixture
def client(app):
    """Create a test client."""
    return TestClient(app)


@pytest.fixture
def mock_current_user():
    """Mock the current user dependency."""
    return {"sub": "user-123", "email": "test@example.com"}


@pytest.fixture
def mock_space_service():
    """Create a mock space service."""
    with patch("app.api.routes.search.SpaceService") as mock:
        service = Mock()
        mock.return_value = service
        yield service


@pytest.fixture
def mock_journal_indexer():
    """Create a mock journal indexer."""
    with patch("app.api.routes.search.get_journal_indexer") as mock:
        indexer = Mock()
        indexer.search_space = AsyncMock(return_value=[])
        mock.return_value = indexer
        yield indexer


class TestSearchResult:
    """Tests for SearchResult model."""

    def test_create_with_all_fields(self):
        """Test creating a SearchResult with all fields."""
        item = SearchResult(
            journalId="j123",
            title="Test Journal",
            sectionTitle="Express",
            sectionIndex=0,
            score=0.95,
            excerpt="This is the matched section content",
            userId="user-123",
            templateId="daily-reflection",
            frameworkId="express-examine-evolve",
            createdAt="2024-01-01T00:00:00Z",
        )
        assert item.journal_id == "j123"
        assert item.title == "Test Journal"
        assert item.section_title == "Express"
        assert item.section_index == 0
        assert item.score == 0.95
        assert item.excerpt == "This is the matched section content"

    def test_create_with_minimal_fields(self):
        """Test creating a SearchResult with minimal fields."""
        item = SearchResult(journalId="j123", title="Test", score=0.5)
        assert item.journal_id == "j123"
        assert item.title == "Test"
        assert item.score == 0.5
        assert item.section_title == ""
        assert item.section_index == 0
        assert item.excerpt == ""

    def test_alias_serialization(self):
        """Test that aliases are used in serialization."""
        item = SearchResult(
            journalId="j123",
            title="Test",
            sectionTitle="Examine",
            score=0.9
        )
        data = item.model_dump(by_alias=True)
        assert "journalId" in data
        assert data["journalId"] == "j123"
        assert "sectionTitle" in data
        assert data["sectionTitle"] == "Examine"


class TestSearchResponse:
    """Tests for SearchResponse model."""

    def test_create_response(self):
        """Test creating a SearchResponse."""
        items = [
            SearchResult(journalId="j1", title="Journal 1", score=0.9),
            SearchResult(journalId="j2", title="Journal 2", score=0.8),
        ]
        response = SearchResponse(
            query="test query",
            spaceId="space-abc",
            results=items,
            count=2
        )
        assert response.query == "test query"
        assert response.space_id == "space-abc"
        assert len(response.results) == 2
        assert response.count == 2

    def test_empty_results(self):
        """Test response with no results."""
        response = SearchResponse(
            query="no matches",
            spaceId="space-abc",
            results=[],
            count=0
        )
        assert response.results == []
        assert response.count == 0


class TestSearchEndpoint:
    """Tests for the search endpoint."""

    def test_search_result_from_section_search_result(self):
        """Test converting SectionSearchResult to SearchResult."""
        section_result = SectionSearchResult(
            id="j123_section_0",
            score=0.95,
            journal_id="j123",
            section_index=0,
            section_title="Express",
            excerpt="This is the matched content",
            metadata={
                "journalTitle": "My Journal",
                "userId": "user-123",
                "templateId": "daily",
                "frameworkId": "express-examine-evolve",
                "createdAt": "2024-01-01T00:00:00Z",
            },
        )

        item = SearchResult(
            journalId=section_result.journal_id,
            title=section_result.metadata.get("journalTitle", "Untitled"),
            sectionTitle=section_result.section_title,
            sectionIndex=section_result.section_index,
            score=section_result.score,
            excerpt=section_result.excerpt,
            userId=section_result.metadata.get("userId"),
            templateId=section_result.metadata.get("templateId"),
            frameworkId=section_result.metadata.get("frameworkId"),
            createdAt=section_result.metadata.get("createdAt"),
        )

        assert item.journal_id == "j123"
        assert item.title == "My Journal"
        assert item.section_title == "Express"
        assert item.section_index == 0
        assert item.score == 0.95
        assert item.excerpt == "This is the matched content"
        assert item.user_id == "user-123"
        assert item.template_id == "daily"

    def test_space_not_found_error_handling(self):
        """Test that SpaceNotFoundError is handled correctly."""
        from fastapi import HTTPException, status

        error = SpaceNotFoundError("Space not found")
        http_exc = HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
        assert http_exc.status_code == 404
        assert "Space not found" in http_exc.detail

    def test_unauthorized_error_handling(self):
        """Test that UnauthorizedError is handled correctly."""
        from fastapi import HTTPException, status

        error = UnauthorizedError("Not a member")
        http_exc = HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error))
        assert http_exc.status_code == 403
        assert "Not a member" in http_exc.detail


class TestSearchIntegration:
    """Integration-style tests for search functionality."""

    @pytest.mark.asyncio
    async def test_search_space_with_filters(self):
        """Test that search_space filters are passed correctly."""
        from app.services.journal_indexer import JournalIndexer, reset_journal_indexer
        from app.services.vector_store.base import VectorStore

        reset_journal_indexer()

        # Create mock store
        mock_store = Mock(spec=VectorStore)
        mock_store.search = AsyncMock(return_value=[])

        indexer = JournalIndexer()
        indexer.vector_store = mock_store  # Inject mock after creation

        await indexer.search_space(
            query="test",
            space_id="space-abc",
            top_k=5,
            template_id="daily-reflection",
            framework_id="charter",
            user_id="user-123",
        )

        # Verify filters were passed
        mock_store.search.assert_called_once()
        call_kwargs = mock_store.search.call_args[1]
        assert call_kwargs["query"] == "test"
        assert call_kwargs["namespace"] == "space_space-abc"
        assert call_kwargs["top_k"] == 5
        assert call_kwargs["filter"] is not None

    @pytest.mark.asyncio
    async def test_search_space_without_filters(self):
        """Test search_space without optional filters."""
        from app.services.journal_indexer import JournalIndexer, reset_journal_indexer
        from app.services.vector_store.base import VectorStore

        reset_journal_indexer()

        mock_store = Mock(spec=VectorStore)
        mock_store.search = AsyncMock(return_value=[])

        indexer = JournalIndexer()
        indexer.vector_store = mock_store  # Inject mock after creation

        await indexer.search_space(
            query="test query",
            space_id="space-abc",
        )

        call_kwargs = mock_store.search.call_args[1]
        assert call_kwargs["filter"] is None
