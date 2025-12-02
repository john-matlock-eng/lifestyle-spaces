"""
Tests for TipTap Converter utility
"""
import pytest
from app.utils.tiptap_converter import TipTapConverter


class TestMarkdownToTipTap:
    """Test markdown to TipTap conversion"""

    def test_simple_paragraph(self):
        """Test converting simple paragraph"""
        result = TipTapConverter.markdown_to_tiptap("Hello world")

        assert result["type"] == "doc"
        assert "content" in result
        assert len(result["content"]) == 1
        assert result["content"][0]["type"] == "paragraph"
        assert result["content"][0]["content"][0]["text"] == "Hello world"

    def test_multiple_paragraphs(self):
        """Test converting multiple paragraphs"""
        result = TipTapConverter.markdown_to_tiptap("First paragraph\n\nSecond paragraph")

        assert result["type"] == "doc"
        assert len(result["content"]) == 2
        assert result["content"][0]["content"][0]["text"] == "First paragraph"
        assert result["content"][1]["content"][0]["text"] == "Second paragraph"

    def test_bold_text(self):
        """Test converting bold text"""
        result = TipTapConverter.markdown_to_tiptap("This is **bold** text")

        content = result["content"][0]["content"]
        assert content[0]["text"] == "This is "
        assert content[1]["text"] == "bold"
        assert content[1]["marks"][0]["type"] == "bold"
        assert content[2]["text"] == " text"

    def test_italic_text(self):
        """Test converting italic text"""
        result = TipTapConverter.markdown_to_tiptap("This is *italic* text")

        content = result["content"][0]["content"]
        assert content[1]["text"] == "italic"
        assert content[1]["marks"][0]["type"] == "italic"

    def test_bullet_list(self):
        """Test converting bullet list"""
        result = TipTapConverter.markdown_to_tiptap("- Item 1\n- Item 2")

        assert result["content"][0]["type"] == "bulletList"
        items = result["content"][0]["content"]
        assert len(items) == 2
        assert items[0]["type"] == "listItem"
        assert items[0]["content"][0]["content"][0]["text"] == "Item 1"

    def test_empty_string(self):
        """Test converting empty string"""
        result = TipTapConverter.markdown_to_tiptap("")

        assert result["type"] == "doc"
        # Empty content returns empty paragraph
        assert result["content"] == [{"type": "paragraph"}]

    def test_whitespace_only(self):
        """Test converting whitespace-only string"""
        result = TipTapConverter.markdown_to_tiptap("   \n\n   ")

        assert result["type"] == "doc"
        # Whitespace-only content returns empty paragraph
        assert result["content"] == [{"type": "paragraph"}]


class TestParseTemplateContent:
    """Test template content parsing"""

    def test_parse_paragraph_section(self):
        """Test parsing paragraph section from template"""
        content = """
<!-- section:raw_thoughts @title:"Raw Thoughts" @type:paragraph -->
This is my journal entry.
<!-- /section:raw_thoughts -->
        """

        result = TipTapConverter.parse_template_content(content)

        assert result is not None
        assert "raw_thoughts" in result
        assert result["raw_thoughts"]["type"] == "doc"
        assert result["raw_thoughts"]["content"][0]["content"][0]["text"] == "This is my journal entry."

    def test_parse_qa_section(self):
        """Test parsing Q&A section from template"""
        content = """
<!-- section:reflection @title:"Reflection" @type:q_and_a -->
[{"id": "q1", "question": "What did you learn?", "answer": "A lot", "isCollapsed": false}]
<!-- /section:reflection -->
        """

        result = TipTapConverter.parse_template_content(content)

        assert result is not None
        assert "reflection" in result
        assert result["reflection"]["type"] == "doc"
        assert result["reflection"]["content"][0]["type"] == "qaPair"
        assert result["reflection"]["content"][0]["attrs"]["question"] == "What did you learn?"
        assert result["reflection"]["content"][0]["attrs"]["answer"] == "A lot"

    def test_parse_multiple_sections(self):
        """Test parsing multiple sections"""
        content = """
<!-- section:section1 @title:"Section 1" @type:paragraph -->
Content 1
<!-- /section:section1 -->

<!-- section:section2 @title:"Section 2" @type:paragraph -->
Content 2
<!-- /section:section2 -->
        """

        result = TipTapConverter.parse_template_content(content)

        assert result is not None
        assert len(result) == 2
        assert "section1" in result
        assert "section2" in result

    def test_parse_no_sections(self):
        """Test parsing content with no sections"""
        content = "Just regular markdown content"

        result = TipTapConverter.parse_template_content(content)

        assert result is None

    def test_parse_empty_section(self):
        """Test parsing empty section"""
        content = """
<!-- section:empty @title:"Empty" @type:paragraph -->
<!-- /section:empty -->
        """

        result = TipTapConverter.parse_template_content(content)

        assert result is not None
        assert "empty" in result
        # Empty section returns empty paragraph
        assert result["empty"]["content"] == [{"type": "paragraph"}]


class TestQAToTipTap:
    """Test Q&A pairs to TipTap conversion"""

    def test_single_qa_pair(self):
        """Test converting single Q&A pair"""
        qa_pairs = [
            {
                "id": "q1",
                "question": "What is your name?",
                "answer": "Alice",
                "isCollapsed": False
            }
        ]

        result = TipTapConverter._qa_to_tiptap(qa_pairs)

        assert result["type"] == "doc"
        assert len(result["content"]) == 1
        assert result["content"][0]["type"] == "qaPair"
        assert result["content"][0]["attrs"]["id"] == "q1"
        assert result["content"][0]["attrs"]["question"] == "What is your name?"
        assert result["content"][0]["attrs"]["answer"] == "Alice"
        assert result["content"][0]["attrs"]["isCollapsed"] is False

    def test_multiple_qa_pairs(self):
        """Test converting multiple Q&A pairs"""
        qa_pairs = [
            {"id": "q1", "question": "Q1", "answer": "A1", "isCollapsed": False},
            {"id": "q2", "question": "Q2", "answer": "A2", "isCollapsed": True}
        ]

        result = TipTapConverter._qa_to_tiptap(qa_pairs)

        assert len(result["content"]) == 2
        assert result["content"][0]["attrs"]["question"] == "Q1"
        assert result["content"][1]["attrs"]["question"] == "Q2"
        assert result["content"][1]["attrs"]["isCollapsed"] is True

    def test_empty_qa_list(self):
        """Test converting empty Q&A list"""
        result = TipTapConverter._qa_to_tiptap([])

        assert result["type"] == "doc"
        # Empty list returns empty paragraph
        assert result["content"] == [{"type": "paragraph"}]


class TestAutoMigrateJournal:
    """Test journal auto-migration"""

    def test_migrate_journal_with_no_tiptap(self):
        """Test migrating journal that has no TipTap content"""
        journal_data = {
            "journal_id": "j1",
            "content": "Regular markdown content",
            "template_id": None
        }

        result = TipTapConverter.auto_migrate_journal(journal_data)

        assert "content_tiptap" in result
        assert result["content_tiptap"]["type"] == "doc"
        assert len(result["content_tiptap"]["content"]) == 1

    def test_migrate_journal_with_existing_tiptap(self):
        """Test that journal with existing TipTap is not migrated"""
        journal_data = {
            "journal_id": "j1",
            "content": "Regular markdown content",
            "content_tiptap": {"type": "doc", "content": []},
            "template_id": None
        }

        result = TipTapConverter.auto_migrate_journal(journal_data)

        # Should return unchanged
        assert result["content_tiptap"] == journal_data["content_tiptap"]

    def test_migrate_template_journal(self):
        """Test migrating template-based journal"""
        journal_data = {
            "journal_id": "j1",
            "content": """
<!-- section:thoughts @title:"Thoughts" @type:paragraph -->
My thoughts today
<!-- /section:thoughts -->
            """,
            "template_id": "daily-journal"
        }

        result = TipTapConverter.auto_migrate_journal(journal_data)

        assert "content_tiptap" in result
        assert "thoughts" in result["content_tiptap"]
        assert result["content_tiptap"]["thoughts"]["type"] == "doc"

    def test_migrate_journal_with_empty_content(self):
        """Test migrating journal with empty content"""
        journal_data = {
            "journal_id": "j1",
            "content": "",
            "template_id": None
        }

        result = TipTapConverter.auto_migrate_journal(journal_data)

        assert "content_tiptap" in result
        assert result["content_tiptap"]["type"] == "doc"
        # Empty content returns empty paragraph
        assert result["content_tiptap"]["content"] == [{"type": "paragraph"}]

    def test_migrate_preserves_other_fields(self):
        """Test that migration preserves all other journal fields"""
        journal_data = {
            "journal_id": "j1",
            "title": "My Journal",
            "content": "Content",
            "tags": ["tag1"],
            "emotions": ["happy"],
            "is_private": True,
            "template_id": None
        }

        result = TipTapConverter.auto_migrate_journal(journal_data)

        assert result["journal_id"] == "j1"
        assert result["title"] == "My Journal"
        assert result["tags"] == ["tag1"]
        assert result["emotions"] == ["happy"]
        assert result["is_private"] is True
        assert "content_tiptap" in result
