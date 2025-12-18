"""
Integration tests for Search API.
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient

from app.main import app
from app.core.dependencies import get_current_user


def mock_get_current_user():
    """Mock current user for testing."""
    return {"sub": "user-123", "email": "test@example.com"}


@pytest.fixture
def client():
    """Create test client with mocked auth."""
    app.dependency_overrides[get_current_user] = mock_get_current_user
    yield TestClient(app)
    app.dependency_overrides.clear()


class TestSearchAPI:
    """Tests for search API endpoint."""

    def test_search_space_not_found(self, client):
        """Test search with non-existent space."""
        with patch("app.api.routes.search.SpaceService") as mock_service:
            mock_service.return_value.get_space.return_value = None

            response = client.get(
                "/api/spaces/nonexistent/search",
                params={"q": "test query"},
            )

            assert response.status_code == 404

    def test_search_unauthorized(self, client):
        """Test search when user is not a member."""
        with patch("app.api.routes.search.SpaceService") as mock_service:
            mock_service.return_value.get_space.return_value = {"space_id": "space-123"}
            mock_service.return_value.is_space_member.return_value = False

            response = client.get(
                "/api/spaces/space-123/search",
                params={"q": "test query"},
            )

            assert response.status_code == 403

    def test_search_success(self, client):
        """Test successful search."""
        from app.services.vector_store.base import SearchResult

        with patch("app.api.routes.search.SpaceService") as mock_space_service:
            mock_space_service.return_value.get_space.return_value = {"space_id": "space-123"}
            mock_space_service.return_value.is_space_member.return_value = True

            with patch("app.api.routes.search.get_journal_indexer") as mock_indexer:
                mock_indexer.return_value.search = AsyncMock(
                    return_value=[
                        SearchResult(
                            id="journal-1",
                            score=0.95,
                            metadata={
                                "space_id": "space-123",
                                "user_id": "user-123",
                                "template_id": "daily",
                                "created_at": "2024-01-01T00:00:00Z",
                            },
                        ),
                        SearchResult(
                            id="journal-2",
                            score=0.85,
                            metadata={"space_id": "space-123"},
                        ),
                    ]
                )

                response = client.get(
                    "/api/spaces/space-123/search",
                    params={"q": "test query", "topK": 10},
                )

                assert response.status_code == 200
                data = response.json()
                assert data["query"] == "test query"
                assert len(data["results"]) == 2
                assert data["results"][0]["journalId"] == "journal-1"
                assert data["results"][0]["score"] == 0.95
                assert data["total"] == 2

    def test_search_with_filters(self, client):
        """Test search with template and framework filters."""
        with patch("app.api.routes.search.SpaceService") as mock_space_service:
            mock_space_service.return_value.get_space.return_value = {"space_id": "space-123"}
            mock_space_service.return_value.is_space_member.return_value = True

            with patch("app.api.routes.search.get_journal_indexer") as mock_indexer:
                mock_indexer.return_value.search = AsyncMock(return_value=[])

                response = client.get(
                    "/api/spaces/space-123/search",
                    params={
                        "q": "test",
                        "templateId": "daily-reflection",
                        "frameworkId": "charter",
                    },
                )

                assert response.status_code == 200
                # Verify filters were passed to indexer
                mock_indexer.return_value.search.assert_called_once()
                call_kwargs = mock_indexer.return_value.search.call_args[1]
                assert call_kwargs["template_id"] == "daily-reflection"
                assert call_kwargs["framework_id"] == "charter"

    def test_search_internal_error(self, client):
        """Test search with internal error."""
        with patch("app.api.routes.search.SpaceService") as mock_space_service:
            mock_space_service.return_value.get_space.return_value = {"space_id": "space-123"}
            mock_space_service.return_value.is_space_member.return_value = True

            with patch("app.api.routes.search.get_journal_indexer") as mock_indexer:
                mock_indexer.return_value.search = AsyncMock(
                    side_effect=Exception("Database error")
                )

                response = client.get(
                    "/api/spaces/space-123/search",
                    params={"q": "test"},
                )

                assert response.status_code == 500
                assert "Search failed" in response.json()["detail"]
