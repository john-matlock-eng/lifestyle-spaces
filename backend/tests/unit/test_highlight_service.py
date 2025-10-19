"""
Unit tests for highlight service.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from app.services.highlight_service import HighlightService, CommentService
from app.models.highlight import (
    HighlightModel,
    CommentModel,
    CreateHighlightRequest,
    CreateCommentRequest,
    TextRange,
)


@pytest.fixture
def highlight_service():
    """Create highlight service instance."""
    with patch("app.services.highlight_service.get_dynamodb_client"):
        service = HighlightService()
        service.dynamodb = Mock()
        return service


@pytest.fixture
def comment_service():
    """Create comment service instance."""
    with patch("app.services.highlight_service.get_dynamodb_client"):
        service = CommentService()
        service.dynamodb = Mock()
        service.highlight_service.dynamodb = Mock()
        return service


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
    async def test_create_highlight(self, highlight_service, sample_highlight_request):
        """Test creating a highlight."""
        space_id = "space-123"
        journal_id = "journal-456"
        user_id = "user-789"
        user_name = "John Doe"

        # Mock DynamoDB put_item
        highlight_service.dynamodb.put_item = Mock()

        # Create highlight
        highlight = await highlight_service.create_highlight(
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
        highlight_service.dynamodb.put_item.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_highlights_for_journal(self, highlight_service):
        """Test retrieving highlights for a journal entry."""
        space_id = "space-123"
        journal_id = "journal-456"

        # Mock DynamoDB query response
        highlight_service.dynamodb.query.return_value = {
            "Items": [
                {
                    "EntityType": {"S": "Highlight"},
                    "id": {"S": "highlight-1"},
                    "journalEntryId": {"S": journal_id},
                    "spaceId": {"S": space_id},
                    "highlightedText": {"S": "Test text"},
                    "textRange": {
                        "M": {
                            "startOffset": {"N": "0"},
                            "endOffset": {"N": "9"},
                        }
                    },
                    "color": {"S": "yellow"},
                    "createdBy": {"S": "user-1"},
                    "createdByName": {"S": "User One"},
                    "createdAt": {"S": "2025-01-01T00:00:00"},
                    "updatedAt": {"S": "2025-01-01T00:00:00"},
                    "commentCount": {"N": "0"},
                }
            ]
        }

        # Get highlights
        highlights = await highlight_service.get_highlights_for_journal(space_id, journal_id)

        # Verify results
        assert len(highlights) == 1
        assert highlights[0].id == "highlight-1"
        assert highlights[0].highlighted_text == "Test text"

    @pytest.mark.asyncio
    async def test_get_highlight(self, highlight_service):
        """Test retrieving a specific highlight."""
        space_id = "space-123"
        highlight_id = "highlight-456"

        # Mock DynamoDB get_item response
        highlight_service.dynamodb.get_item.return_value = {
            "Item": {
                "id": {"S": highlight_id},
                "journalEntryId": {"S": "journal-123"},
                "spaceId": {"S": space_id},
                "highlightedText": {"S": "Test text"},
                "textRange": {
                    "M": {
                        "startOffset": {"N": "0"},
                        "endOffset": {"N": "9"},
                    }
                },
                "color": {"S": "yellow"},
                "createdBy": {"S": "user-1"},
                "createdByName": {"S": "User One"},
                "createdAt": {"S": "2025-01-01T00:00:00"},
                "updatedAt": {"S": "2025-01-01T00:00:00"},
                "commentCount": {"N": "0"},
            }
        }

        # Get highlight
        highlight = await highlight_service.get_highlight(space_id, highlight_id)

        # Verify results
        assert highlight is not None
        assert highlight.id == highlight_id
        assert highlight.highlighted_text == "Test text"

    @pytest.mark.asyncio
    async def test_delete_highlight_success(self, highlight_service):
        """Test deleting a highlight (owner)."""
        space_id = "space-123"
        highlight_id = "highlight-456"
        user_id = "user-789"

        # Mock get_highlight to return owned highlight
        mock_highlight = Mock(spec=HighlightModel)
        mock_highlight.created_by = user_id
        highlight_service.get_highlight = Mock(return_value=mock_highlight)

        # Mock delete_item
        highlight_service.dynamodb.delete_item = Mock()

        # Delete highlight
        result = await highlight_service.delete_highlight(space_id, highlight_id, user_id)

        # Verify success
        assert result is True
        highlight_service.dynamodb.delete_item.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_highlight_not_owner(self, highlight_service):
        """Test deleting a highlight (not owner)."""
        space_id = "space-123"
        highlight_id = "highlight-456"
        user_id = "user-789"

        # Mock get_highlight to return highlight owned by different user
        mock_highlight = Mock(spec=HighlightModel)
        mock_highlight.created_by = "different-user"
        highlight_service.get_highlight = Mock(return_value=mock_highlight)

        # Delete highlight
        result = await highlight_service.delete_highlight(space_id, highlight_id, user_id)

        # Verify failure
        assert result is False


class TestCommentService:
    """Tests for CommentService."""

    @pytest.mark.asyncio
    async def test_create_comment(self, comment_service, sample_comment_request):
        """Test creating a comment."""
        space_id = "space-123"
        highlight_id = "highlight-456"
        user_id = "user-789"
        user_name = "Jane Doe"

        # Mock DynamoDB put_item
        comment_service.dynamodb.put_item = Mock()
        comment_service.highlight_service.increment_comment_count = Mock()

        # Create comment
        comment = await comment_service.create_comment(
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
        comment_service.dynamodb.put_item.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_comments_for_highlight(self, comment_service):
        """Test retrieving comments for a highlight."""
        space_id = "space-123"
        highlight_id = "highlight-456"

        # Mock DynamoDB query response
        comment_service.dynamodb.query.return_value = {
            "Items": [
                {
                    "EntityType": {"S": "Comment"},
                    "id": {"S": "comment-1"},
                    "highlightId": {"S": highlight_id},
                    "spaceId": {"S": space_id},
                    "text": {"S": "Great insight!"},
                    "author": {"S": "user-1"},
                    "authorName": {"S": "User One"},
                    "mentions": {"L": []},
                    "createdAt": {"S": "2025-01-01T00:00:00"},
                    "updatedAt": {"S": "2025-01-01T00:00:00"},
                    "isEdited": {"BOOL": False},
                }
            ]
        }

        # Get comments
        comments = await comment_service.get_comments_for_highlight(space_id, highlight_id)

        # Verify results
        assert len(comments) == 1
        assert comments[0].id == "comment-1"
        assert comments[0].text == "Great insight!"

    @pytest.mark.asyncio
    async def test_update_comment_success(self, comment_service):
        """Test updating a comment (owner)."""
        space_id = "space-123"
        comment_id = "comment-456"
        user_id = "user-789"
        new_text = "Updated comment"

        # Mock DynamoDB get_item response
        comment_service.dynamodb.get_item.return_value = {
            "Item": {
                "id": {"S": comment_id},
                "highlightId": {"S": "highlight-123"},
                "spaceId": {"S": space_id},
                "text": {"S": "Original text"},
                "author": {"S": user_id},
                "authorName": {"S": "User One"},
                "mentions": {"L": []},
                "createdAt": {"S": "2025-01-01T00:00:00"},
                "updatedAt": {"S": "2025-01-01T00:00:00"},
                "isEdited": {"BOOL": False},
            }
        }

        # Mock update_item
        comment_service.dynamodb.update_item = Mock()

        # Update comment
        comment = await comment_service.update_comment(space_id, comment_id, user_id, new_text)

        # Verify success
        assert comment is not None
        assert comment.text == new_text
        assert comment.is_edited is True
        comment_service.dynamodb.update_item.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_comment_success(self, comment_service):
        """Test deleting a comment (owner)."""
        space_id = "space-123"
        comment_id = "comment-456"
        user_id = "user-789"
        highlight_id = "highlight-123"

        # Mock DynamoDB get_item response
        comment_service.dynamodb.get_item.return_value = {
            "Item": {
                "id": {"S": comment_id},
                "highlightId": {"S": highlight_id},
                "spaceId": {"S": space_id},
                "text": {"S": "Comment text"},
                "author": {"S": user_id},
                "authorName": {"S": "User One"},
                "mentions": {"L": []},
                "createdAt": {"S": "2025-01-01T00:00:00"},
                "updatedAt": {"S": "2025-01-01T00:00:00"},
                "isEdited": {"BOOL": False},
            }
        }

        # Mock delete_item and decrement
        comment_service.dynamodb.delete_item = Mock()
        comment_service.highlight_service.decrement_comment_count = Mock()

        # Delete comment
        result = await comment_service.delete_comment(space_id, comment_id, user_id)

        # Verify success
        assert result is True
        comment_service.dynamodb.delete_item.assert_called_once()
