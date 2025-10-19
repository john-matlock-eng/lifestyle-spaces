"""
Unit tests for highlight service.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

from app.services.highlight_service import HighlightService, CommentService
from app.models.highlight import (
    CreateHighlightRequest,
    CreateCommentRequest,
    TextRange,
)


@pytest.fixture
def mock_db():
    """Create mock database client."""
    db = Mock()
    db.put_item = Mock()
    db.get_item = Mock()
    db.query = Mock()
    db.delete_item = Mock()
    db.update_item = Mock()
    return db


@pytest.fixture
def sample_text_range():
    """Sample text range."""
    return TextRange(startOffset=0, endOffset=10)


@pytest.fixture
def sample_highlight_request(sample_text_range):
    """Sample highlight creation request."""
    return CreateHighlightRequest(
        highlightedText="Sample text",
        textRange=sample_text_range,
        color="yellow",
    )


@pytest.fixture
def sample_comment_request():
    """Sample comment creation request."""
    return CreateCommentRequest(
        text="Great point!",
        parentCommentId=None,
        mentions=["user1"],
    )


class TestHighlightService:
    """Tests for HighlightService."""

    @pytest.mark.asyncio
    async def test_create_highlight(self, mock_db, sample_highlight_request):
        """Test creating a highlight."""
        with patch("app.services.highlight_service.get_db", return_value=mock_db):
            service = HighlightService()

            space_id = "space-123"
            journal_id = "journal-456"
            user_id = "user-789"
            user_name = "John Doe"

            # Create highlight
            highlight = await service.create_highlight(
                space_id=space_id,
                journal_entry_id=journal_id,
                user_id=user_id,
                user_name=user_name,
                request=sample_highlight_request,
            )

            # Verify highlight was created correctly
            assert highlight.journal_entry_id == journal_id
            assert highlight.space_id == space_id
            assert highlight.highlighted_text == "Sample text"
            assert highlight.color == "yellow"
            assert highlight.created_by == user_id
            assert highlight.created_by_name == user_name
            assert highlight.comment_count == 0

            # Verify DynamoDB was called
            mock_db.put_item.assert_called_once()
            call_args = mock_db.put_item.call_args[0][0]
            assert call_args["PK"] == f"SPACE#{space_id}"
            assert call_args["EntityType"] == "Highlight"

    @pytest.mark.asyncio
    async def test_get_highlights_for_journal(self, mock_db):
        """Test retrieving highlights for a journal entry."""
        space_id = "space-123"
        journal_id = "journal-456"

        # Mock DynamoDB query response
        mock_db.query.return_value = [
            {
                "EntityType": "Highlight",
                "id": "highlight-1",
                "journalEntryId": journal_id,
                "spaceId": space_id,
                "highlightedText": "Test text",
                "textRange": {
                    "startOffset": 0,
                    "endOffset": 9,
                },
                "color": "yellow",
                "createdBy": "user-1",
                "createdByName": "User One",
                "createdAt": "2025-01-01T00:00:00",
                "updatedAt": "2025-01-01T00:00:00",
                "commentCount": 0,
            }
        ]

        with patch("app.services.highlight_service.get_db", return_value=mock_db):
            service = HighlightService()

            # Get highlights
            highlights = await service.get_highlights_for_journal(space_id, journal_id)

            # Verify results
            assert len(highlights) == 1
            assert highlights[0].id == "highlight-1"
            assert highlights[0].highlighted_text == "Test text"
            mock_db.query.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_highlight_success(self, mock_db):
        """Test deleting a highlight (owner)."""
        space_id = "space-123"
        highlight_id = "highlight-456"
        user_id = "user-789"

        # Mock get_item to return owned highlight
        mock_db.get_item.return_value = {
            "id": highlight_id,
            "journalEntryId": "journal-123",
            "spaceId": space_id,
            "highlightedText": "Test text",
            "textRange": {"startOffset": 0, "endOffset": 9},
            "color": "yellow",
            "createdBy": user_id,
            "createdByName": "User",
            "createdAt": "2025-01-01T00:00:00",
            "updatedAt": "2025-01-01T00:00:00",
            "commentCount": 0,
        }

        with patch("app.services.highlight_service.get_db", return_value=mock_db):
            service = HighlightService()

            # Delete highlight
            result = await service.delete_highlight(space_id, highlight_id, user_id)

            # Verify success
            assert result is True
            mock_db.delete_item.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_highlight_not_owner(self, mock_db):
        """Test deleting a highlight (not owner)."""
        space_id = "space-123"
        highlight_id = "highlight-456"
        user_id = "user-789"

        # Mock get_item to return highlight owned by different user
        mock_db.get_item.return_value = {
            "id": highlight_id,
            "journalEntryId": "journal-123",
            "spaceId": space_id,
            "highlightedText": "Test text",
            "textRange": {"startOffset": 0, "endOffset": 9},
            "color": "yellow",
            "createdBy": "different-user",
            "createdByName": "Different User",
            "createdAt": "2025-01-01T00:00:00",
            "updatedAt": "2025-01-01T00:00:00",
            "commentCount": 0,
        }

        with patch("app.services.highlight_service.get_db", return_value=mock_db):
            service = HighlightService()

            # Delete highlight
            result = await service.delete_highlight(space_id, highlight_id, user_id)

            # Verify failure
            assert result is False
            mock_db.delete_item.assert_not_called()


class TestCommentService:
    """Tests for CommentService."""

    @pytest.mark.asyncio
    async def test_create_comment(self, mock_db, sample_comment_request):
        """Test creating a comment."""
        space_id = "space-123"
        highlight_id = "highlight-456"
        user_id = "user-789"
        user_name = "Jane Doe"

        with patch("app.services.highlight_service.get_db", return_value=mock_db):
            service = CommentService()

            # Mock increment_comment_count
            service.highlight_service.increment_comment_count = AsyncMock()

            # Create comment
            comment = await service.create_comment(
                space_id=space_id,
                highlight_id=highlight_id,
                user_id=user_id,
                user_name=user_name,
                request=sample_comment_request,
            )

            # Verify comment was created correctly
            assert comment.highlight_id == highlight_id
            assert comment.space_id == space_id
            assert comment.text == "Great point!"
            assert comment.author == user_id
            assert comment.author_name == user_name
            assert comment.mentions == ["user1"]

            # Verify DynamoDB was called
            mock_db.put_item.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_comments_for_highlight(self, mock_db):
        """Test retrieving comments for a highlight."""
        space_id = "space-123"
        highlight_id = "highlight-456"

        # Mock DynamoDB query response
        mock_db.query.return_value = [
            {
                "EntityType": "Comment",
                "id": "comment-1",
                "highlightId": highlight_id,
                "spaceId": space_id,
                "text": "Great insight!",
                "author": "user-1",
                "authorName": "User One",
                "mentions": [],
                "createdAt": "2025-01-01T00:00:00",
                "updatedAt": "2025-01-01T00:00:00",
                "isEdited": False,
            }
        ]

        with patch("app.services.highlight_service.get_db", return_value=mock_db):
            service = CommentService()

            # Get comments
            comments = await service.get_comments_for_highlight(space_id, highlight_id)

            # Verify results
            assert len(comments) == 1
            assert comments[0].id == "comment-1"
            assert comments[0].text == "Great insight!"

    @pytest.mark.asyncio
    async def test_delete_comment_success(self, mock_db):
        """Test deleting a comment (owner)."""
        space_id = "space-123"
        comment_id = "comment-456"
        user_id = "user-789"
        highlight_id = "highlight-123"

        # Mock DynamoDB get_item response
        mock_db.get_item.return_value = {
            "id": comment_id,
            "highlightId": highlight_id,
            "spaceId": space_id,
            "text": "Comment text",
            "author": user_id,
            "authorName": "User One",
            "mentions": [],
            "createdAt": "2025-01-01T00:00:00",
            "updatedAt": "2025-01-01T00:00:00",
            "isEdited": False,
        }

        with patch("app.services.highlight_service.get_db", return_value=mock_db):
            service = CommentService()

            # Mock decrement_comment_count
            service.highlight_service.decrement_comment_count = AsyncMock()

            # Delete comment
            result = await service.delete_comment(space_id, comment_id, user_id)

            # Verify success
            assert result is True
            mock_db.delete_item.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_comment_not_found(self, mock_db):
        """Test deleting a comment that doesn't exist."""
        space_id = "space-123"
        comment_id = "nonexistent-comment"
        user_id = "user-789"

        # Mock DynamoDB get_item response (not found)
        mock_db.get_item.return_value = None

        with patch("app.services.highlight_service.get_db", return_value=mock_db):
            service = CommentService()

            # Delete comment
            result = await service.delete_comment(space_id, comment_id, user_id)

            # Verify failure
            assert result is False
            mock_db.delete_item.assert_not_called()

    @pytest.mark.asyncio
    async def test_delete_comment_not_owner(self, mock_db):
        """Test deleting a comment (not owner)."""
        space_id = "space-123"
        comment_id = "comment-456"
        user_id = "user-789"
        highlight_id = "highlight-123"

        # Mock DynamoDB get_item response (different author)
        mock_db.get_item.return_value = {
            "id": comment_id,
            "highlightId": highlight_id,
            "spaceId": space_id,
            "text": "Comment text",
            "author": "different-user",
            "authorName": "Different User",
            "mentions": [],
            "createdAt": "2025-01-01T00:00:00",
            "updatedAt": "2025-01-01T00:00:00",
            "isEdited": False,
        }

        with patch("app.services.highlight_service.get_db", return_value=mock_db):
            service = CommentService()

            # Delete comment
            result = await service.delete_comment(space_id, comment_id, user_id)

            # Verify failure
            assert result is False
            mock_db.delete_item.assert_not_called()

    @pytest.mark.asyncio
    async def test_update_comment_success(self, mock_db):
        """Test updating a comment (owner)."""
        space_id = "space-123"
        comment_id = "comment-456"
        user_id = "user-789"

        # Mock DynamoDB get_item response
        mock_db.get_item.return_value = {
            "id": comment_id,
            "highlightId": "highlight-123",
            "spaceId": space_id,
            "text": "Old text",
            "author": user_id,
            "authorName": "User",
            "mentions": [],
            "createdAt": "2025-01-01T00:00:00",
            "updatedAt": "2025-01-01T00:00:00",
            "isEdited": False,
        }

        with patch("app.services.highlight_service.get_db", return_value=mock_db):
            service = CommentService()

            # Update comment
            updated = await service.update_comment(space_id, comment_id, user_id, "New text")

            # Verify success
            assert updated is not None
            assert updated.text == "New text"
            assert updated.is_edited is True
            mock_db.update_item.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_comment_not_found(self, mock_db):
        """Test updating a comment that doesn't exist."""
        space_id = "space-123"
        comment_id = "nonexistent-comment"
        user_id = "user-789"

        # Mock DynamoDB get_item response (not found)
        mock_db.get_item.return_value = None

        with patch("app.services.highlight_service.get_db", return_value=mock_db):
            service = CommentService()

            # Update comment
            updated = await service.update_comment(space_id, comment_id, user_id, "New text")

            # Verify failure
            assert updated is None
            mock_db.update_item.assert_not_called()

    @pytest.mark.asyncio
    async def test_update_comment_not_owner(self, mock_db):
        """Test updating a comment (not owner)."""
        space_id = "space-123"
        comment_id = "comment-456"
        user_id = "user-789"

        # Mock DynamoDB get_item response (different author)
        mock_db.get_item.return_value = {
            "id": comment_id,
            "highlightId": "highlight-123",
            "spaceId": space_id,
            "text": "Old text",
            "author": "different-user",
            "authorName": "Different User",
            "mentions": [],
            "createdAt": "2025-01-01T00:00:00",
            "updatedAt": "2025-01-01T00:00:00",
            "isEdited": False,
        }

        with patch("app.services.highlight_service.get_db", return_value=mock_db):
            service = CommentService()

            # Update comment
            updated = await service.update_comment(space_id, comment_id, user_id, "New text")

            # Verify failure
            assert updated is None
            mock_db.update_item.assert_not_called()


class TestHighlightServiceEdgeCases:
    """Tests for edge cases in HighlightService."""

    @pytest.mark.asyncio
    async def test_get_highlight_not_found(self, mock_db):
        """Test getting a highlight that doesn't exist."""
        space_id = "space-123"
        highlight_id = "nonexistent-highlight"

        # Mock DynamoDB get_item response (not found)
        mock_db.get_item.return_value = None

        with patch("app.services.highlight_service.get_db", return_value=mock_db):
            service = HighlightService()

            # Get highlight
            highlight = await service.get_highlight(space_id, highlight_id)

            # Verify not found
            assert highlight is None

    @pytest.mark.asyncio
    async def test_increment_comment_count(self, mock_db):
        """Test incrementing comment count on a highlight."""
        space_id = "space-123"
        highlight_id = "highlight-456"

        # Mock DynamoDB get_item response
        mock_db.get_item.return_value = {
            "id": highlight_id,
            "journalEntryId": "journal-123",
            "spaceId": space_id,
            "highlightedText": "Test text",
            "textRange": {"startOffset": 0, "endOffset": 9},
            "color": "yellow",
            "createdBy": "user-1",
            "createdByName": "User",
            "createdAt": "2025-01-01T00:00:00",
            "updatedAt": "2025-01-01T00:00:00",
            "commentCount": 5,
        }

        with patch("app.services.highlight_service.get_db", return_value=mock_db):
            service = HighlightService()

            # Increment comment count
            await service.increment_comment_count(space_id, highlight_id)

            # Verify update was called with incremented count
            mock_db.update_item.assert_called_once()
            call_args = mock_db.update_item.call_args[1]
            assert call_args["updates"]["commentCount"] == 6

    @pytest.mark.asyncio
    async def test_decrement_comment_count(self, mock_db):
        """Test decrementing comment count on a highlight."""
        space_id = "space-123"
        highlight_id = "highlight-456"

        # Mock DynamoDB get_item response
        mock_db.get_item.return_value = {
            "id": highlight_id,
            "journalEntryId": "journal-123",
            "spaceId": space_id,
            "highlightedText": "Test text",
            "textRange": {"startOffset": 0, "endOffset": 9},
            "color": "yellow",
            "createdBy": "user-1",
            "createdByName": "User",
            "createdAt": "2025-01-01T00:00:00",
            "updatedAt": "2025-01-01T00:00:00",
            "commentCount": 5,
        }

        with patch("app.services.highlight_service.get_db", return_value=mock_db):
            service = HighlightService()

            # Decrement comment count
            await service.decrement_comment_count(space_id, highlight_id)

            # Verify update was called with decremented count
            mock_db.update_item.assert_called_once()
            call_args = mock_db.update_item.call_args[1]
            assert call_args["updates"]["commentCount"] == 4

    @pytest.mark.asyncio
    async def test_increment_comment_count_highlight_not_found(self, mock_db):
        """Test incrementing comment count when highlight doesn't exist."""
        space_id = "space-123"
        highlight_id = "nonexistent-highlight"

        # Mock DynamoDB get_item response (not found)
        mock_db.get_item.return_value = None

        with patch("app.services.highlight_service.get_db", return_value=mock_db):
            service = HighlightService()

            # Increment comment count
            await service.increment_comment_count(space_id, highlight_id)

            # Verify update was NOT called
            mock_db.update_item.assert_not_called()

    @pytest.mark.asyncio
    async def test_decrement_comment_count_highlight_not_found(self, mock_db):
        """Test decrementing comment count when highlight doesn't exist."""
        space_id = "space-123"
        highlight_id = "nonexistent-highlight"

        # Mock DynamoDB get_item response (not found)
        mock_db.get_item.return_value = None

        with patch("app.services.highlight_service.get_db", return_value=mock_db):
            service = HighlightService()

            # Decrement comment count
            await service.decrement_comment_count(space_id, highlight_id)

            # Verify update was NOT called
            mock_db.update_item.assert_not_called()
