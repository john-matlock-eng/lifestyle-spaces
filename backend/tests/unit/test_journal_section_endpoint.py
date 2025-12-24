"""
Tests for Journal Section Extraction and Endpoint

Tests for the extract_sections_from_content helper and the
GET /journals/{id}/sections/{index} endpoint for citation expansion.
"""

import pytest
from unittest.mock import MagicMock, patch

from app.api.routes.journals import extract_sections_from_content


class TestExtractSectionsFromContent:
    """Tests for extract_sections_from_content helper."""

    def test_empty_content_returns_single_section(self):
        """Empty content should return a single empty section."""
        result = extract_sections_from_content({})
        assert len(result) == 1
        assert result[0]["title"] == ""
        assert result[0]["content"] == ""

    def test_none_content_returns_single_section(self):
        """None content should return a single empty section."""
        result = extract_sections_from_content(None)
        assert len(result) == 1
        assert result[0]["title"] == ""
        assert result[0]["content"] == ""

    def test_non_dict_content_returns_single_section(self):
        """Non-dict content should return a single empty section."""
        result = extract_sections_from_content("string content")
        assert len(result) == 1

    def test_extracts_sections_from_tiptap(self):
        """Should correctly extract sections from TipTap JSON with headings."""
        content = {
            "type": "doc",
            "content": [
                {"type": "heading", "content": [{"type": "text", "text": "Section One"}]},
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": "Content for section one."}],
                },
                {"type": "heading", "content": [{"type": "text", "text": "Section Two"}]},
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": "Content for section two."}],
                },
            ],
        }

        result = extract_sections_from_content(content)

        assert len(result) == 2
        assert result[0]["title"] == "Section One"
        assert "Content for section one" in result[0]["content"]
        assert result[1]["title"] == "Section Two"
        assert "Content for section two" in result[1]["content"]

    def test_content_without_headings_single_section(self):
        """Content without headings should become a single section."""
        content = {
            "type": "doc",
            "content": [
                {"type": "paragraph", "content": [{"type": "text", "text": "Just a paragraph."}]},
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": "Another paragraph."}],
                },
            ],
        }

        result = extract_sections_from_content(content)

        assert len(result) == 1
        assert result[0]["title"] == ""
        assert "Just a paragraph" in result[0]["content"]
        assert "Another paragraph" in result[0]["content"]

    def test_multiple_paragraphs_in_section(self):
        """Multiple paragraphs under a heading should be joined with double newlines."""
        content = {
            "type": "doc",
            "content": [
                {"type": "heading", "content": [{"type": "text", "text": "My Section"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "First paragraph."}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "Second paragraph."}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "Third paragraph."}]},
            ],
        }

        result = extract_sections_from_content(content)

        assert len(result) == 1
        assert result[0]["title"] == "My Section"
        # Content should have paragraphs separated by double newlines
        assert "\n\n" in result[0]["content"]
        assert "First paragraph" in result[0]["content"]
        assert "Second paragraph" in result[0]["content"]
        assert "Third paragraph" in result[0]["content"]

    def test_content_before_first_heading(self):
        """Content before first heading should be in an untitled section."""
        content = {
            "type": "doc",
            "content": [
                {"type": "paragraph", "content": [{"type": "text", "text": "Intro content."}]},
                {"type": "heading", "content": [{"type": "text", "text": "First Section"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "Section content."}]},
            ],
        }

        result = extract_sections_from_content(content)

        assert len(result) == 2
        assert result[0]["title"] == ""
        assert "Intro content" in result[0]["content"]
        assert result[1]["title"] == "First Section"
        assert "Section content" in result[1]["content"]

    def test_nested_content_extraction(self):
        """Should handle nested content like bold text, links, etc."""
        content = {
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {"type": "text", "text": "Normal text "},
                        {"type": "text", "text": "bold text", "marks": [{"type": "bold"}]},
                        {"type": "text", "text": " more text."},
                    ],
                },
            ],
        }

        result = extract_sections_from_content(content)

        assert len(result) == 1
        assert "Normal text" in result[0]["content"]
        assert "bold text" in result[0]["content"]
        assert "more text" in result[0]["content"]

    def test_empty_heading_still_creates_section(self):
        """A heading without title should still create a new section."""
        content = {
            "type": "doc",
            "content": [
                {"type": "heading", "content": []},
                {"type": "paragraph", "content": [{"type": "text", "text": "Some content."}]},
            ],
        }

        result = extract_sections_from_content(content)

        assert len(result) == 1
        assert result[0]["title"] == ""
        assert "Some content" in result[0]["content"]

    def test_handles_non_standard_nodes(self):
        """Should gracefully handle non-standard node types."""
        content = {
            "type": "doc",
            "content": [
                {"type": "paragraph", "content": [{"type": "text", "text": "Text content."}]},
                {"type": "horizontalRule"},  # No content property
                {"type": "paragraph", "content": [{"type": "text", "text": "More text."}]},
            ],
        }

        result = extract_sections_from_content(content)

        # Should not error, just skip the horizontal rule
        assert len(result) >= 1
        assert "Text content" in result[0]["content"]

    def test_heading_only_no_content(self):
        """A section with heading but no following content should still be captured."""
        content = {
            "type": "doc",
            "content": [
                {"type": "heading", "content": [{"type": "text", "text": "Empty Section"}]},
                {"type": "heading", "content": [{"type": "text", "text": "Next Section"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "Has content."}]},
            ],
        }

        result = extract_sections_from_content(content)

        # First heading has no content, shouldn't appear
        # Only the second heading with content should appear
        assert len(result) == 1
        assert result[0]["title"] == "Next Section"

    def test_complex_realistic_content(self):
        """Test with realistic journal-like content."""
        content = {
            "type": "doc",
            "content": [
                {"type": "heading", "content": [{"type": "text", "text": "Morning Reflection"}]},
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": "Today I woke up feeling refreshed."}],
                },
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": "The morning sun was beautiful."}],
                },
                {"type": "heading", "content": [{"type": "text", "text": "Goals for Today"}]},
                {
                    "type": "bulletList",
                    "content": [
                        {
                            "type": "listItem",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [{"type": "text", "text": "Complete project"}],
                                }
                            ],
                        },
                        {
                            "type": "listItem",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [{"type": "text", "text": "Exercise"}],
                                }
                            ],
                        },
                    ],
                },
                {"type": "heading", "content": [{"type": "text", "text": "Evening Notes"}]},
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": "It was a productive day!"}],
                },
            ],
        }

        result = extract_sections_from_content(content)

        assert len(result) == 3
        assert result[0]["title"] == "Morning Reflection"
        assert "woke up feeling refreshed" in result[0]["content"]
        assert "morning sun" in result[0]["content"]
        assert result[1]["title"] == "Goals for Today"
        assert "Complete project" in result[1]["content"]
        assert "Exercise" in result[1]["content"]
        assert result[2]["title"] == "Evening Notes"
        assert "productive day" in result[2]["content"]

    def test_template_section_dict_format(self):
        """Should correctly extract sections from template section dict format."""
        content = {
            "gratitude": {
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": "I am grateful for my family."}],
                    },
                ],
            },
            "reflection": {
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": "Today I learned patience."}],
                    },
                ],
            },
        }

        result = extract_sections_from_content(content)

        assert len(result) == 2
        # Check that sections are in the expected order (gratitude before reflection)
        assert result[0]["title"] == "Gratitude"
        assert "grateful for my family" in result[0]["content"]
        assert result[1]["title"] == "Reflection"
        assert "learned patience" in result[1]["content"]

    def test_template_section_dict_with_three_e_format(self):
        """Should correctly extract sections from Express/Examine/Evolve format."""
        content = {
            "raw_thoughts": {
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": "My raw thoughts about the day."}],
                    },
                ],
            },
            "deep_dive": {
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": "Looking deeper at my feelings."}],
                    },
                ],
            },
            "action_plan": {
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": "What I will do tomorrow."}],
                    },
                ],
            },
        }

        result = extract_sections_from_content(content)

        assert len(result) == 3
        # Check proper display names
        assert result[0]["title"] == "Express"
        assert "raw thoughts" in result[0]["content"]
        assert result[1]["title"] == "Examine"
        assert "deeper at my feelings" in result[1]["content"]
        assert result[2]["title"] == "Evolve"
        assert "do tomorrow" in result[2]["content"]

    def test_template_section_dict_with_empty_section(self):
        """Should skip sections with no content."""
        content = {
            "gratitude": {
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": "I am grateful."}],
                    },
                ],
            },
            "reflection": {
                "type": "doc",
                "content": [],  # Empty section
            },
        }

        result = extract_sections_from_content(content)

        # Should only have the gratitude section
        assert len(result) == 1
        assert result[0]["title"] == "Gratitude"


class TestGetJournalSectionEndpoint:
    """Integration tests for GET /journals/{id}/sections/{index} endpoint."""

    @pytest.fixture
    def mock_auth_user(self):
        """Mock authenticated user."""
        return {"sub": "user-123", "email": "test@example.com"}

    @pytest.fixture
    def mock_journal_with_sections(self):
        """Mock journal with TipTap content."""
        return {
            "journal_id": "journal-123",
            "space_id": "space-456",
            "user_id": "user-123",
            "title": "My Test Journal",
            "content": {},
            "content_tiptap": {
                "type": "doc",
                "content": [
                    {"type": "heading", "content": [{"type": "text", "text": "First Section"}]},
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": "Content of first section."}],
                    },
                    {"type": "heading", "content": [{"type": "text", "text": "Second Section"}]},
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": "Content of second section."}],
                    },
                ],
            },
            "created_at": "2025-12-23T10:00:00Z",
            "updated_at": "2025-12-23T10:00:00Z",
        }

    @pytest.mark.asyncio
    async def test_returns_section_content(self, mock_auth_user, mock_journal_with_sections):
        """Should return the content of a valid section."""
        from app.api.routes.journals import get_journal_section
        from app.services.journal import JournalService

        with patch.object(JournalService, "get_journal_entry") as mock_get:
            mock_get.return_value = mock_journal_with_sections

            result = await get_journal_section(
                space_id="space-456",
                journal_id="journal-123",
                section_index=0,
                current_user=mock_auth_user,
            )

            assert result.sectionIndex == 0
            assert result.sectionTitle == "First Section"
            assert "Content of first section" in result.content
            assert result.journalTitle == "My Test Journal"
            assert result.wordCount > 0

    @pytest.mark.asyncio
    async def test_returns_second_section(self, mock_auth_user, mock_journal_with_sections):
        """Should return the second section when index=1."""
        from app.api.routes.journals import get_journal_section
        from app.services.journal import JournalService

        with patch.object(JournalService, "get_journal_entry") as mock_get:
            mock_get.return_value = mock_journal_with_sections

            result = await get_journal_section(
                space_id="space-456",
                journal_id="journal-123",
                section_index=1,
                current_user=mock_auth_user,
            )

            assert result.sectionIndex == 1
            assert result.sectionTitle == "Second Section"
            assert "Content of second section" in result.content

    @pytest.mark.asyncio
    async def test_invalid_section_index_returns_404(self, mock_auth_user, mock_journal_with_sections):
        """Should return 404 for invalid section index."""
        from fastapi import HTTPException
        from app.api.routes.journals import get_journal_section
        from app.services.journal import JournalService

        with patch.object(JournalService, "get_journal_entry") as mock_get:
            mock_get.return_value = mock_journal_with_sections

            with pytest.raises(HTTPException) as exc_info:
                await get_journal_section(
                    space_id="space-456",
                    journal_id="journal-123",
                    section_index=99,  # Invalid index
                    current_user=mock_auth_user,
                )

            assert exc_info.value.status_code == 404
            assert "Section 99 not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_negative_section_index_returns_404(self, mock_auth_user, mock_journal_with_sections):
        """Should return 404 for negative section index."""
        from fastapi import HTTPException
        from app.api.routes.journals import get_journal_section
        from app.services.journal import JournalService

        with patch.object(JournalService, "get_journal_entry") as mock_get:
            mock_get.return_value = mock_journal_with_sections

            with pytest.raises(HTTPException) as exc_info:
                await get_journal_section(
                    space_id="space-456",
                    journal_id="journal-123",
                    section_index=-1,
                    current_user=mock_auth_user,
                )

            assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_journal_not_found_returns_404(self, mock_auth_user):
        """Should return 404 when journal doesn't exist."""
        from fastapi import HTTPException
        from app.api.routes.journals import get_journal_section
        from app.services.journal import JournalService, JournalNotFoundError

        with patch.object(JournalService, "get_journal_entry") as mock_get:
            mock_get.side_effect = JournalNotFoundError("Journal not found")

            with pytest.raises(HTTPException) as exc_info:
                await get_journal_section(
                    space_id="space-456",
                    journal_id="nonexistent",
                    section_index=0,
                    current_user=mock_auth_user,
                )

            assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_unauthorized_returns_403(self, mock_auth_user):
        """Should return 403 when user not authorized."""
        from fastapi import HTTPException
        from app.api.routes.journals import get_journal_section
        from app.services.journal import JournalService
        from app.services.exceptions import UnauthorizedError

        with patch.object(JournalService, "get_journal_entry") as mock_get:
            mock_get.side_effect = UnauthorizedError("Not authorized")

            with pytest.raises(HTTPException) as exc_info:
                await get_journal_section(
                    space_id="space-456",
                    journal_id="journal-123",
                    section_index=0,
                    current_user=mock_auth_user,
                )

            assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_journal_without_tiptap_uses_content(self, mock_auth_user):
        """Should fall back to content field if content_tiptap is missing."""
        from app.api.routes.journals import get_journal_section
        from app.services.journal import JournalService

        journal = {
            "journal_id": "journal-123",
            "space_id": "space-456",
            "user_id": "user-123",
            "title": "Legacy Journal",
            "content": {
                "type": "doc",
                "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": "Legacy content."}]},
                ],
            },
            "created_at": "2025-12-23T10:00:00Z",
        }

        with patch.object(JournalService, "get_journal_entry") as mock_get:
            mock_get.return_value = journal

            result = await get_journal_section(
                space_id="space-456",
                journal_id="journal-123",
                section_index=0,
                current_user=mock_auth_user,
            )

            assert "Legacy content" in result.content

    @pytest.mark.asyncio
    async def test_word_count_calculation(self, mock_auth_user):
        """Should correctly calculate word count."""
        from app.api.routes.journals import get_journal_section
        from app.services.journal import JournalService

        journal = {
            "journal_id": "journal-123",
            "space_id": "space-456",
            "user_id": "user-123",
            "title": "Test Journal",
            "content_tiptap": {
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": "One two three four five."}],
                    },
                ],
            },
            "created_at": "2025-12-23T10:00:00Z",
        }

        with patch.object(JournalService, "get_journal_entry") as mock_get:
            mock_get.return_value = journal

            result = await get_journal_section(
                space_id="space-456",
                journal_id="journal-123",
                section_index=0,
                current_user=mock_auth_user,
            )

            assert result.wordCount == 5
