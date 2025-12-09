"""
Tests for Conversations aggregation feature.
Following TDD approach - tests for conversations API endpoints and service.
"""
import uuid
from datetime import datetime, timezone
from unittest.mock import patch, Mock, AsyncMock
import pytest
from fastapi import status


class TestConversationsAPI:
    """Tests for Conversations API endpoints."""

    def test_get_space_conversations_success(self, test_client):
        """Test successful retrieval of space conversations."""
        # Arrange
        space_id = str(uuid.uuid4())
        user_id = "user-123"
        journal_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()

        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {
                "sub": user_id,
                "email": "test@example.com",
                "username": "testuser"
            }

            with patch('app.core.dependencies.UserProfileService') as mock_profile_service:
                mock_profile_instance = Mock()
                mock_profile_service.return_value = mock_profile_instance
                mock_profile_instance.get_or_create_user_profile.return_value = {
                    "user_id": user_id,
                    "username": "testuser",
                    "display_name": "Test User"
                }

                with patch('app.api.routes.conversations.get_conversation_service') as mock_service_getter:
                    mock_service = Mock()
                    mock_service_getter.return_value = mock_service

                    # Mock space membership check
                    mock_service.is_space_member.return_value = True

                    # Mock get_space_conversations
                    from app.models.conversation import ConversationModel, ConversationsResponse
                    mock_conversation = ConversationModel(
                        journalId=journal_id,
                        journalTitle="Test Journal",
                        journalAuthor="author-123",
                        journalAuthorName="Test Author",
                        lastActivity=timestamp,
                        highlightCount=5,
                        highlightCommentCount=10,
                        journalCommentCount=3,
                        unreadCount=2,
                        participants=["User A", "User B"],
                        previewText="Latest comment..."
                    )
                    mock_response = ConversationsResponse(
                        conversations=[mock_conversation],
                        totalUnread=2,
                        nextToken=None
                    )
                    mock_service.get_space_conversations = AsyncMock(return_value=mock_response)

                    # Act
                    response = test_client.get(
                        f"/api/spaces/{space_id}/conversations",
                        headers={"Authorization": "Bearer test-token"}
                    )

                    # Assert
                    assert response.status_code == status.HTTP_200_OK
                    data = response.json()
                    assert "conversations" in data
                    assert len(data["conversations"]) == 1
                    assert data["conversations"][0]["journalId"] == journal_id
                    assert data["conversations"][0]["highlightCount"] == 5
                    assert data["totalUnread"] == 2

    def test_get_space_conversations_with_sort(self, test_client):
        """Test getting conversations with sort parameter."""
        space_id = str(uuid.uuid4())
        user_id = "user-123"

        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": user_id}

            with patch('app.core.dependencies.UserProfileService') as mock_profile_service:
                mock_profile_instance = Mock()
                mock_profile_service.return_value = mock_profile_instance
                mock_profile_instance.get_or_create_user_profile.return_value = {
                    "user_id": user_id,
                    "display_name": "Test User"
                }

                with patch('app.api.routes.conversations.get_conversation_service') as mock_service_getter:
                    mock_service = Mock()
                    mock_service_getter.return_value = mock_service
                    mock_service.is_space_member.return_value = True

                    from app.models.conversation import ConversationsResponse
                    mock_response = ConversationsResponse(
                        conversations=[],
                        totalUnread=0,
                        nextToken=None
                    )
                    mock_service.get_space_conversations = AsyncMock(return_value=mock_response)

                    # Act - test with sort=unread
                    response = test_client.get(
                        f"/api/spaces/{space_id}/conversations?sort=unread",
                        headers={"Authorization": "Bearer test-token"}
                    )

                    # Assert
                    assert response.status_code == status.HTTP_200_OK
                    # Verify the service was called with correct sort parameter
                    mock_service.get_space_conversations.assert_called_once()
                    call_kwargs = mock_service.get_space_conversations.call_args[1]
                    assert call_kwargs["sort_by"] == "unread"

    def test_get_space_conversations_unauthorized(self, test_client):
        """Test that non-members cannot view conversations."""
        space_id = str(uuid.uuid4())
        user_id = "user-123"

        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": user_id}

            with patch('app.core.dependencies.UserProfileService') as mock_profile_service:
                mock_profile_instance = Mock()
                mock_profile_service.return_value = mock_profile_instance
                mock_profile_instance.get_or_create_user_profile.return_value = {
                    "user_id": user_id,
                    "display_name": "Test User"
                }

                with patch('app.api.routes.conversations.get_conversation_service') as mock_service_getter:
                    mock_service = Mock()
                    mock_service_getter.return_value = mock_service
                    mock_service.is_space_member.return_value = False

                    # Act
                    response = test_client.get(
                        f"/api/spaces/{space_id}/conversations",
                        headers={"Authorization": "Bearer test-token"}
                    )

                    # Assert
                    assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_unread_count_success(self, test_client):
        """Test getting unread count for a space."""
        space_id = str(uuid.uuid4())
        user_id = "user-123"

        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": user_id}

            with patch('app.core.dependencies.UserProfileService') as mock_profile_service:
                mock_profile_instance = Mock()
                mock_profile_service.return_value = mock_profile_instance
                mock_profile_instance.get_or_create_user_profile.return_value = {
                    "user_id": user_id,
                    "display_name": "Test User"
                }

                with patch('app.api.routes.conversations.get_conversation_service') as mock_service_getter:
                    mock_service = Mock()
                    mock_service_getter.return_value = mock_service
                    mock_service.is_space_member.return_value = True

                    from app.models.conversation import UnreadCountResponse
                    mock_response = UnreadCountResponse(
                        totalUnread=15,
                        spaceId=space_id
                    )
                    mock_service.get_unread_count = AsyncMock(return_value=mock_response)

                    # Act
                    response = test_client.get(
                        f"/api/spaces/{space_id}/conversations/unread-count",
                        headers={"Authorization": "Bearer test-token"}
                    )

                    # Assert
                    assert response.status_code == status.HTTP_200_OK
                    data = response.json()
                    assert data["totalUnread"] == 15
                    assert data["spaceId"] == space_id

    def test_mark_journal_as_read_success(self, test_client):
        """Test marking a journal as read."""
        space_id = str(uuid.uuid4())
        journal_id = str(uuid.uuid4())
        user_id = "user-123"

        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": user_id}

            with patch('app.core.dependencies.UserProfileService') as mock_profile_service:
                mock_profile_instance = Mock()
                mock_profile_service.return_value = mock_profile_instance
                mock_profile_instance.get_or_create_user_profile.return_value = {
                    "user_id": user_id,
                    "display_name": "Test User"
                }

                with patch('app.api.routes.conversations.get_conversation_service') as mock_service_getter:
                    mock_service = Mock()
                    mock_service_getter.return_value = mock_service
                    mock_service.is_space_member.return_value = True
                    mock_service.mark_journal_as_read = AsyncMock(return_value=True)

                    # Act
                    response = test_client.post(
                        f"/api/spaces/{space_id}/journals/{journal_id}/mark-read",
                        headers={"Authorization": "Bearer test-token"}
                    )

                    # Assert
                    assert response.status_code == status.HTTP_200_OK
                    data = response.json()
                    assert data["success"] is True
                    assert data["journalId"] == journal_id
                    assert data["spaceId"] == space_id

    def test_mark_journal_as_read_with_options(self, test_client):
        """Test marking journal as read with specific options."""
        space_id = str(uuid.uuid4())
        journal_id = str(uuid.uuid4())
        user_id = "user-123"

        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": user_id}

            with patch('app.core.dependencies.UserProfileService') as mock_profile_service:
                mock_profile_instance = Mock()
                mock_profile_service.return_value = mock_profile_instance
                mock_profile_instance.get_or_create_user_profile.return_value = {
                    "user_id": user_id,
                    "display_name": "Test User"
                }

                with patch('app.api.routes.conversations.get_conversation_service') as mock_service_getter:
                    mock_service = Mock()
                    mock_service_getter.return_value = mock_service
                    mock_service.is_space_member.return_value = True
                    mock_service.mark_journal_as_read = AsyncMock(return_value=True)

                    # Act - mark only journal comments as read
                    response = test_client.post(
                        f"/api/spaces/{space_id}/journals/{journal_id}/mark-read",
                        json={
                            "markHighlightComments": False,
                            "markJournalComments": True
                        },
                        headers={"Authorization": "Bearer test-token"}
                    )

                    # Assert
                    assert response.status_code == status.HTTP_200_OK
                    # Verify service was called with correct params
                    mock_service.mark_journal_as_read.assert_called_once()
                    call_kwargs = mock_service.mark_journal_as_read.call_args[1]
                    assert call_kwargs["mark_highlight_comments"] is False
                    assert call_kwargs["mark_journal_comments"] is True

    def test_mark_journal_as_read_unauthorized(self, test_client):
        """Test that non-members cannot mark journals as read."""
        space_id = str(uuid.uuid4())
        journal_id = str(uuid.uuid4())
        user_id = "user-123"

        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": user_id}

            with patch('app.core.dependencies.UserProfileService') as mock_profile_service:
                mock_profile_instance = Mock()
                mock_profile_service.return_value = mock_profile_instance
                mock_profile_instance.get_or_create_user_profile.return_value = {
                    "user_id": user_id,
                    "display_name": "Test User"
                }

                with patch('app.api.routes.conversations.get_conversation_service') as mock_service_getter:
                    mock_service = Mock()
                    mock_service_getter.return_value = mock_service
                    mock_service.is_space_member.return_value = False

                    # Act
                    response = test_client.post(
                        f"/api/spaces/{space_id}/journals/{journal_id}/mark-read",
                        headers={"Authorization": "Bearer test-token"}
                    )

                    # Assert
                    assert response.status_code == status.HTTP_403_FORBIDDEN


class TestReadStatusModel:
    """Tests for ReadStatus model."""

    def test_read_status_model_serialization(self):
        """Test ReadStatusModel serialization with aliases."""
        from app.models.read_status import ReadStatusModel
        timestamp = datetime.now(timezone.utc).isoformat()

        status = ReadStatusModel(
            userId="user-123",
            spaceId="space-456",
            journalId="journal-789",
            lastReadHighlightCommentAt=timestamp,
            lastReadJournalCommentAt=timestamp
        )

        # Test serialization with aliases
        data = status.model_dump(by_alias=True)
        assert data["userId"] == "user-123"
        assert data["spaceId"] == "space-456"
        assert data["journalId"] == "journal-789"
        assert data["lastReadHighlightCommentAt"] == timestamp
        assert data["lastReadJournalCommentAt"] == timestamp

    def test_read_status_to_db_item(self):
        """Test converting ReadStatusModel to DynamoDB item."""
        from app.models.read_status import ReadStatusModel, read_status_to_db_item
        timestamp = datetime.now(timezone.utc).isoformat()

        status = ReadStatusModel(
            userId="user-123",
            spaceId="space-456",
            journalId="journal-789",
            lastReadHighlightCommentAt=timestamp,
            lastReadJournalCommentAt=timestamp
        )

        db_item = read_status_to_db_item(status)

        assert db_item["PK"] == "USER#user-123"
        assert db_item["SK"] == "READ_STATUS#space-456#journal-789"
        assert db_item["EntityType"] == "ReadStatus"
        assert db_item["userId"] == "user-123"

    def test_db_item_to_read_status(self):
        """Test converting DynamoDB item to ReadStatusModel."""
        from app.models.read_status import db_item_to_read_status
        timestamp = datetime.now(timezone.utc).isoformat()

        db_item = {
            "PK": "USER#user-123",
            "SK": "READ_STATUS#space-456#journal-789",
            "EntityType": "ReadStatus",
            "userId": "user-123",
            "spaceId": "space-456",
            "journalId": "journal-789",
            "lastReadHighlightCommentAt": timestamp,
            "lastReadJournalCommentAt": timestamp
        }

        status = db_item_to_read_status(db_item)

        assert status.user_id == "user-123"
        assert status.space_id == "space-456"
        assert status.journal_id == "journal-789"
        assert status.last_read_highlight_comment_at == timestamp


class TestConversationModel:
    """Tests for Conversation response models."""

    def test_conversation_model_serialization(self):
        """Test ConversationModel serialization with aliases."""
        from app.models.conversation import ConversationModel
        timestamp = datetime.now(timezone.utc).isoformat()

        conversation = ConversationModel(
            journalId="journal-123",
            journalTitle="Test Journal",
            journalAuthor="user-456",
            journalAuthorName="Test Author",
            lastActivity=timestamp,
            highlightCount=5,
            highlightCommentCount=10,
            journalCommentCount=3,
            unreadCount=2,
            participants=["User A", "User B"],
            previewText="Test preview..."
        )

        data = conversation.model_dump(by_alias=True)
        assert data["journalId"] == "journal-123"
        assert data["journalTitle"] == "Test Journal"
        assert data["highlightCount"] == 5
        assert data["unreadCount"] == 2

    def test_conversations_response_serialization(self):
        """Test ConversationsResponse serialization."""
        from app.models.conversation import ConversationModel, ConversationsResponse
        timestamp = datetime.now(timezone.utc).isoformat()

        conversation = ConversationModel(
            journalId="journal-123",
            journalTitle="Test Journal",
            journalAuthor="user-456",
            journalAuthorName="Test Author",
            lastActivity=timestamp,
            highlightCount=5,
            highlightCommentCount=10,
            journalCommentCount=3,
            unreadCount=2,
            participants=[],
            previewText=None
        )

        response = ConversationsResponse(
            conversations=[conversation],
            totalUnread=2,
            nextToken=None
        )

        data = response.model_dump(by_alias=True)
        assert len(data["conversations"]) == 1
        assert data["totalUnread"] == 2
        assert data["nextToken"] is None

    def test_unread_count_response_serialization(self):
        """Test UnreadCountResponse serialization."""
        from app.models.conversation import UnreadCountResponse

        response = UnreadCountResponse(
            totalUnread=15,
            spaceId="space-123"
        )

        data = response.model_dump(by_alias=True)
        assert data["totalUnread"] == 15
        assert data["spaceId"] == "space-123"

    def test_mark_read_response_serialization(self):
        """Test MarkReadResponse serialization."""
        from app.models.conversation import MarkReadResponse

        response = MarkReadResponse(
            success=True,
            journalId="journal-123",
            spaceId="space-456"
        )

        data = response.model_dump(by_alias=True)
        assert data["success"] is True
        assert data["journalId"] == "journal-123"
        assert data["spaceId"] == "space-456"
