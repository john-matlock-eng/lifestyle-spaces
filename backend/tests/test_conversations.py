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


class TestConversationServiceUnit:
    """Unit tests for ConversationService methods."""

    def test_is_space_member_returns_true(self):
        """Test is_space_member returns True when member exists."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db') as mock_get_db, \
             patch('app.services.conversation_service.boto3') as mock_boto3:
            mock_db = Mock()
            mock_get_db.return_value = mock_db
            mock_db.get_item.return_value = {'userId': 'user-123'}

            service = ConversationService()
            result = service.is_space_member('space-123', 'user-123')

            assert result is True
            mock_db.get_item.assert_called_once_with(
                pk='SPACE#space-123',
                sk='MEMBER#user-123'
            )

    def test_is_space_member_returns_false(self):
        """Test is_space_member returns False when member doesn't exist."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db') as mock_get_db, \
             patch('app.services.conversation_service.boto3') as mock_boto3:
            mock_db = Mock()
            mock_get_db.return_value = mock_db
            mock_db.get_item.return_value = None

            service = ConversationService()
            result = service.is_space_member('space-123', 'user-456')

            assert result is False

    def test_is_space_member_handles_exception(self):
        """Test is_space_member returns False on exception."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db') as mock_get_db, \
             patch('app.services.conversation_service.boto3') as mock_boto3:
            mock_db = Mock()
            mock_get_db.return_value = mock_db
            mock_db.get_item.side_effect = Exception("DB error")

            service = ConversationService()
            result = service.is_space_member('space-123', 'user-123')

            assert result is False

    def test_get_journals_for_space(self):
        """Test _get_journals_for_space returns journals."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db') as mock_get_db, \
             patch('app.services.conversation_service.boto3') as mock_boto3:
            mock_table = Mock()
            mock_boto3.resource.return_value.Table.return_value = mock_table
            mock_table.query.return_value = {
                'Items': [
                    {'journal_id': 'j1', 'title': 'Journal 1'},
                    {'journal_id': 'j2', 'title': 'Journal 2'},
                ]
            }

            service = ConversationService()
            result = service._get_journals_for_space('space-123')

            assert len(result) == 2
            assert result[0]['journal_id'] == 'j1'

    def test_get_highlights_for_journal(self):
        """Test _get_highlights_for_journal filters correctly."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db') as mock_get_db, \
             patch('app.services.conversation_service.boto3') as mock_boto3:
            mock_db = Mock()
            mock_get_db.return_value = mock_db
            mock_db.query.return_value = [
                {'EntityType': 'Highlight', 'spaceId': 'space-123', 'id': 'h1'},
                {'EntityType': 'Highlight', 'spaceId': 'space-456', 'id': 'h2'},  # Different space
                {'EntityType': 'Comment', 'spaceId': 'space-123', 'id': 'c1'},  # Different type
            ]

            service = ConversationService()
            result = service._get_highlights_for_journal('journal-123', 'space-123')

            assert len(result) == 1
            assert result[0]['id'] == 'h1'

    def test_get_journal_comments(self):
        """Test _get_journal_comments filters correctly."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db') as mock_get_db, \
             patch('app.services.conversation_service.boto3') as mock_boto3:
            mock_db = Mock()
            mock_get_db.return_value = mock_db
            mock_db.query.return_value = [
                {'EntityType': 'JournalComment', 'spaceId': 'space-123', 'id': 'jc1'},
                {'EntityType': 'JournalComment', 'spaceId': 'space-456', 'id': 'jc2'},
                {'EntityType': 'Highlight', 'spaceId': 'space-123', 'id': 'h1'},
            ]

            service = ConversationService()
            result = service._get_journal_comments('journal-123', 'space-123')

            assert len(result) == 1
            assert result[0]['id'] == 'jc1'

    def test_get_user_read_status_found(self):
        """Test _get_user_read_status when status exists."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db') as mock_get_db, \
             patch('app.services.conversation_service.boto3') as mock_boto3:
            mock_db = Mock()
            mock_get_db.return_value = mock_db
            mock_db.get_item.return_value = {
                'userId': 'user-123',
                'spaceId': 'space-456',
                'journalId': 'journal-789',
                'lastReadHighlightCommentAt': '2024-01-15T10:00:00Z',
                'lastReadJournalCommentAt': '2024-01-15T10:00:00Z',
            }

            service = ConversationService()
            result = service._get_user_read_status('user-123', 'space-456', 'journal-789')

            assert result is not None
            assert result.user_id == 'user-123'

    def test_get_user_read_status_not_found(self):
        """Test _get_user_read_status when status doesn't exist."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db') as mock_get_db, \
             patch('app.services.conversation_service.boto3') as mock_boto3:
            mock_db = Mock()
            mock_get_db.return_value = mock_db
            mock_db.get_item.return_value = None

            service = ConversationService()
            result = service._get_user_read_status('user-123', 'space-456', 'journal-789')

            assert result is None

    def test_get_user_read_status_handles_exception(self):
        """Test _get_user_read_status handles exceptions."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db') as mock_get_db, \
             patch('app.services.conversation_service.boto3') as mock_boto3:
            mock_db = Mock()
            mock_get_db.return_value = mock_db
            mock_db.get_item.side_effect = Exception("DB error")

            service = ConversationService()
            result = service._get_user_read_status('user-123', 'space-456', 'journal-789')

            assert result is None

    def test_get_author_info_found(self):
        """Test _get_author_info when profile exists."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db') as mock_get_db, \
             patch('app.services.conversation_service.boto3') as mock_boto3:
            mock_db = Mock()
            mock_get_db.return_value = mock_db
            mock_db.get_item.return_value = {
                'displayName': 'John Doe'
            }

            service = ConversationService()
            result = service._get_author_info('user-123')

            assert result['user_id'] == 'user-123'
            assert result['display_name'] == 'John Doe'

    def test_get_author_info_not_found(self):
        """Test _get_author_info when profile doesn't exist."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db') as mock_get_db, \
             patch('app.services.conversation_service.boto3') as mock_boto3:
            mock_db = Mock()
            mock_get_db.return_value = mock_db
            mock_db.get_item.return_value = None

            service = ConversationService()
            result = service._get_author_info('user-123')

            assert result['user_id'] == 'user-123'
            assert result['display_name'] == 'Unknown'

    def test_get_author_info_handles_exception(self):
        """Test _get_author_info handles exceptions."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db') as mock_get_db, \
             patch('app.services.conversation_service.boto3') as mock_boto3:
            mock_db = Mock()
            mock_get_db.return_value = mock_db
            mock_db.get_item.side_effect = Exception("DB error")

            service = ConversationService()
            result = service._get_author_info('user-123')

            assert result['display_name'] == 'Unknown'

    def test_calculate_unread_count_no_read_status(self):
        """Test _calculate_unread_count when user hasn't read anything."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db'), \
             patch('app.services.conversation_service.boto3'):
            service = ConversationService()

            highlights = [
                {'commentCount': 3},
                {'commentCount': 2},
            ]
            journal_comments = [{'id': '1'}, {'id': '2'}]

            result = service._calculate_unread_count(highlights, journal_comments, None)

            assert result == 7  # 3 + 2 + 2

    def test_calculate_unread_count_with_read_status(self):
        """Test _calculate_unread_count with read status."""
        from app.services.conversation_service import ConversationService
        from app.models.read_status import ReadStatusModel

        with patch('app.services.conversation_service.get_db'), \
             patch('app.services.conversation_service.boto3'):
            service = ConversationService()

            read_status = ReadStatusModel(
                userId='user-123',
                spaceId='space-456',
                journalId='journal-789',
                lastReadHighlightCommentAt='2024-01-15T10:00:00Z',
                lastReadJournalCommentAt='2024-01-15T10:00:00Z',
            )

            highlights = [
                {'commentCount': 3, 'updatedAt': '2024-01-15T09:00:00Z'},  # Before read
                {'commentCount': 2, 'updatedAt': '2024-01-15T11:00:00Z'},  # After read
            ]
            journal_comments = [
                {'id': '1', 'createdAt': '2024-01-15T09:00:00Z'},  # Before read
                {'id': '2', 'createdAt': '2024-01-15T11:00:00Z'},  # After read
            ]

            result = service._calculate_unread_count(highlights, journal_comments, read_status)

            assert result == 3  # 2 (newer highlight) + 1 (newer comment)

    def test_calculate_unread_count_no_last_read_timestamps(self):
        """Test _calculate_unread_count when read status has no timestamps."""
        from app.services.conversation_service import ConversationService
        from app.models.read_status import ReadStatusModel

        with patch('app.services.conversation_service.get_db'), \
             patch('app.services.conversation_service.boto3'):
            service = ConversationService()

            read_status = ReadStatusModel(
                userId='user-123',
                spaceId='space-456',
                journalId='journal-789',
                lastReadHighlightCommentAt=None,
                lastReadJournalCommentAt=None,
            )

            highlights = [{'commentCount': 3}]
            journal_comments = [{'id': '1'}]

            result = service._calculate_unread_count(highlights, journal_comments, read_status)

            assert result == 4  # All unread

    def test_get_latest_activity(self):
        """Test _get_latest_activity returns most recent timestamp."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db'), \
             patch('app.services.conversation_service.boto3'):
            service = ConversationService()

            journal = {'updatedAt': '2024-01-10T10:00:00Z'}
            highlights = [
                {'updatedAt': '2024-01-12T10:00:00Z'},
                {'createdAt': '2024-01-11T10:00:00Z'},
            ]
            journal_comments = [
                {'createdAt': '2024-01-15T10:00:00Z'},  # Latest
            ]

            result = service._get_latest_activity(journal, highlights, journal_comments)

            assert result == '2024-01-15T10:00:00Z'

    def test_get_latest_activity_empty_timestamps(self):
        """Test _get_latest_activity handles empty timestamps."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db'), \
             patch('app.services.conversation_service.boto3'):
            service = ConversationService()

            journal = {}
            highlights = []
            journal_comments = []

            result = service._get_latest_activity(journal, highlights, journal_comments)

            # Should return current time
            assert result is not None

    def test_get_participants(self):
        """Test _get_participants returns unique names."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db'), \
             patch('app.services.conversation_service.boto3'):
            service = ConversationService()

            highlights = [
                {'createdByName': 'Alice'},
                {'createdByName': 'Bob'},
                {'createdByName': 'Alice'},  # Duplicate
            ]
            journal_comments = [
                {'authorName': 'Charlie'},
                {'authorName': 'Alice'},  # Duplicate
            ]

            result = service._get_participants(highlights, journal_comments)

            assert len(result) == 3
            assert set(result) == {'Alice', 'Bob', 'Charlie'}

    def test_get_participants_limits_to_5(self):
        """Test _get_participants limits to 5 participants."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db'), \
             patch('app.services.conversation_service.boto3'):
            service = ConversationService()

            highlights = [{'createdByName': f'User{i}'} for i in range(10)]
            journal_comments = []

            result = service._get_participants(highlights, journal_comments)

            assert len(result) <= 5

    def test_get_preview_text_returns_latest(self):
        """Test _get_preview_text returns latest comment text."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db'), \
             patch('app.services.conversation_service.boto3'):
            service = ConversationService()

            journal_comments = [
                {'text': 'Old comment', 'createdAt': '2024-01-10T10:00:00Z'},
                {'text': 'Latest comment', 'createdAt': '2024-01-15T10:00:00Z'},
            ]

            result = service._get_preview_text(journal_comments)

            assert result == 'Latest comment'

    def test_get_preview_text_truncates_long_text(self):
        """Test _get_preview_text truncates text over 100 chars."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db'), \
             patch('app.services.conversation_service.boto3'):
            service = ConversationService()

            long_text = 'x' * 150
            journal_comments = [{'text': long_text, 'createdAt': '2024-01-15T10:00:00Z'}]

            result = service._get_preview_text(journal_comments)

            assert len(result) == 100
            assert result.endswith('...')

    def test_get_preview_text_empty_comments(self):
        """Test _get_preview_text returns None for empty comments."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db'), \
             patch('app.services.conversation_service.boto3'):
            service = ConversationService()

            result = service._get_preview_text([])

            assert result is None

    @pytest.mark.asyncio
    async def test_get_space_conversations_success(self):
        """Test get_space_conversations returns aggregated data."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db') as mock_get_db, \
             patch('app.services.conversation_service.boto3') as mock_boto3:
            mock_db = Mock()
            mock_get_db.return_value = mock_db

            mock_table = Mock()
            mock_boto3.resource.return_value.Table.return_value = mock_table
            mock_table.query.return_value = {
                'Items': [
                    {'journal_id': 'j1', 'title': 'Journal 1', 'user_id': 'user-1', 'updatedAt': '2024-01-15T10:00:00Z'},
                ]
            }

            mock_db.query.return_value = [
                {'EntityType': 'Highlight', 'spaceId': 'space-123', 'id': 'h1', 'commentCount': 2, 'createdByName': 'Alice'},
            ]
            mock_db.get_item.return_value = None  # No read status

            service = ConversationService()
            result = await service.get_space_conversations('space-123', 'user-123')

            assert len(result.conversations) == 1
            assert result.conversations[0].journal_id == 'j1'
            assert result.conversations[0].highlight_count == 1

    @pytest.mark.asyncio
    async def test_get_space_conversations_skips_empty_journals(self):
        """Test get_space_conversations skips journals with no activity."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db') as mock_get_db, \
             patch('app.services.conversation_service.boto3') as mock_boto3:
            mock_db = Mock()
            mock_get_db.return_value = mock_db

            mock_table = Mock()
            mock_boto3.resource.return_value.Table.return_value = mock_table
            mock_table.query.return_value = {
                'Items': [
                    {'journal_id': 'j1', 'title': 'Journal 1', 'user_id': 'user-1'},
                ]
            }

            mock_db.query.return_value = []  # No highlights or comments
            mock_db.get_item.return_value = None

            service = ConversationService()
            result = await service.get_space_conversations('space-123', 'user-123')

            assert len(result.conversations) == 0

    @pytest.mark.asyncio
    async def test_get_space_conversations_sort_by_unread(self):
        """Test get_space_conversations sorts by unread when requested."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db') as mock_get_db, \
             patch('app.services.conversation_service.boto3') as mock_boto3:
            mock_db = Mock()
            mock_get_db.return_value = mock_db

            mock_table = Mock()
            mock_boto3.resource.return_value.Table.return_value = mock_table
            mock_table.query.return_value = {
                'Items': [
                    {'journal_id': 'j1', 'title': 'Journal 1', 'user_id': 'user-1', 'updatedAt': '2024-01-15T10:00:00Z'},
                ]
            }

            mock_db.query.return_value = [
                {'EntityType': 'Highlight', 'spaceId': 'space-123', 'commentCount': 5},
            ]
            mock_db.get_item.return_value = None

            service = ConversationService()
            result = await service.get_space_conversations('space-123', 'user-123', sort_by='unread')

            assert result is not None

    @pytest.mark.asyncio
    async def test_mark_journal_as_read_success(self):
        """Test mark_journal_as_read creates read status."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db') as mock_get_db, \
             patch('app.services.conversation_service.boto3') as mock_boto3:
            mock_db = Mock()
            mock_get_db.return_value = mock_db
            mock_db.get_item.return_value = None  # No existing read status

            service = ConversationService()
            result = await service.mark_journal_as_read('user-123', 'space-456', 'journal-789')

            assert result is True
            mock_db.put_item.assert_called_once()

    @pytest.mark.asyncio
    async def test_mark_journal_as_read_partial(self):
        """Test mark_journal_as_read with partial options."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db') as mock_get_db, \
             patch('app.services.conversation_service.boto3') as mock_boto3:
            mock_db = Mock()
            mock_get_db.return_value = mock_db
            mock_db.get_item.return_value = {
                'userId': 'user-123',
                'spaceId': 'space-456',
                'journalId': 'journal-789',
                'lastReadHighlightCommentAt': '2024-01-10T10:00:00Z',
                'lastReadJournalCommentAt': '2024-01-10T10:00:00Z',
            }

            service = ConversationService()
            result = await service.mark_journal_as_read(
                'user-123', 'space-456', 'journal-789',
                mark_highlight_comments=False, mark_journal_comments=True
            )

            assert result is True

    @pytest.mark.asyncio
    async def test_get_unread_count_success(self):
        """Test get_unread_count returns total unread."""
        from app.services.conversation_service import ConversationService

        with patch('app.services.conversation_service.get_db') as mock_get_db, \
             patch('app.services.conversation_service.boto3') as mock_boto3:
            mock_db = Mock()
            mock_get_db.return_value = mock_db

            mock_table = Mock()
            mock_boto3.resource.return_value.Table.return_value = mock_table
            mock_table.query.return_value = {'Items': []}

            service = ConversationService()
            result = await service.get_unread_count('user-123', 'space-456')

            assert result.total_unread == 0
            assert result.space_id == 'space-456'


class TestGetConversationService:
    """Tests for get_conversation_service singleton."""

    def test_get_conversation_service_returns_instance(self):
        """Test get_conversation_service returns a service instance."""
        from app.services.conversation_service import get_conversation_service, _conversation_service
        import app.services.conversation_service as conv_module

        # Reset singleton
        conv_module._conversation_service = None

        with patch('app.services.conversation_service.get_db'), \
             patch('app.services.conversation_service.boto3'):
            service = get_conversation_service()

            assert service is not None

    def test_get_conversation_service_returns_same_instance(self):
        """Test get_conversation_service returns the same singleton."""
        from app.services.conversation_service import get_conversation_service
        import app.services.conversation_service as conv_module

        # Reset singleton
        conv_module._conversation_service = None

        with patch('app.services.conversation_service.get_db'), \
             patch('app.services.conversation_service.boto3'):
            service1 = get_conversation_service()
            service2 = get_conversation_service()

            assert service1 is service2
