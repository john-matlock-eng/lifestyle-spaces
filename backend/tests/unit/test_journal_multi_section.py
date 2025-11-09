"""
Unit tests for multi-section TipTap support in Journal models.

Tests the new multi-section TipTap architecture that supports:
- Single TipTap document format (backward compatible)
- Multi-section TipTap format for template journals
- Validation of both formats
- Helper methods for working with sections
"""

import pytest
from datetime import datetime
from pydantic import ValidationError
from app.models.journal import (
    JournalBase,
    JournalEntry,
    JournalCreate,
)


class TestJournalTipTapValidation:
    """Test content_tiptap field validation."""

    def test_single_tiptap_format_valid(self):
        """Test that single TipTap document format is valid."""
        journal_data = {
            "title": "Test Journal",
            "content": "Test content",
            "contentTiptap": {
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": "Hello world"}]
                    }
                ]
            }
        }

        journal = JournalBase(**journal_data)
        assert journal.content_tiptap is not None
        assert journal.content_tiptap["type"] == "doc"

    def test_multi_section_tiptap_format_valid(self):
        """Test that multi-section TipTap format is valid."""
        journal_data = {
            "title": "Test Journal",
            "content": "Test content",
            "contentTiptap": {
                "raw_thoughts": {
                    "type": "doc",
                    "content": [
                        {"type": "paragraph", "content": [{"type": "text", "text": "Section 1"}]}
                    ]
                },
                "action_plan": {
                    "type": "doc",
                    "content": [
                        {"type": "paragraph", "content": [{"type": "text", "text": "Section 2"}]}
                    ]
                }
            }
        }

        journal = JournalBase(**journal_data)
        assert journal.content_tiptap is not None
        assert "raw_thoughts" in journal.content_tiptap
        assert "action_plan" in journal.content_tiptap

    def test_null_content_tiptap_valid(self):
        """Test that null contentTiptap is valid."""
        journal_data = {
            "title": "Test Journal",
            "content": "Test content",
            "contentTiptap": None
        }

        journal = JournalBase(**journal_data)
        assert journal.content_tiptap is None

    def test_single_format_missing_content_field_invalid(self):
        """Test that single format without content field is rejected."""
        journal_data = {
            "title": "Test Journal",
            "content": "Test content",
            "contentTiptap": {
                "type": "doc"
                # Missing 'content' field
            }
        }

        with pytest.raises(ValidationError) as exc_info:
            JournalBase(**journal_data)

        assert "must have 'content' field" in str(exc_info.value)

    def test_multi_section_invalid_section_doc(self):
        """Test that multi-section with invalid section doc is rejected."""
        journal_data = {
            "title": "Test Journal",
            "content": "Test content",
            "contentTiptap": {
                "section1": {
                    "type": "doc",
                    "content": []
                },
                "section2": "invalid"  # Should be a dict
            }
        }

        with pytest.raises(ValidationError) as exc_info:
            JournalBase(**journal_data)

        assert "must contain a TipTap document object" in str(exc_info.value)

    def test_multi_section_missing_type_field(self):
        """Test that section without type='doc' is rejected."""
        journal_data = {
            "title": "Test Journal",
            "content": "Test content",
            "contentTiptap": {
                "section1": {
                    "content": []
                    # Missing 'type' field
                }
            }
        }

        with pytest.raises(ValidationError) as exc_info:
            JournalBase(**journal_data)

        assert "must be a valid TipTap document with type='doc'" in str(exc_info.value)

    def test_multi_section_missing_content_field(self):
        """Test that section without content field is rejected."""
        journal_data = {
            "title": "Test Journal",
            "content": "Test content",
            "contentTiptap": {
                "section1": {
                    "type": "doc"
                    # Missing 'content' field
                }
            }
        }

        with pytest.raises(ValidationError) as exc_info:
            JournalBase(**journal_data)

        assert "must have 'content' field" in str(exc_info.value)

    def test_content_tiptap_not_dict_invalid(self):
        """Test that non-dict contentTiptap is rejected."""
        journal_data = {
            "title": "Test Journal",
            "content": "Test content",
            "contentTiptap": "invalid string"
        }

        with pytest.raises(ValidationError) as exc_info:
            JournalBase(**journal_data)

        assert "must be a dictionary" in str(exc_info.value)


class TestJournalEntryHelperMethods:
    """Test JournalEntry helper methods for multi-section TipTap."""

    def test_is_multi_section_tiptap_single_format(self):
        """Test is_multi_section_tiptap() returns False for single format."""
        journal = JournalEntry(
            journal_id="test-123",
            space_id="space-456",
            user_id="user-789",
            title="Test",
            content="Content",
            content_tiptap={
                "type": "doc",
                "content": []
            },
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        assert journal.is_multi_section_tiptap() is False

    def test_is_multi_section_tiptap_multi_format(self):
        """Test is_multi_section_tiptap() returns True for multi format."""
        journal = JournalEntry(
            journal_id="test-123",
            space_id="space-456",
            user_id="user-789",
            title="Test",
            content="Content",
            content_tiptap={
                "section1": {"type": "doc", "content": []},
                "section2": {"type": "doc", "content": []}
            },
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        assert journal.is_multi_section_tiptap() is True

    def test_is_multi_section_tiptap_null_content(self):
        """Test is_multi_section_tiptap() returns False when no TipTap content."""
        journal = JournalEntry(
            journal_id="test-123",
            space_id="space-456",
            user_id="user-789",
            title="Test",
            content="Content",
            content_tiptap=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        assert journal.is_multi_section_tiptap() is False

    def test_get_section_tiptap_single_format_content_section(self):
        """Test get_section_tiptap() returns doc for 'content' in single format."""
        tiptap_doc = {"type": "doc", "content": [{"type": "paragraph"}]}
        journal = JournalEntry(
            journal_id="test-123",
            space_id="space-456",
            user_id="user-789",
            title="Test",
            content="Content",
            content_tiptap=tiptap_doc,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        result = journal.get_section_tiptap("content")
        assert result == tiptap_doc

    def test_get_section_tiptap_single_format_other_section(self):
        """Test get_section_tiptap() returns None for non-content section in single format."""
        journal = JournalEntry(
            journal_id="test-123",
            space_id="space-456",
            user_id="user-789",
            title="Test",
            content="Content",
            content_tiptap={"type": "doc", "content": []},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        result = journal.get_section_tiptap("other_section")
        assert result is None

    def test_get_section_tiptap_multi_format(self):
        """Test get_section_tiptap() returns correct section in multi format."""
        section1_doc = {"type": "doc", "content": [{"type": "paragraph", "text": "Section 1"}]}
        section2_doc = {"type": "doc", "content": [{"type": "paragraph", "text": "Section 2"}]}

        journal = JournalEntry(
            journal_id="test-123",
            space_id="space-456",
            user_id="user-789",
            title="Test",
            content="Content",
            content_tiptap={
                "section1": section1_doc,
                "section2": section2_doc
            },
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        assert journal.get_section_tiptap("section1") == section1_doc
        assert journal.get_section_tiptap("section2") == section2_doc
        assert journal.get_section_tiptap("nonexistent") is None

    def test_get_section_tiptap_null_content(self):
        """Test get_section_tiptap() returns None when no TipTap content."""
        journal = JournalEntry(
            journal_id="test-123",
            space_id="space-456",
            user_id="user-789",
            title="Test",
            content="Content",
            content_tiptap=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        assert journal.get_section_tiptap("any_section") is None

    def test_get_all_section_ids_single_format(self):
        """Test get_all_section_ids() returns ['content'] for single format."""
        journal = JournalEntry(
            journal_id="test-123",
            space_id="space-456",
            user_id="user-789",
            title="Test",
            content="Content",
            content_tiptap={"type": "doc", "content": []},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        section_ids = journal.get_all_section_ids()
        assert section_ids == ["content"]

    def test_get_all_section_ids_multi_format(self):
        """Test get_all_section_ids() returns all section IDs for multi format."""
        journal = JournalEntry(
            journal_id="test-123",
            space_id="space-456",
            user_id="user-789",
            title="Test",
            content="Content",
            content_tiptap={
                "raw_thoughts": {"type": "doc", "content": []},
                "action_plan": {"type": "doc", "content": []},
                "reflections": {"type": "doc", "content": []}
            },
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        section_ids = journal.get_all_section_ids()
        assert set(section_ids) == {"raw_thoughts", "action_plan", "reflections"}

    def test_get_all_section_ids_null_content(self):
        """Test get_all_section_ids() returns empty list when no TipTap content."""
        journal = JournalEntry(
            journal_id="test-123",
            space_id="space-456",
            user_id="user-789",
            title="Test",
            content="Content",
            content_tiptap=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        section_ids = journal.get_all_section_ids()
        assert section_ids == []


class TestJournalCreateWithTipTap:
    """Test JournalCreate model with TipTap content."""

    def test_create_with_single_tiptap(self):
        """Test creating journal with single TipTap format."""
        journal_data = {
            "spaceId": "space-123",
            "title": "Test Journal",
            "content": "Test content",
            "contentTiptap": {
                "type": "doc",
                "content": [{"type": "paragraph"}]
            }
        }

        journal = JournalCreate(**journal_data)
        assert journal.space_id == "space-123"
        assert journal.content_tiptap is not None

    def test_create_with_multi_section_tiptap(self):
        """Test creating journal with multi-section TipTap format."""
        journal_data = {
            "spaceId": "space-123",
            "title": "Test Journal",
            "content": "Test content",
            "contentTiptap": {
                "section1": {"type": "doc", "content": []},
                "section2": {"type": "doc", "content": []}
            }
        }

        journal = JournalCreate(**journal_data)
        assert journal.space_id == "space-123"
        assert "section1" in journal.content_tiptap
        assert "section2" in journal.content_tiptap
