"""
Tests for TipTap-native highlight extraction and manipulation functions.
"""

import pytest
from app.models.highlight import (
    extract_highlights_from_tiptap,
    update_highlight_comment_count_in_tiptap,
    remove_highlight_from_tiptap,
    TipTapHighlight,
)


def test_extract_highlights_from_empty_document():
    """Test extracting highlights from empty document."""
    content = {"type": "doc", "content": []}
    highlights = extract_highlights_from_tiptap(content)
    assert highlights == []


def test_extract_single_highlight():
    """Test extracting a single highlight from document."""
    content = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": "highlighted text",
                        "marks": [
                            {
                                "type": "highlight",
                                "attrs": {
                                    "id": "highlight-1",
                                    "color": "yellow",
                                    "authorId": "user-123",
                                    "authorName": "Test User",
                                    "createdAt": "2025-01-15T10:00:00Z",
                                    "commentCount": 0,
                                },
                            }
                        ],
                    }
                ],
            }
        ],
    }

    highlights = extract_highlights_from_tiptap(content)

    assert len(highlights) == 1
    assert highlights[0].id == "highlight-1"
    assert highlights[0].color == "yellow"
    assert highlights[0].author_id == "user-123"
    assert highlights[0].author_name == "Test User"
    assert highlights[0].comment_count == 0


def test_extract_multiple_highlights():
    """Test extracting multiple highlights from document."""
    content = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": "first highlight",
                        "marks": [
                            {
                                "type": "highlight",
                                "attrs": {
                                    "id": "highlight-1",
                                    "color": "yellow",
                                    "authorId": "user-1",
                                    "authorName": "User 1",
                                    "createdAt": "2025-01-15T10:00:00Z",
                                    "commentCount": 2,
                                },
                            }
                        ],
                    },
                    {"type": "text", "text": " some text "},
                    {
                        "type": "text",
                        "text": "second highlight",
                        "marks": [
                            {
                                "type": "highlight",
                                "attrs": {
                                    "id": "highlight-2",
                                    "color": "blue",
                                    "authorId": "user-2",
                                    "authorName": "User 2",
                                    "createdAt": "2025-01-15T11:00:00Z",
                                    "commentCount": 0,
                                },
                            }
                        ],
                    },
                ],
            }
        ],
    }

    highlights = extract_highlights_from_tiptap(content)

    assert len(highlights) == 2
    assert highlights[0].id == "highlight-1"
    assert highlights[0].comment_count == 2
    assert highlights[1].id == "highlight-2"
    assert highlights[1].color == "blue"


def test_extract_highlights_deduplicates():
    """Test that same highlight appearing multiple times is only extracted once."""
    content = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": "first part",
                        "marks": [
                            {
                                "type": "highlight",
                                "attrs": {
                                    "id": "highlight-1",
                                    "color": "yellow",
                                    "authorId": "user-1",
                                    "authorName": "User 1",
                                    "createdAt": "2025-01-15T10:00:00Z",
                                    "commentCount": 0,
                                },
                            }
                        ],
                    },
                    {
                        "type": "text",
                        "text": " second part",
                        "marks": [
                            {
                                "type": "highlight",
                                "attrs": {
                                    "id": "highlight-1",  # Same ID
                                    "color": "yellow",
                                    "authorId": "user-1",
                                    "authorName": "User 1",
                                    "createdAt": "2025-01-15T10:00:00Z",
                                    "commentCount": 0,
                                },
                            }
                        ],
                    },
                ],
            }
        ],
    }

    highlights = extract_highlights_from_tiptap(content)

    # Should only extract once despite appearing twice
    assert len(highlights) == 1
    assert highlights[0].id == "highlight-1"


def test_extract_highlights_from_nested_structure():
    """Test extracting highlights from nested document structure."""
    content = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": "Regular text"}],
            },
            {
                "type": "bulletList",
                "content": [
                    {
                        "type": "listItem",
                        "content": [
                            {
                                "type": "paragraph",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": "list item with highlight",
                                        "marks": [
                                            {
                                                "type": "highlight",
                                                "attrs": {
                                                    "id": "highlight-nested",
                                                    "color": "green",
                                                    "authorId": "user-1",
                                                    "authorName": "User 1",
                                                    "createdAt": "2025-01-15T10:00:00Z",
                                                    "commentCount": 1,
                                                },
                                            }
                                        ],
                                    }
                                ],
                            }
                        ],
                    }
                ],
            },
        ],
    }

    highlights = extract_highlights_from_tiptap(content)

    assert len(highlights) == 1
    assert highlights[0].id == "highlight-nested"
    assert highlights[0].color == "green"


def test_update_highlight_comment_count():
    """Test updating comment count for a highlight."""
    content = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": "highlighted text",
                        "marks": [
                            {
                                "type": "highlight",
                                "attrs": {
                                    "id": "highlight-1",
                                    "color": "yellow",
                                    "authorId": "user-1",
                                    "authorName": "User 1",
                                    "createdAt": "2025-01-15T10:00:00Z",
                                    "commentCount": 0,
                                },
                            }
                        ],
                    }
                ],
            }
        ],
    }

    updated_content = update_highlight_comment_count_in_tiptap(content, "highlight-1", 5)

    # Extract highlights to verify update
    highlights = extract_highlights_from_tiptap(updated_content)
    assert len(highlights) == 1
    assert highlights[0].comment_count == 5


def test_update_comment_count_multiple_instances():
    """Test updating comment count when highlight spans multiple text nodes."""
    content = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": "part 1",
                        "marks": [
                            {
                                "type": "highlight",
                                "attrs": {
                                    "id": "highlight-1",
                                    "color": "yellow",
                                    "authorId": "user-1",
                                    "authorName": "User 1",
                                    "createdAt": "2025-01-15T10:00:00Z",
                                    "commentCount": 0,
                                },
                            }
                        ],
                    },
                    {
                        "type": "text",
                        "text": " part 2",
                        "marks": [
                            {
                                "type": "highlight",
                                "attrs": {
                                    "id": "highlight-1",  # Same highlight
                                    "color": "yellow",
                                    "authorId": "user-1",
                                    "authorName": "User 1",
                                    "createdAt": "2025-01-15T10:00:00Z",
                                    "commentCount": 0,
                                },
                            }
                        ],
                    },
                ],
            }
        ],
    }

    updated_content = update_highlight_comment_count_in_tiptap(content, "highlight-1", 3)

    # Both instances should be updated
    para = updated_content["content"][0]["content"]
    assert para[0]["marks"][0]["attrs"]["commentCount"] == 3
    assert para[1]["marks"][0]["attrs"]["commentCount"] == 3


def test_update_comment_count_preserves_other_highlights():
    """Test that updating one highlight doesn't affect others."""
    content = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": "highlight 1",
                        "marks": [
                            {
                                "type": "highlight",
                                "attrs": {
                                    "id": "highlight-1",
                                    "color": "yellow",
                                    "authorId": "user-1",
                                    "authorName": "User 1",
                                    "createdAt": "2025-01-15T10:00:00Z",
                                    "commentCount": 2,
                                },
                            }
                        ],
                    },
                    {"type": "text", "text": " "},
                    {
                        "type": "text",
                        "text": "highlight 2",
                        "marks": [
                            {
                                "type": "highlight",
                                "attrs": {
                                    "id": "highlight-2",
                                    "color": "blue",
                                    "authorId": "user-2",
                                    "authorName": "User 2",
                                    "createdAt": "2025-01-15T11:00:00Z",
                                    "commentCount": 3,
                                },
                            }
                        ],
                    },
                ],
            }
        ],
    }

    updated_content = update_highlight_comment_count_in_tiptap(content, "highlight-1", 10)

    # Verify highlight-1 was updated
    highlights = extract_highlights_from_tiptap(updated_content)
    h1 = next(h for h in highlights if h.id == "highlight-1")
    h2 = next(h for h in highlights if h.id == "highlight-2")

    assert h1.comment_count == 10
    assert h2.comment_count == 3  # Unchanged


def test_remove_highlight():
    """Test removing a highlight from document."""
    content = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {"type": "text", "text": "normal text "},
                    {
                        "type": "text",
                        "text": "highlighted text",
                        "marks": [
                            {
                                "type": "highlight",
                                "attrs": {
                                    "id": "highlight-1",
                                    "color": "yellow",
                                    "authorId": "user-1",
                                    "authorName": "User 1",
                                    "createdAt": "2025-01-15T10:00:00Z",
                                    "commentCount": 0,
                                },
                            }
                        ],
                    },
                    {"type": "text", "text": " more normal text"},
                ],
            }
        ],
    }

    updated_content = remove_highlight_from_tiptap(content, "highlight-1")

    # Verify highlight was removed
    highlights = extract_highlights_from_tiptap(updated_content)
    assert len(highlights) == 0

    # Verify text nodes still exist (only mark was removed)
    para = updated_content["content"][0]["content"]
    assert len(para) == 3
    assert para[1]["text"] == "highlighted text"
    assert para[1].get("marks", []) == []


def test_remove_highlight_preserves_other_marks():
    """Test that removing highlight doesn't affect other marks like bold."""
    content = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": "bold and highlighted",
                        "marks": [
                            {"type": "bold"},
                            {
                                "type": "highlight",
                                "attrs": {
                                    "id": "highlight-1",
                                    "color": "yellow",
                                    "authorId": "user-1",
                                    "authorName": "User 1",
                                    "createdAt": "2025-01-15T10:00:00Z",
                                    "commentCount": 0,
                                },
                            },
                        ],
                    }
                ],
            }
        ],
    }

    updated_content = remove_highlight_from_tiptap(content, "highlight-1")

    # Verify highlight was removed but bold remains
    para = updated_content["content"][0]["content"][0]
    assert len(para["marks"]) == 1
    assert para["marks"][0]["type"] == "bold"


def test_remove_highlight_from_multiple_instances():
    """Test removing highlight that spans multiple text nodes."""
    content = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": "part 1",
                        "marks": [
                            {
                                "type": "highlight",
                                "attrs": {
                                    "id": "highlight-1",
                                    "color": "yellow",
                                    "authorId": "user-1",
                                    "authorName": "User 1",
                                    "createdAt": "2025-01-15T10:00:00Z",
                                    "commentCount": 0,
                                },
                            }
                        ],
                    },
                    {
                        "type": "text",
                        "text": " part 2",
                        "marks": [
                            {
                                "type": "highlight",
                                "attrs": {
                                    "id": "highlight-1",  # Same highlight
                                    "color": "yellow",
                                    "authorId": "user-1",
                                    "authorName": "User 1",
                                    "createdAt": "2025-01-15T10:00:00Z",
                                    "commentCount": 0,
                                },
                            }
                        ],
                    },
                ],
            }
        ],
    }

    updated_content = remove_highlight_from_tiptap(content, "highlight-1")

    # Verify all instances were removed
    highlights = extract_highlights_from_tiptap(updated_content)
    assert len(highlights) == 0

    para = updated_content["content"][0]["content"]
    assert para[0].get("marks", []) == []
    assert para[1].get("marks", []) == []


def test_tiptap_highlight_model():
    """Test TipTapHighlight model validation."""
    highlight = TipTapHighlight(
        id="test-id",
        color="blue",
        authorId="user-123",
        authorName="Test User",
        createdAt="2025-01-15T10:00:00Z",
        commentCount=5,
    )

    assert highlight.id == "test-id"
    assert highlight.color == "blue"
    assert highlight.author_id == "user-123"
    assert highlight.author_name == "Test User"
    assert highlight.created_at == "2025-01-15T10:00:00Z"
    assert highlight.comment_count == 5


def test_tiptap_highlight_model_defaults():
    """Test TipTapHighlight model with default values."""
    highlight = TipTapHighlight(
        id="test-id",
        authorId="user-123",
        authorName="Test User",
        createdAt="2025-01-15T10:00:00Z",
    )

    assert highlight.color == "yellow"  # Default
    assert highlight.comment_count == 0  # Default
