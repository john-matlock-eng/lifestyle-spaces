"""
Unit tests for multi-section TipTap support in Highlight models.

Tests the section-aware highlight functionality:
- sectionId field in highlights
- Extracting highlights from multi-section TipTap documents
- DynamoDB serialization with sectionId
"""

import pytest
from app.models.highlight import (
    HighlightModel,
    TextRange,
    CreateHighlightRequest,
    TipTapHighlight,
    highlight_to_db_item,
    db_item_to_highlight,
    extract_highlights_from_tiptap,
    extract_highlights_from_multi_section_tiptap,
)


class TestHighlightModelSectionId:
    """Test HighlightModel with sectionId field."""

    def test_create_highlight_with_section_id(self):
        """Test creating highlight with sectionId."""
        highlight = HighlightModel(
            id="highlight-123",
            journalEntryId="journal-456",
            spaceId="space-789",
            sectionId="raw_thoughts",
            highlightedText="Important text",
            textRange=TextRange(startOffset=0, endOffset=10),
            color="yellow",
            createdBy="user-123",
            createdByName="Test User",
            createdAt="2024-01-01T00:00:00Z",
            updatedAt="2024-01-01T00:00:00Z",
        )

        assert highlight.section_id == "raw_thoughts"

    def test_create_highlight_without_section_id(self):
        """Test creating highlight without sectionId (backward compatible)."""
        highlight = HighlightModel(
            id="highlight-123",
            journalEntryId="journal-456",
            spaceId="space-789",
            highlightedText="Important text",
            textRange=TextRange(startOffset=0, endOffset=10),
            createdBy="user-123",
            createdByName="Test User",
            createdAt="2024-01-01T00:00:00Z",
            updatedAt="2024-01-01T00:00:00Z",
        )

        assert highlight.section_id is None


class TestCreateHighlightRequest:
    """Test CreateHighlightRequest with sectionId."""

    def test_create_request_with_section_id(self):
        """Test highlight creation request with sectionId."""
        request = CreateHighlightRequest(
            sectionId="action_plan",
            highlightedText="Test text",
            textRange=TextRange(startOffset=0, endOffset=10),
            color="blue",
        )

        assert request.section_id == "action_plan"

    def test_create_request_without_section_id(self):
        """Test highlight creation request without sectionId."""
        request = CreateHighlightRequest(
            highlightedText="Test text", textRange=TextRange(startOffset=0, endOffset=10)
        )

        assert request.section_id is None


class TestHighlightDBHelpers:
    """Test DynamoDB serialization helpers with sectionId."""

    def test_highlight_to_db_item_with_section_id(self):
        """Test converting highlight to DB item includes sectionId."""
        highlight = HighlightModel(
            id="highlight-123",
            journalEntryId="journal-456",
            spaceId="space-789",
            sectionId="raw_thoughts",
            highlightedText="Important text",
            textRange=TextRange(startOffset=0, endOffset=10),
            createdBy="user-123",
            createdByName="Test User",
            createdAt="2024-01-01T00:00:00Z",
            updatedAt="2024-01-01T00:00:00Z",
        )

        db_item = highlight_to_db_item(highlight)

        assert db_item["sectionId"] == "raw_thoughts"
        assert db_item["id"] == "highlight-123"
        assert db_item["PK"] == "SPACE#space-789"
        assert db_item["SK"] == "HIGHLIGHT#highlight-123"

    def test_highlight_to_db_item_without_section_id(self):
        """Test converting highlight without sectionId doesn't add field."""
        highlight = HighlightModel(
            id="highlight-123",
            journalEntryId="journal-456",
            spaceId="space-789",
            highlightedText="Important text",
            textRange=TextRange(startOffset=0, endOffset=10),
            createdBy="user-123",
            createdByName="Test User",
            createdAt="2024-01-01T00:00:00Z",
            updatedAt="2024-01-01T00:00:00Z",
        )

        db_item = highlight_to_db_item(highlight)

        assert "sectionId" not in db_item
        assert db_item["id"] == "highlight-123"

    def test_db_item_to_highlight_with_section_id(self):
        """Test converting DB item with sectionId to highlight model."""
        db_item = {
            "id": "highlight-123",
            "journalEntryId": "journal-456",
            "spaceId": "space-789",
            "sectionId": "action_plan",
            "highlightedText": "Important text",
            "textRange": {"startOffset": 0, "endOffset": 10},
            "color": "yellow",
            "createdBy": "user-123",
            "createdByName": "Test User",
            "createdAt": "2024-01-01T00:00:00Z",
            "updatedAt": "2024-01-01T00:00:00Z",
            "commentCount": 0,
        }

        highlight = db_item_to_highlight(db_item)

        assert highlight.section_id == "action_plan"
        assert highlight.id == "highlight-123"

    def test_db_item_to_highlight_without_section_id(self):
        """Test converting DB item without sectionId to highlight model."""
        db_item = {
            "id": "highlight-123",
            "journalEntryId": "journal-456",
            "spaceId": "space-789",
            "highlightedText": "Important text",
            "textRange": {"startOffset": 0, "endOffset": 10},
            "color": "yellow",
            "createdBy": "user-123",
            "createdByName": "Test User",
            "createdAt": "2024-01-01T00:00:00Z",
            "updatedAt": "2024-01-01T00:00:00Z",
            "commentCount": 0,
        }

        highlight = db_item_to_highlight(db_item)

        assert highlight.section_id is None


class TestExtractHighlightsFromTipTap:
    """Test extracting highlights from TipTap documents with section context."""

    def test_extract_with_section_id_parameter(self):
        """Test extract_highlights_from_tiptap() tags highlights with provided section_id."""
        tiptap_doc = {
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "Highlighted text",
                            "marks": [
                                {
                                    "type": "highlight",
                                    "attrs": {
                                        "id": "hl-123",
                                        "color": "yellow",
                                        "authorId": "user-456",
                                        "authorName": "Test User",
                                        "createdAt": "2024-01-01T00:00:00Z",
                                    },
                                }
                            ],
                        }
                    ],
                }
            ],
        }

        highlights = extract_highlights_from_tiptap(tiptap_doc, section_id="raw_thoughts")

        assert len(highlights) == 1
        assert highlights[0].id == "hl-123"
        assert highlights[0].section_id == "raw_thoughts"

    def test_extract_without_section_id_parameter(self):
        """Test extract_highlights_from_tiptap() without section_id parameter."""
        tiptap_doc = {
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "Highlighted text",
                            "marks": [
                                {
                                    "type": "highlight",
                                    "attrs": {
                                        "id": "hl-123",
                                        "color": "yellow",
                                        "authorId": "user-456",
                                        "authorName": "Test User",
                                        "createdAt": "2024-01-01T00:00:00Z",
                                    },
                                }
                            ],
                        }
                    ],
                }
            ],
        }

        highlights = extract_highlights_from_tiptap(tiptap_doc)

        assert len(highlights) == 1
        assert highlights[0].section_id is None

    def test_extract_with_section_id_in_mark_attrs(self):
        """Test that sectionId in mark attrs takes precedence."""
        tiptap_doc = {
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "Highlighted text",
                            "marks": [
                                {
                                    "type": "highlight",
                                    "attrs": {
                                        "id": "hl-123",
                                        "sectionId": "from_attrs",
                                        "color": "yellow",
                                        "authorId": "user-456",
                                        "authorName": "Test User",
                                        "createdAt": "2024-01-01T00:00:00Z",
                                    },
                                }
                            ],
                        }
                    ],
                }
            ],
        }

        highlights = extract_highlights_from_tiptap(tiptap_doc, section_id="from_param")

        assert len(highlights) == 1
        assert highlights[0].section_id == "from_attrs"  # Attrs takes precedence


class TestExtractHighlightsFromMultiSection:
    """Test extracting highlights from multi-section TipTap content."""

    def test_extract_from_single_format(self):
        """Test extracting from single TipTap document format."""
        content_tiptap = {
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "Highlighted",
                            "marks": [
                                {
                                    "type": "highlight",
                                    "attrs": {
                                        "id": "hl-1",
                                        "authorId": "user-1",
                                        "authorName": "User",
                                        "createdAt": "2024-01-01T00:00:00Z",
                                    },
                                }
                            ],
                        }
                    ],
                }
            ],
        }

        highlights = extract_highlights_from_multi_section_tiptap(content_tiptap)

        assert len(highlights) == 1
        assert highlights[0].id == "hl-1"
        assert highlights[0].section_id == "content"  # Default for single format

    def test_extract_from_multi_section_format(self):
        """Test extracting from multi-section TipTap format."""
        content_tiptap = {
            "raw_thoughts": {
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": "Highlight 1",
                                "marks": [
                                    {
                                        "type": "highlight",
                                        "attrs": {
                                            "id": "hl-1",
                                            "authorId": "user-1",
                                            "authorName": "User",
                                            "createdAt": "2024-01-01T00:00:00Z",
                                        },
                                    }
                                ],
                            }
                        ],
                    }
                ],
            },
            "action_plan": {
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": "Highlight 2",
                                "marks": [
                                    {
                                        "type": "highlight",
                                        "attrs": {
                                            "id": "hl-2",
                                            "authorId": "user-1",
                                            "authorName": "User",
                                            "createdAt": "2024-01-01T00:00:00Z",
                                        },
                                    }
                                ],
                            }
                        ],
                    }
                ],
            },
        }

        highlights = extract_highlights_from_multi_section_tiptap(content_tiptap)

        assert len(highlights) == 2

        # Find highlights by ID
        hl1 = next(h for h in highlights if h.id == "hl-1")
        hl2 = next(h for h in highlights if h.id == "hl-2")

        assert hl1.section_id == "raw_thoughts"
        assert hl2.section_id == "action_plan"

    def test_extract_from_multi_section_with_no_highlights(self):
        """Test extracting from multi-section with no highlights returns empty list."""
        content_tiptap = {
            "section1": {
                "type": "doc",
                "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": "No highlights"}]}
                ],
            }
        }

        highlights = extract_highlights_from_multi_section_tiptap(content_tiptap)

        assert len(highlights) == 0

    def test_extract_from_multi_section_mixed_content(self):
        """Test extracting from multi-section with some sections having highlights."""
        content_tiptap = {
            "section1": {
                "type": "doc",
                "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": "No highlights"}]}
                ],
            },
            "section2": {
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": "Highlighted",
                                "marks": [
                                    {
                                        "type": "highlight",
                                        "attrs": {
                                            "id": "hl-1",
                                            "authorId": "user-1",
                                            "authorName": "User",
                                            "createdAt": "2024-01-01T00:00:00Z",
                                        },
                                    }
                                ],
                            }
                        ],
                    }
                ],
            },
        }

        highlights = extract_highlights_from_multi_section_tiptap(content_tiptap)

        assert len(highlights) == 1
        assert highlights[0].section_id == "section2"
