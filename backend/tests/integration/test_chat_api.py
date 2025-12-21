"""
Integration tests for Chat API endpoints.
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.main import app
from app.core.dependencies import get_current_user
from app.models.chat import ChatConversation, ChatMessage


def mock_get_current_user():
    """Mock current user for testing."""
    return {"sub": "user-123", "email": "test@example.com"}


@pytest.fixture
def client():
    """Create test client with mocked auth."""
    app.dependency_overrides[get_current_user] = mock_get_current_user
    yield TestClient(app)
    app.dependency_overrides.clear()


class TestChatAPIConversations:
    """Tests for conversation endpoints."""

    @patch("app.api.routes.chat.SpaceService")
    @patch("app.api.routes.chat.get_chat_service")
    def test_create_conversation_success(
        self, mock_get_service, mock_space_service_class, client
    ):
        """Test creating a conversation."""
        # Mock space service
        mock_space_service = MagicMock()
        mock_space_service.get_space.return_value = {"spaceId": "space-123"}
        mock_space_service.is_space_member.return_value = True
        mock_space_service_class.return_value = mock_space_service

        # Mock chat service
        now = datetime.now(timezone.utc)
        mock_service = MagicMock()
        mock_service.create_conversation = AsyncMock(
            return_value=ChatConversation(
                conversationId="conv-123",
                spaceId="space-123",
                userId="user-123",
                createdAt=now,
                updatedAt=now,
            )
        )
        mock_get_service.return_value = mock_service

        response = client.post("/api/chat/spaces/space-123/conversations")

        assert response.status_code == 201
        data = response.json()
        assert data["conversationId"] == "conv-123"
        assert data["spaceId"] == "space-123"

    @patch("app.api.routes.chat.SpaceService")
    def test_create_conversation_space_not_found(
        self, mock_space_service_class, client
    ):
        """Test creating conversation in non-existent space."""
        mock_space_service = MagicMock()
        mock_space_service.get_space.return_value = None
        mock_space_service_class.return_value = mock_space_service

        response = client.post("/api/chat/spaces/nonexistent/conversations")

        assert response.status_code == 404

    @patch("app.api.routes.chat.SpaceService")
    def test_create_conversation_not_member(self, mock_space_service_class, client):
        """Test creating conversation when not a member."""
        mock_space_service = MagicMock()
        mock_space_service.get_space.return_value = {"spaceId": "space-123"}
        mock_space_service.is_space_member.return_value = False
        mock_space_service_class.return_value = mock_space_service

        response = client.post("/api/chat/spaces/space-123/conversations")

        assert response.status_code == 403

    @patch("app.api.routes.chat.SpaceService")
    @patch("app.api.routes.chat.get_chat_service")
    def test_list_conversations_success(
        self, mock_get_service, mock_space_service_class, client
    ):
        """Test listing conversations."""
        mock_space_service = MagicMock()
        mock_space_service.get_space.return_value = {"spaceId": "space-123"}
        mock_space_service.is_space_member.return_value = True
        mock_space_service_class.return_value = mock_space_service

        now = datetime.now(timezone.utc)
        mock_service = MagicMock()
        mock_service.list_conversations = AsyncMock(
            return_value=[
                ChatConversation(
                    conversationId="conv-1",
                    spaceId="space-123",
                    userId="user-123",
                    title="Test Chat",
                    messages=[],
                    createdAt=now,
                    updatedAt=now,
                )
            ]
        )
        mock_get_service.return_value = mock_service

        response = client.get("/api/chat/spaces/space-123/conversations")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["conversations"]) == 1

    @patch("app.api.routes.chat.SpaceService")
    @patch("app.api.routes.chat.get_chat_service")
    def test_get_conversation_success(
        self, mock_get_service, mock_space_service_class, client
    ):
        """Test getting a conversation."""
        mock_space_service = MagicMock()
        mock_space_service.get_space.return_value = {"spaceId": "space-123"}
        mock_space_service.is_space_member.return_value = True
        mock_space_service_class.return_value = mock_space_service

        now = datetime.now(timezone.utc)
        mock_service = MagicMock()
        mock_service.get_conversation = AsyncMock(
            return_value=ChatConversation(
                conversationId="conv-123",
                spaceId="space-123",
                userId="user-123",
                title="Test Chat",
                messages=[],
                createdAt=now,
                updatedAt=now,
            )
        )
        mock_get_service.return_value = mock_service

        response = client.get("/api/chat/spaces/space-123/conversations/conv-123")

        assert response.status_code == 200
        data = response.json()
        assert data["conversation"]["conversationId"] == "conv-123"

    @patch("app.api.routes.chat.SpaceService")
    @patch("app.api.routes.chat.get_chat_service")
    def test_get_conversation_not_found(
        self, mock_get_service, mock_space_service_class, client
    ):
        """Test getting a non-existent conversation."""
        mock_space_service = MagicMock()
        mock_space_service.get_space.return_value = {"spaceId": "space-123"}
        mock_space_service.is_space_member.return_value = True
        mock_space_service_class.return_value = mock_space_service

        mock_service = MagicMock()
        mock_service.get_conversation = AsyncMock(return_value=None)
        mock_get_service.return_value = mock_service

        response = client.get("/api/chat/spaces/space-123/conversations/nonexistent")

        assert response.status_code == 404

    @patch("app.api.routes.chat.SpaceService")
    @patch("app.api.routes.chat.get_chat_service")
    def test_get_conversation_not_owner(
        self, mock_get_service, mock_space_service_class, client
    ):
        """Test getting another user's conversation."""
        mock_space_service = MagicMock()
        mock_space_service.get_space.return_value = {"spaceId": "space-123"}
        mock_space_service.is_space_member.return_value = True
        mock_space_service_class.return_value = mock_space_service

        now = datetime.now(timezone.utc)
        mock_service = MagicMock()
        mock_service.get_conversation = AsyncMock(
            return_value=ChatConversation(
                conversationId="conv-123",
                spaceId="space-123",
                userId="other-user",  # Different user
                createdAt=now,
                updatedAt=now,
            )
        )
        mock_get_service.return_value = mock_service

        response = client.get("/api/chat/spaces/space-123/conversations/conv-123")

        assert response.status_code == 403

    @patch("app.api.routes.chat.SpaceService")
    @patch("app.api.routes.chat.get_chat_service")
    def test_delete_conversation_success(
        self, mock_get_service, mock_space_service_class, client
    ):
        """Test deleting a conversation."""
        mock_space_service = MagicMock()
        mock_space_service.get_space.return_value = {"spaceId": "space-123"}
        mock_space_service.is_space_member.return_value = True
        mock_space_service_class.return_value = mock_space_service

        now = datetime.now(timezone.utc)
        mock_service = MagicMock()
        mock_service.get_conversation = AsyncMock(
            return_value=ChatConversation(
                conversationId="conv-123",
                spaceId="space-123",
                userId="user-123",
                createdAt=now,
                updatedAt=now,
            )
        )
        mock_service.delete_conversation = AsyncMock(return_value=True)
        mock_get_service.return_value = mock_service

        response = client.delete("/api/chat/spaces/space-123/conversations/conv-123")

        assert response.status_code == 204


class TestChatAPIMessages:
    """Tests for message endpoints."""

    @patch("app.api.routes.chat.SpaceService")
    @patch("app.api.routes.chat.get_chat_service")
    def test_send_message_success(
        self, mock_get_service, mock_space_service_class, client
    ):
        """Test sending a message."""
        mock_space_service = MagicMock()
        mock_space_service.get_space.return_value = {"spaceId": "space-123"}
        mock_space_service.is_space_member.return_value = True
        mock_space_service_class.return_value = mock_space_service

        now = datetime.now(timezone.utc)
        mock_service = MagicMock()
        mock_service.send_message = AsyncMock(
            return_value=(
                ChatMessage(
                    id="msg-123",
                    role="assistant",
                    content="Hello! How can I help?",
                    citations=[],
                    createdAt=now,
                ),
                [],
            )
        )
        mock_get_service.return_value = mock_service

        response = client.post(
            "/api/chat/spaces/space-123/conversations/conv-123/messages",
            json={"content": "Hello Ellie!"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["message"]["role"] == "assistant"
        assert "Hello" in data["message"]["content"]

    @patch("app.api.routes.chat.SpaceService")
    @patch("app.api.routes.chat.get_chat_service")
    def test_send_message_validation_error(
        self, mock_get_service, mock_space_service_class, client
    ):
        """Test sending message with validation error."""
        mock_space_service = MagicMock()
        mock_space_service.get_space.return_value = {"spaceId": "space-123"}
        mock_space_service.is_space_member.return_value = True
        mock_space_service_class.return_value = mock_space_service

        mock_service = MagicMock()
        mock_service.send_message = AsyncMock(
            side_effect=ValueError("Conversation not found")
        )
        mock_get_service.return_value = mock_service

        response = client.post(
            "/api/chat/spaces/space-123/conversations/conv-123/messages",
            json={"content": "Hello!"},
        )

        assert response.status_code == 400

    @patch("app.api.routes.chat.SpaceService")
    @patch("app.api.routes.chat.get_chat_service")
    def test_send_message_empty_content(
        self, mock_get_service, mock_space_service_class, client
    ):
        """Test sending message with empty content."""
        response = client.post(
            "/api/chat/spaces/space-123/conversations/conv-123/messages",
            json={"content": ""},
        )

        # Should fail validation
        assert response.status_code == 422


class TestChatAPIStreaming:
    """Tests for streaming endpoint."""

    @patch("app.api.routes.chat.SpaceService")
    @patch("app.api.routes.chat.get_chat_service")
    def test_stream_message_success(
        self, mock_get_service, mock_space_service_class, client
    ):
        """Test streaming message response."""
        mock_space_service = MagicMock()
        mock_space_service.get_space.return_value = {"spaceId": "space-123"}
        mock_space_service.is_space_member.return_value = True
        mock_space_service_class.return_value = mock_space_service

        async def mock_stream(*args, **kwargs):
            yield '{"type": "content", "data": "Hello"}'
            yield '{"type": "done", "messageId": "msg-123"}'

        mock_service = MagicMock()
        mock_service.send_message_streaming = mock_stream
        mock_get_service.return_value = mock_service

        response = client.post(
            "/api/chat/spaces/space-123/conversations/conv-123/messages/stream",
            json={"content": "Hello!"},
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

    @patch("app.api.routes.chat.SpaceService")
    def test_stream_message_space_not_found(self, mock_space_service_class, client):
        """Test streaming with non-existent space."""
        mock_space_service = MagicMock()
        mock_space_service.get_space.return_value = None
        mock_space_service_class.return_value = mock_space_service

        response = client.post(
            "/api/chat/spaces/nonexistent/conversations/conv-123/messages/stream",
            json={"content": "Hello!"},
        )

        assert response.status_code == 404
