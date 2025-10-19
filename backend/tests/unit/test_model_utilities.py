"""
Tests for model utility functions and validators.
"""

import pytest
from pydantic import ValidationError

from app.models.common import PaginationParams
from app.models.highlight import (
    HighlightModel,
    CommentModel,
    TextRange,
    highlight_to_db_item,
    db_item_to_highlight,
    comment_to_db_item,
    db_item_to_comment,
)
from app.models.journal import JournalCreateRequest, JournalUpdate


class TestCommonModels:
    """Tests for common model validators."""

    def test_pagination_params_valid(self):
        """Test valid pagination params."""
        params = PaginationParams(page=1, page_size=20)
        assert params.page == 1
        assert params.page_size == 20

    def test_pagination_params_invalid_page(self):
        """Test pagination with invalid page."""
        with pytest.raises(ValidationError) as exc_info:
            PaginationParams(page=0, page_size=20)
        assert "page" in str(exc_info.value).lower()

    def test_pagination_params_invalid_page_size_low(self):
        """Test pagination with page_size too low."""
        with pytest.raises(ValidationError) as exc_info:
            PaginationParams(page=1, page_size=0)
        assert "page_size" in str(exc_info.value).lower()

    def test_pagination_params_invalid_page_size_high(self):
        """Test pagination with page_size too high."""
        with pytest.raises(ValidationError) as exc_info:
            PaginationParams(page=1, page_size=101)
        assert "page_size" in str(exc_info.value).lower()


class TestHighlightUtilities:
    """Tests for highlight model utility functions."""

    def test_highlight_to_db_item(self):
        """Test converting highlight model to DynamoDB item."""
        highlight = HighlightModel(
            id="highlight-123",
            journalEntryId="journal-456",
            spaceId="space-789",
            highlightedText="Test text",
            textRange=TextRange(startOffset=0, endOffset=9),
            color="yellow",
            createdBy="user-1",
            createdByName="Test User",
            createdAt="2025-01-01T00:00:00",
            updatedAt="2025-01-01T00:00:00",
            commentCount=5,
        )

        item = highlight_to_db_item(highlight)

        assert item["PK"] == "SPACE#space-789"
        assert item["SK"] == "HIGHLIGHT#highlight-123"
        assert item["id"] == "highlight-123"
        assert item["highlightedText"] == "Test text"
        assert item["commentCount"] == 5

    def test_db_item_to_highlight(self):
        """Test converting DynamoDB item to highlight model."""
        item = {
            "id": "highlight-123",
            "journalEntryId": "journal-456",
            "spaceId": "space-789",
            "highlightedText": "Test text",
            "textRange": {"startOffset": 0, "endOffset": 9},
            "color": "yellow",
            "createdBy": "user-1",
            "createdByName": "Test User",
            "createdAt": "2025-01-01T00:00:00",
            "updatedAt": "2025-01-01T00:00:00",
            "commentCount": 5,
        }

        highlight = db_item_to_highlight(item)

        assert highlight.id == "highlight-123"
        assert highlight.journal_entry_id == "journal-456"
        assert highlight.highlighted_text == "Test text"
        assert highlight.comment_count == 5

    def test_comment_to_db_item(self):
        """Test converting comment model to DynamoDB item."""
        comment = CommentModel(
            id="comment-123",
            highlightId="highlight-456",
            spaceId="space-789",
            text="Great point!",
            author="user-1",
            authorName="Test User",
            parentCommentId=None,
            mentions=["user-2"],
            createdAt="2025-01-01T00:00:00",
            updatedAt="2025-01-01T00:00:00",
            isEdited=False,
        )

        item = comment_to_db_item(comment)

        assert item["PK"] == "SPACE#space-789"
        assert item["SK"] == "COMMENT#comment-123"
        assert item["GSI1PK"] == "HIGHLIGHT#highlight-456"
        assert item["text"] == "Great point!"
        assert item["mentions"] == ["user-2"]

    def test_db_item_to_comment(self):
        """Test converting DynamoDB item to comment model."""
        item = {
            "id": "comment-123",
            "highlightId": "highlight-456",
            "spaceId": "space-789",
            "text": "Great point!",
            "author": "user-1",
            "authorName": "Test User",
            "parentCommentId": None,
            "mentions": ["user-2"],
            "createdAt": "2025-01-01T00:00:00",
            "updatedAt": "2025-01-01T00:00:00",
            "isEdited": False,
        }

        comment = db_item_to_comment(item)

        assert comment.id == "comment-123"
        assert comment.highlight_id == "highlight-456"
        assert comment.text == "Great point!"
        assert comment.mentions == ["user-2"]


class TestJournalValidators:
    """Tests for journal model validators."""

    def test_journal_create_long_title(self):
        """Test journal creation with title too long."""
        with pytest.raises(ValidationError) as exc_info:
            JournalCreateRequest(
                title="x" * 201,  # Over 200 characters
                content="Valid content"
            )
        assert "title" in str(exc_info.value).lower()

    def test_journal_update_empty_title(self):
        """Test journal update with empty title."""
        with pytest.raises(ValidationError) as exc_info:
            JournalUpdate(
                title="   "  # Only whitespace
            )
        assert "title" in str(exc_info.value).lower()

    def test_journal_update_long_title(self):
        """Test journal update with title too long."""
        with pytest.raises(ValidationError) as exc_info:
            JournalUpdate(
                title="x" * 201  # Over 200 characters
            )
        assert "title" in str(exc_info.value).lower()

    def test_journal_update_empty_content(self):
        """Test journal update with empty content."""
        with pytest.raises(ValidationError) as exc_info:
            JournalUpdate(
                content="   "  # Only whitespace
            )
        assert "content" in str(exc_info.value).lower()
