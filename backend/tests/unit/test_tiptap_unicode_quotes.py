"""
Tests for TipTap Converter with Unicode quote handling
"""
import pytest
from app.utils.tiptap_converter import TipTapConverter


class TestUnicodeQuoteHandling:
    """Test handling of Unicode quotes in Q&A sections"""

    def test_parse_qa_with_curly_quotes(self):
        """Test parsing Q&A section with Unicode curly quotes"""
        # Simulate content with curly quotes (common when typed on mobile or with smart quotes)
        content = '''
<!-- section:reflection @title:"Reflection" @type:q_and_a -->
[{"id": "q1", "question": "What happened?", "answer": "He said \u201cHello\u201d to me.", "isCollapsed": false}]
<!-- /section:reflection -->
        '''

        result = TipTapConverter.parse_template_content(content)

        assert result is not None
        assert "reflection" in result
        assert result["reflection"]["type"] == "doc"
        assert len(result["reflection"]["content"]) == 1
        assert result["reflection"]["content"][0]["type"] == "qaPair"
        # The answer should have the quotes properly handled
        assert "Hello" in result["reflection"]["content"][0]["attrs"]["answer"]

    def test_parse_qa_with_mixed_unicode_characters(self):
        """Test parsing Q&A with various Unicode characters"""
        content = '''
<!-- section:test @title:"Test" @type:q_and_a -->
[{"id": "q1", "question": "Test?", "answer": "Mix of \u2018quotes\u2019 and ellipsis\u2026 and em-dash\u2014here!", "isCollapsed": false}]
<!-- /section:test -->
        '''

        result = TipTapConverter.parse_template_content(content)

        assert result is not None
        assert "test" in result
        assert result["test"]["content"][0]["type"] == "qaPair"
        answer = result["test"]["content"][0]["attrs"]["answer"]
        # Should have converted Unicode to ASCII equivalents
        assert "quotes" in answer
        assert "ellipsis" in answer

    def test_sanitize_json_converts_curly_quotes(self):
        """Test that _sanitize_json properly converts curly quotes"""
        malformed = '{"text": "He said \u201cHello\u201d"}'
        sanitized = TipTapConverter._sanitize_json(malformed)

        # Should have escaped quotes
        assert '\\"Hello\\"' in sanitized

        # Should parse successfully
        import json
        result = json.loads(sanitized)
        assert result["text"] == 'He said "Hello"'

    def test_sanitize_json_handles_ellipsis(self):
        """Test that _sanitize_json converts ellipsis"""
        malformed = '{"text": "Wait\u2026"}'
        sanitized = TipTapConverter._sanitize_json(malformed)

        # Should have converted ellipsis to three dots
        assert '...' in sanitized

        import json
        result = json.loads(sanitized)
        assert result["text"] == "Wait..."

    def test_sanitize_json_handles_em_dash(self):
        """Test that _sanitize_json converts em-dash and en-dash"""
        malformed = '{"text": "That\u2019s\u2014amazing\u2013right?"}'
        sanitized = TipTapConverter._sanitize_json(malformed)

        import json
        result = json.loads(sanitized)
        assert "--" in result["text"]  # em-dash
        assert "-" in result["text"]  # en-dash
