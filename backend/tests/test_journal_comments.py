"""
Tests for Journal-level Comments (Conversations feature).
Following TDD approach - tests for journal comment CRUD operations.
"""
import uuid
from datetime import datetime, timezone
from unittest.mock import patch, Mock, AsyncMock
import pytest
from fastapi import status


class TestJournalCommentAPI:
    """Tests for Journal Comment API endpoints."""

    def test_create_journal_comment_success(self, test_client):
        """Test successful creation of a journal comment."""
        # Arrange
        space_id = str(uuid.uuid4())
        journal_id = str(uuid.uuid4())
        user_id = "user-123"
        comment_id = str(uuid.uuid4())
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
                    "email": "test@example.com",
                    "display_name": "Test User"
                }

                with patch('app.api.routes.journal_comments.get_journal_comment_service') as mock_service_getter:
                    mock_service = Mock()
                    mock_service_getter.return_value = mock_service

                    # Mock space membership check
                    mock_service.is_space_member.return_value = True

                    # Mock create_comment as async
                    from app.models.journal_comment import JournalCommentModel
                    mock_comment = JournalCommentModel(
                        id=comment_id,
                        journalId=journal_id,
                        spaceId=space_id,
                        text="This is a test comment",
                        author=user_id,
                        authorName="Test User",
                        createdAt=timestamp,
                        updatedAt=timestamp,
                        isEdited=False,
                        mentions=[]
                    )
                    mock_service.create_comment = AsyncMock(return_value=mock_comment)

                    # Act
                    response = test_client.post(
                        f"/api/spaces/{space_id}/journals/{journal_id}/comments",
                        json={"text": "This is a test comment"},
                        headers={"Authorization": "Bearer test-token"}
                    )

                    # Assert
                    assert response.status_code == status.HTTP_201_CREATED
                    data = response.json()
                    assert data["text"] == "This is a test comment"
                    assert data["journalId"] == journal_id
                    assert data["spaceId"] == space_id
                    assert data["author"] == user_id

    def test_create_journal_comment_with_reply(self, test_client):
        """Test creating a reply to a journal comment."""
        # Arrange
        space_id = str(uuid.uuid4())
        journal_id = str(uuid.uuid4())
        parent_comment_id = str(uuid.uuid4())
        user_id = "user-123"
        comment_id = str(uuid.uuid4())
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

                with patch('app.api.routes.journal_comments.get_journal_comment_service') as mock_service_getter:
                    mock_service = Mock()
                    mock_service_getter.return_value = mock_service
                    mock_service.is_space_member.return_value = True

                    from app.models.journal_comment import JournalCommentModel
                    mock_comment = JournalCommentModel(
                        id=comment_id,
                        journalId=journal_id,
                        spaceId=space_id,
                        text="This is a reply",
                        author=user_id,
                        authorName="Test User",
                        parentCommentId=parent_comment_id,
                        createdAt=timestamp,
                        updatedAt=timestamp,
                        isEdited=False,
                        mentions=[]
                    )
                    mock_service.create_comment = AsyncMock(return_value=mock_comment)

                    # Act
                    response = test_client.post(
                        f"/api/spaces/{space_id}/journals/{journal_id}/comments",
                        json={
                            "text": "This is a reply",
                            "parentCommentId": parent_comment_id
                        },
                        headers={"Authorization": "Bearer test-token"}
                    )

                    # Assert
                    assert response.status_code == status.HTTP_201_CREATED
                    data = response.json()
                    assert data["parentCommentId"] == parent_comment_id

    def test_create_journal_comment_unauthorized(self, test_client):
        """Test that non-members cannot create comments."""
        # Arrange
        space_id = str(uuid.uuid4())
        journal_id = str(uuid.uuid4())
        user_id = "user-123"

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
                    "username": "testuser"
                }

                with patch('app.api.routes.journal_comments.get_journal_comment_service') as mock_service_getter:
                    mock_service = Mock()
                    mock_service_getter.return_value = mock_service
                    mock_service.is_space_member.return_value = False  # Not a member

                    # Act
                    response = test_client.post(
                        f"/api/spaces/{space_id}/journals/{journal_id}/comments",
                        json={"text": "This is a test comment"},
                        headers={"Authorization": "Bearer test-token"}
                    )

                    # Assert
                    assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_journal_comments_success(self, test_client):
        """Test successful retrieval of journal comments."""
        # Arrange
        space_id = str(uuid.uuid4())
        journal_id = str(uuid.uuid4())
        user_id = "user-123"
        comment_id = str(uuid.uuid4())
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
                    "username": "testuser"
                }

                with patch('app.api.routes.journal_comments.get_journal_comment_service') as mock_service_getter:
                    mock_service = Mock()
                    mock_service_getter.return_value = mock_service
                    mock_service.is_space_member.return_value = True

                    from app.models.journal_comment import JournalCommentModel
                    mock_comments = [
                        JournalCommentModel(
                            id=comment_id,
                            journalId=journal_id,
                            spaceId=space_id,
                            text="Test comment",
                            author=user_id,
                            authorName="Test User",
                            createdAt=timestamp,
                            updatedAt=timestamp,
                            isEdited=False,
                            mentions=[]
                        )
                    ]
                    mock_service.get_comments_for_journal = AsyncMock(return_value=mock_comments)

                    # Act
                    response = test_client.get(
                        f"/api/spaces/{space_id}/journals/{journal_id}/comments",
                        headers={"Authorization": "Bearer test-token"}
                    )

                    # Assert
                    assert response.status_code == status.HTTP_200_OK
                    data = response.json()
                    assert "comments" in data
                    assert data["count"] == 1
                    assert data["comments"][0]["id"] == comment_id

    def test_update_journal_comment_success(self, test_client):
        """Test successful update of a journal comment."""
        # Arrange
        space_id = str(uuid.uuid4())
        comment_id = str(uuid.uuid4())
        user_id = "user-123"
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
                    "username": "testuser"
                }

                with patch('app.api.routes.journal_comments.get_journal_comment_service') as mock_service_getter:
                    mock_service = Mock()
                    mock_service_getter.return_value = mock_service
                    mock_service.is_space_member.return_value = True

                    from app.models.journal_comment import JournalCommentModel
                    mock_comment = JournalCommentModel(
                        id=comment_id,
                        journalId=str(uuid.uuid4()),
                        spaceId=space_id,
                        text="Updated text",
                        author=user_id,
                        authorName="Test User",
                        createdAt=timestamp,
                        updatedAt=timestamp,
                        isEdited=True,
                        mentions=[]
                    )
                    mock_service.update_comment = AsyncMock(return_value=mock_comment)

                    # Act
                    response = test_client.put(
                        f"/api/spaces/{space_id}/journal-comments/{comment_id}",
                        json={"text": "Updated text"},
                        headers={"Authorization": "Bearer test-token"}
                    )

                    # Assert
                    assert response.status_code == status.HTTP_200_OK
                    data = response.json()
                    assert data["text"] == "Updated text"
                    assert data["isEdited"] is True

    def test_update_journal_comment_not_author(self, test_client):
        """Test that non-authors cannot update comments."""
        # Arrange
        space_id = str(uuid.uuid4())
        comment_id = str(uuid.uuid4())
        user_id = "user-123"

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
                    "username": "testuser"
                }

                with patch('app.api.routes.journal_comments.get_journal_comment_service') as mock_service_getter:
                    mock_service = Mock()
                    mock_service_getter.return_value = mock_service
                    mock_service.is_space_member.return_value = True
                    mock_service.update_comment = AsyncMock(return_value=None)  # Returns None for not found/unauthorized

                    # Act
                    response = test_client.put(
                        f"/api/spaces/{space_id}/journal-comments/{comment_id}",
                        json={"text": "Updated text"},
                        headers={"Authorization": "Bearer test-token"}
                    )

                    # Assert
                    assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_journal_comment_success(self, test_client):
        """Test successful deletion of a journal comment."""
        # Arrange
        space_id = str(uuid.uuid4())
        comment_id = str(uuid.uuid4())
        user_id = "user-123"

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
                    "username": "testuser"
                }

                with patch('app.api.routes.journal_comments.get_journal_comment_service') as mock_service_getter:
                    mock_service = Mock()
                    mock_service_getter.return_value = mock_service
                    mock_service.is_space_member.return_value = True
                    mock_service.delete_comment = AsyncMock(return_value=True)

                    # Act
                    response = test_client.delete(
                        f"/api/spaces/{space_id}/journal-comments/{comment_id}",
                        headers={"Authorization": "Bearer test-token"}
                    )

                    # Assert
                    assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_delete_journal_comment_not_found(self, test_client):
        """Test deleting a non-existent comment returns 404."""
        # Arrange
        space_id = str(uuid.uuid4())
        comment_id = str(uuid.uuid4())
        user_id = "user-123"

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
                    "username": "testuser"
                }

                with patch('app.api.routes.journal_comments.get_journal_comment_service') as mock_service_getter:
                    mock_service = Mock()
                    mock_service_getter.return_value = mock_service
                    mock_service.is_space_member.return_value = True
                    mock_service.delete_comment = AsyncMock(return_value=False)

                    # Act
                    response = test_client.delete(
                        f"/api/spaces/{space_id}/journal-comments/{comment_id}",
                        headers={"Authorization": "Bearer test-token"}
                    )

                    # Assert
                    assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_comment_count_success(self, test_client):
        """Test getting the comment count for a journal."""
        # Arrange
        space_id = str(uuid.uuid4())
        journal_id = str(uuid.uuid4())
        user_id = "user-123"

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
                    "username": "testuser"
                }

                with patch('app.api.routes.journal_comments.get_journal_comment_service') as mock_service_getter:
                    mock_service = Mock()
                    mock_service_getter.return_value = mock_service
                    mock_service.is_space_member.return_value = True
                    mock_service.get_comment_count = AsyncMock(return_value=5)

                    # Act
                    response = test_client.get(
                        f"/api/spaces/{space_id}/journals/{journal_id}/comments/count",
                        headers={"Authorization": "Bearer test-token"}
                    )

                    # Assert
                    assert response.status_code == status.HTTP_200_OK
                    data = response.json()
                    assert data["count"] == 5


class TestJournalCommentService:
    """Tests for JournalCommentService functionality."""

    @pytest.mark.asyncio
    async def test_create_comment(self):
        """Test creating a journal comment via service."""
        from app.services.journal_comment_service import JournalCommentService
        from app.models.journal_comment import CreateJournalCommentRequest

        # Arrange
        with patch('app.services.journal_comment_service.get_db') as mock_db:
            mock_db_instance = Mock()
            mock_db.return_value = mock_db_instance

            mock_db_instance.get_item.return_value = {'title': 'Test Journal'}

            with patch('app.services.activity.get_dynamodb_table') as mock_table:
                mock_table.return_value = Mock()

                service = JournalCommentService()
                space_id = str(uuid.uuid4())
                journal_id = str(uuid.uuid4())
                user_id = "user-123"

                request = CreateJournalCommentRequest(text="Test comment")

                # Act
                comment = await service.create_comment(
                    space_id=space_id,
                    journal_id=journal_id,
                    user_id=user_id,
                    user_name="Test User",
                    request=request
                )

                # Assert
                assert comment.text == "Test comment"
                assert comment.space_id == space_id
                assert comment.journal_id == journal_id
                assert comment.author == user_id
                mock_db_instance.put_item.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_comments_for_journal(self):
        """Test retrieving comments for a journal."""
        from app.services.journal_comment_service import JournalCommentService

        # Arrange
        space_id = str(uuid.uuid4())
        journal_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()

        with patch('app.services.journal_comment_service.get_db') as mock_db:
            mock_db_instance = Mock()
            mock_db.return_value = mock_db_instance

            mock_db_instance.query.return_value = [
                {
                    "EntityType": "JournalComment",
                    "id": str(uuid.uuid4()),
                    "journalId": journal_id,
                    "spaceId": space_id,
                    "text": "Comment 1",
                    "author": "user-1",
                    "authorName": "User 1",
                    "createdAt": timestamp,
                    "updatedAt": timestamp,
                    "isEdited": False,
                    "mentions": []
                },
                {
                    "EntityType": "JournalComment",
                    "id": str(uuid.uuid4()),
                    "journalId": journal_id,
                    "spaceId": space_id,
                    "text": "Comment 2",
                    "author": "user-2",
                    "authorName": "User 2",
                    "createdAt": timestamp,
                    "updatedAt": timestamp,
                    "isEdited": False,
                    "mentions": []
                }
            ]

            service = JournalCommentService()

            # Act
            comments = await service.get_comments_for_journal(space_id, journal_id)

            # Assert
            assert len(comments) == 2
            assert comments[0].text == "Comment 1"
            assert comments[1].text == "Comment 2"

    def test_activity_type_exists(self):
        """Test that JOURNAL_COMMENT_CREATED activity type exists."""
        from app.models.activity import ActivityType

        assert ActivityType.JOURNAL_COMMENT_CREATED
        assert ActivityType.JOURNAL_COMMENT_CREATED.value == "journal_comment_created"


class TestJournalCommentModel:
    """Tests for JournalComment model."""

    def test_model_serialization(self):
        """Test that model serializes with correct field aliases."""
        from app.models.journal_comment import JournalCommentModel

        comment = JournalCommentModel(
            id="test-id",
            journalId="journal-123",
            spaceId="space-456",
            text="Test comment",
            author="user-789",
            authorName="Test User",
            createdAt="2024-01-01T00:00:00Z",
            updatedAt="2024-01-01T00:00:00Z",
            isEdited=False,
            mentions=["user-abc"]
        )

        data = comment.model_dump(by_alias=True)

        assert data["journalId"] == "journal-123"
        assert data["spaceId"] == "space-456"
        assert data["authorName"] == "Test User"
        assert data["isEdited"] is False
        assert "user-abc" in data["mentions"]

    def test_db_item_conversion(self):
        """Test conversion between model and DynamoDB item."""
        from app.models.journal_comment import (
            JournalCommentModel,
            journal_comment_to_db_item,
            db_item_to_journal_comment
        )

        # Create a model
        comment = JournalCommentModel(
            id="test-id",
            journalId="journal-123",
            spaceId="space-456",
            text="Test comment",
            author="user-789",
            authorName="Test User",
            parentCommentId="parent-123",
            createdAt="2024-01-01T00:00:00Z",
            updatedAt="2024-01-01T00:00:00Z",
            isEdited=True,
            mentions=["user-abc"]
        )

        # Convert to DB item
        db_item = journal_comment_to_db_item(comment)

        # Verify keys
        assert db_item["PK"] == "SPACE#space-456"
        assert db_item["SK"] == "JOURNAL_COMMENT#test-id"
        assert db_item["GSI1PK"] == "JOURNAL#journal-123"
        assert db_item["EntityType"] == "JournalComment"

        # Convert back to model
        restored = db_item_to_journal_comment(db_item)

        assert restored.id == comment.id
        assert restored.journal_id == comment.journal_id
        assert restored.space_id == comment.space_id
        assert restored.text == comment.text
        assert restored.parent_comment_id == comment.parent_comment_id
        assert restored.is_edited == comment.is_edited
