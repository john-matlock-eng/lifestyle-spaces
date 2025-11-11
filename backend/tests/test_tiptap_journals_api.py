"""
Integration tests for TipTap Journal API endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from app.main import app


class TestTipTapJournalsAPI:
    """Tests for /api/tiptap endpoints."""

    @pytest.fixture
    def test_client(self):
        """Create test client."""
        return TestClient(app)

    @pytest.fixture
    def mock_user(self):
        """Mock authenticated user."""
        return {"sub": "user-123", "email": "test@example.com"}

    @pytest.fixture
    def tiptap_content(self):
        """Sample TipTap JSON content."""
        return {
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "Sample text with ",
                        },
                        {
                            "type": "text",
                            "marks": [
                                {
                                    "type": "highlight",
                                    "attrs": {
                                        "id": "highlight-1",
                                        "color": "#ffeb3b",
                                        "authorId": "user-123",
                                        "commentCount": 0,
                                    },
                                }
                            ],
                            "text": "highlighted content",
                        },
                    ],
                }
            ],
        }

    def test_update_tiptap_journal_success(
        self, test_client, mock_user, tiptap_content
    ):
        """Test PUT /api/tiptap/spaces/{space_id}/journals/{journal_id} - success."""
        with patch("app.core.security.decode_token", return_value=mock_user):
            with patch(
                "app.core.dependencies.UserProfileService"
            ) as mock_profile:
                mock_profile.return_value.get_or_create_user_profile.return_value = {
                    "user_id": "user-123"
                }
                with patch(
                    "app.api.routes.tiptap_journals.JournalService"
                ) as mock_journal_service, patch(
                    "app.api.routes.tiptap_journals.HighlightService"
                ) as mock_highlight_service, patch(
                    "app.api.routes.tiptap_journals.get_websocket_manager"
                ) as mock_ws, patch(
                    "app.api.routes.tiptap_journals.extract_highlights_from_tiptap"
                ) as mock_extract:

                    # Mock highlight extraction
                    mock_extract.return_value = []

                    # Mock journal service
                    mock_journal_service.return_value.update_journal_entry.return_value = {
                        "journal_id": "journal-123",
                        "space_id": "space-123",
                        "user_id": "user-123",
                        "title": "Test Journal",
                        "content": "TipTap content",
                        "content_tiptap": tiptap_content,
                        "created_at": "2024-01-01T00:00:00Z",
                        "updated_at": "2024-01-01T00:00:00Z",
                    }

                    # Mock WebSocket manager
                    mock_ws_manager = AsyncMock()
                    mock_ws.return_value = mock_ws_manager

                    response = test_client.put(
                        "/api/tiptap/spaces/space-123/journals/journal-123",
                        json=tiptap_content,
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code == 200
                    data = response.json()
                    assert data["journalId"] == "journal-123"
                    assert data["spaceId"] == "space-123"

    def test_sync_highlight_comment_count_success(self, test_client, mock_user):
        """Test POST sync comment count - success."""
        with patch("app.core.security.decode_token", return_value=mock_user):
            with patch(
                "app.core.dependencies.UserProfileService"
            ) as mock_profile:
                mock_profile.return_value.get_or_create_user_profile.return_value = {
                    "user_id": "user-123"
                }
                with patch(
                    "app.api.routes.tiptap_journals.JournalService"
                ) as mock_journal_service, patch(
                    "app.api.routes.tiptap_journals.CommentService"
                ) as mock_comment_service, patch(
                    "app.api.routes.tiptap_journals.get_websocket_manager"
                ) as mock_ws, patch(
                    "app.api.routes.tiptap_journals.update_highlight_comment_count_in_tiptap"
                ) as mock_update:

                    # Mock journal retrieval
                    mock_journal_service.return_value.get_journal_entry.return_value = {
                        "content_tiptap": {"type": "doc", "content": []},
                        "journal_id": "journal-123",
                    }

                    # Mock comment service
                    comment_service_instance = AsyncMock()
                    comment_service_instance.get_comments_for_highlight.return_value = [
                        {"id": "comment-1"}
                    ]
                    mock_comment_service.return_value = comment_service_instance

                    # Mock content update
                    mock_update.return_value = {"type": "doc", "content": []}

                    # Mock journal update
                    mock_journal_service.return_value.update_journal_entry.return_value = {
                        "journal_id": "journal-123"
                    }

                    # Mock WebSocket
                    mock_ws_manager = AsyncMock()
                    mock_ws.return_value = mock_ws_manager

                    response = test_client.post(
                        "/api/tiptap/spaces/space-123/journals/journal-123/highlights/highlight-1/comments/sync",
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code == 200
                    data = response.json()
                    assert data["success"] is True
                    assert data["comment_count"] == 1

    def test_sync_highlight_journal_not_found(self, test_client, mock_user):
        """Test POST sync comment count - journal not found."""
        with patch("app.core.security.decode_token", return_value=mock_user):
            with patch(
                "app.core.dependencies.UserProfileService"
            ) as mock_profile:
                mock_profile.return_value.get_or_create_user_profile.return_value = {
                    "user_id": "user-123"
                }
                with patch(
                    "app.api.routes.tiptap_journals.JournalService"
                ) as mock_journal_service:

                    # Mock journal not found
                    mock_journal_service.return_value.get_journal_entry.return_value = (
                        None
                    )

                    response = test_client.post(
                        "/api/tiptap/spaces/space-123/journals/nonexistent/highlights/highlight-1/comments/sync",
                        headers={"Authorization": "Bearer test-token"},
                    )

                    # Route catches HTTPException and converts to 500
                    assert response.status_code == 500

    def test_delete_highlight_from_tiptap_success(self, test_client, mock_user):
        """Test DELETE highlight from TipTap - success."""
        with patch("app.core.security.decode_token", return_value=mock_user):
            with patch(
                "app.core.dependencies.UserProfileService"
            ) as mock_profile:
                mock_profile.return_value.get_or_create_user_profile.return_value = {
                    "user_id": "user-123"
                }
                with patch(
                    "app.api.routes.tiptap_journals.JournalService"
                ) as mock_journal_service, patch(
                    "app.api.routes.tiptap_journals.HighlightService"
                ) as mock_highlight_service, patch(
                    "app.api.routes.tiptap_journals.get_websocket_manager"
                ) as mock_ws, patch(
                    "app.api.routes.tiptap_journals.remove_highlight_from_tiptap"
                ) as mock_remove:

                    # Mock journal retrieval
                    mock_journal_service.return_value.get_journal_entry.return_value = {
                        "content_tiptap": {"type": "doc", "content": []},
                        "journal_id": "journal-123",
                    }

                    # Mock highlight removal
                    mock_remove.return_value = {"type": "doc", "content": []}

                    # Mock journal update
                    mock_journal_service.return_value.update_journal_entry.return_value = {
                        "journal_id": "journal-123"
                    }

                    # Mock highlight service
                    highlight_service_instance = AsyncMock()
                    mock_highlight_service.return_value = highlight_service_instance

                    # Mock WebSocket
                    mock_ws_manager = AsyncMock()
                    mock_ws.return_value = mock_ws_manager

                    response = test_client.delete(
                        "/api/tiptap/spaces/space-123/journals/journal-123/highlights/highlight-1",
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code == 204

    def test_delete_highlight_journal_not_found(self, test_client, mock_user):
        """Test DELETE highlight - journal not found."""
        with patch("app.core.security.decode_token", return_value=mock_user):
            with patch(
                "app.core.dependencies.UserProfileService"
            ) as mock_profile:
                mock_profile.return_value.get_or_create_user_profile.return_value = {
                    "user_id": "user-123"
                }
                with patch(
                    "app.api.routes.tiptap_journals.JournalService"
                ) as mock_journal_service:

                    # Mock journal not found
                    mock_journal_service.return_value.get_journal_entry.return_value = (
                        None
                    )

                    response = test_client.delete(
                        "/api/tiptap/spaces/space-123/journals/nonexistent/highlights/highlight-1",
                        headers={"Authorization": "Bearer test-token"},
                    )

                    # Route catches HTTPException and converts to 500
                    assert response.status_code == 500

    def test_update_tiptap_journal_error_handling(
        self, test_client, mock_user, tiptap_content
    ):
        """Test PUT endpoint error handling."""
        with patch("app.core.security.decode_token", return_value=mock_user):
            with patch(
                "app.core.dependencies.UserProfileService"
            ) as mock_profile:
                mock_profile.return_value.get_or_create_user_profile.return_value = {
                    "user_id": "user-123"
                }
                with patch(
                    "app.api.routes.tiptap_journals.extract_highlights_from_tiptap"
                ) as mock_extract:

                    # Mock extraction to raise error
                    mock_extract.side_effect = Exception("Test error")

                    response = test_client.put(
                        "/api/tiptap/spaces/space-123/journals/journal-123",
                        json=tiptap_content,
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code == 500
