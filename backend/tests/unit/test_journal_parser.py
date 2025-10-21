"""
Unit tests for the JournalParser service.

Tests the parsing of journal content with embedded template metadata.
"""
import pytest
from app.services.journal_parser import JournalParser, ParsedJournal, ParsedSection


class TestJournalParser:
    """Test suite for JournalParser functionality."""

    def test_parse_complete_journal(self):
        """Test parsing a complete journal with all metadata."""
        content = '''<!--
@template: daily-journal
@version: 1.0
@created: 2024-01-15T10:30:00Z
@metadata: {"title":"My Day","emotions":["happy","grateful"]}
-->

<!-- section:gratitude @title:"Three Things" @type:list -->
- Morning coffee
- Good weather
- Productive meeting
<!-- /section:gratitude -->

<!-- section:reflection @title:"Reflection" @type:prose -->
Today was productive.
<!-- /section:reflection -->'''

        parsed = JournalParser.parse(content)

        # Verify template metadata
        assert parsed.template == "daily-journal"
        assert parsed.template_version == "1.0"
        assert parsed.created == "2024-01-15T10:30:00Z"
        assert parsed.metadata["title"] == "My Day"
        assert "happy" in parsed.metadata["emotions"]
        assert "grateful" in parsed.metadata["emotions"]

        # Verify gratitude section
        assert "gratitude" in parsed.sections
        assert parsed.sections["gratitude"].title == "Three Things"
        assert parsed.sections["gratitude"].type == "list"
        assert "Morning coffee" in parsed.sections["gratitude"].content
        assert "Good weather" in parsed.sections["gratitude"].content

        # Verify reflection section
        assert "reflection" in parsed.sections
        assert parsed.sections["reflection"].title == "Reflection"
        assert "productive" in parsed.sections["reflection"].content

    def test_extract_searchable_metadata(self):
        """Test metadata extraction for database indexing."""
        content = '''<!--
@template: daily-journal
@version: 1.0
@metadata: {"title":"Test Journal","mood":"happy","rating":5}
-->

<!-- section:test @title:"Test Section" -->
Content
<!-- /section:test -->'''

        metadata = JournalParser.extract_searchable_metadata(content)

        assert metadata["template"] == "daily-journal"
        assert metadata["template_version"] == "1.0"
        assert metadata["has_sections"] is True
        assert metadata["section_count"] == 1
        assert "test" in metadata["section_ids"]
        assert metadata["mood"] == "happy"
        assert metadata["rating"] == 5

    def test_extract_searchable_metadata_with_emotions(self):
        """Test extraction of emotions list."""
        content = '''<!--
@metadata: {"emotions":["happy","excited","grateful"]}
-->
Content'''

        metadata = JournalParser.extract_searchable_metadata(content)

        assert "emotions" in metadata
        assert len(metadata["emotions"]) == 3
        assert "happy" in metadata["emotions"]

    def test_extract_clean_markdown(self):
        """Test extraction of clean markdown without metadata."""
        content = '''<!--
@template: daily-journal
@version: 1.0
-->

<!-- section:gratitude @title:"Gratitude" -->
- Item 1
- Item 2
<!-- /section:gratitude -->

Regular paragraph here.

Another paragraph.'''

        clean = JournalParser.extract_clean_markdown(content)

        # Should not contain metadata
        assert "<!--" not in clean
        assert "@template" not in clean
        assert "section:" not in clean

        # Should contain actual content
        assert "Item 1" in clean
        assert "Item 2" in clean
        assert "Regular paragraph" in clean
        assert "Another paragraph" in clean

    def test_extract_clean_markdown_reduces_newlines(self):
        """Test that excessive newlines are reduced."""
        content = '''Content 1



Content 2'''

        clean = JournalParser.extract_clean_markdown(content)

        # Should reduce multiple newlines to two
        assert '\n\n\n' not in clean
        assert 'Content 1\n\nContent 2' in clean

    def test_parse_malformed_json(self):
        """Test graceful handling of malformed JSON metadata."""
        content = '''<!--
@template: test-template
@metadata: {broken json here}
-->
Content'''

        parsed = JournalParser.parse(content)

        # Should handle error gracefully
        assert parsed.template == "test-template"
        assert parsed.metadata == {}  # Should default to empty dict
        assert parsed.raw_content == content

    def test_parse_empty_content(self):
        """Test parsing empty content."""
        parsed = JournalParser.parse("")

        assert parsed.template is None
        assert parsed.sections == {}
        assert parsed.metadata == {}
        assert parsed.raw_content == ""

    def test_parse_none_content(self):
        """Test parsing None content."""
        parsed = JournalParser.parse(None)

        assert parsed.template is None
        assert parsed.sections == {}

    def test_parse_plain_markdown(self):
        """Test parsing content without any template structure."""
        content = "Just plain markdown content\n\nWith paragraphs"
        parsed = JournalParser.parse(content)

        assert parsed.template is None
        assert len(parsed.sections) == 0
        assert parsed.raw_content == content

    def test_parse_unclosed_section(self):
        """Test handling of unclosed sections."""
        content = '''<!-- section:test @title:"Test Section" -->
This is content without a closing tag'''

        parsed = JournalParser.parse(content)

        assert "test" in parsed.sections
        assert parsed.sections["test"].title == "Test Section"
        assert "content without a closing tag" in parsed.sections["test"].content

    def test_parse_section_with_whitespace(self):
        """Test that whitespace in sections is preserved."""
        content = '''<!-- section:code @title:"Code" -->
    function test() {
      return true;
    }
<!-- /section:code -->'''

        parsed = JournalParser.parse(content)

        assert "code" in parsed.sections
        # Should preserve indentation
        assert "    function test()" in parsed.sections["code"].content
        assert "      return true;" in parsed.sections["code"].content

    def test_parse_multiple_sections(self):
        """Test parsing multiple sections."""
        content = '''<!--
@template: test
-->

<!-- section:section1 @title:"Section 1" -->
Content 1
<!-- /section:section1 -->

<!-- section:section2 @title:"Section 2" -->
Content 2
<!-- /section:section2 -->

<!-- section:section3 @title:"Section 3" -->
Content 3
<!-- /section:section3 -->'''

        parsed = JournalParser.parse(content)

        assert len(parsed.sections) == 3
        assert "section1" in parsed.sections
        assert "section2" in parsed.sections
        assert "section3" in parsed.sections
        assert "Content 1" in parsed.sections["section1"].content
        assert "Content 2" in parsed.sections["section2"].content
        assert "Content 3" in parsed.sections["section3"].content

    def test_parse_attributes_quoted(self):
        """Test parsing quoted attributes."""
        content = '''<!-- section:test @title:"My Title" @type:prose @required:true -->
Content
<!-- /section:test -->'''

        parsed = JournalParser.parse(content)

        assert parsed.sections["test"].title == "My Title"
        assert parsed.sections["test"].type == "prose"
        assert parsed.sections["test"].attributes.get("required") == "true"

    def test_parse_attributes_mixed(self):
        """Test parsing mixed quoted and unquoted attributes."""
        content = '''<!-- section:test @title:"My Title" @type:prose @limit:100 -->
Content
<!-- /section:test -->'''

        parsed = JournalParser.parse(content)

        assert parsed.sections["test"].title == "My Title"
        assert parsed.sections["test"].type == "prose"
        assert parsed.sections["test"].attributes.get("limit") == "100"

    def test_parse_no_sections(self):
        """Test parsing journal with metadata but no sections."""
        content = '''<!--
@template: simple
@metadata: {"title":"Simple Journal"}
-->

Just some plain content here.'''

        parsed = JournalParser.parse(content)

        assert parsed.template == "simple"
        assert parsed.metadata["title"] == "Simple Journal"
        assert len(parsed.sections) == 0

    def test_extract_searchable_metadata_no_template(self):
        """Test metadata extraction from plain markdown."""
        content = "Plain markdown without template"

        metadata = JournalParser.extract_searchable_metadata(content)

        assert metadata["template"] is None
        assert metadata["has_sections"] is False
        assert metadata["section_count"] == 0
        assert metadata["section_ids"] == []

    def test_section_id_as_title_fallback(self):
        """Test that section ID can be extracted even without title."""
        content = '''<!-- section:mysection @type:prose -->
Content
<!-- /section:mysection -->'''

        parsed = JournalParser.parse(content)

        assert "mysection" in parsed.sections
        assert parsed.sections["mysection"].type == "prose"
        # Title is None when not specified
        assert parsed.sections["mysection"].title is None
