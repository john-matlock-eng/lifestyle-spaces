"""
Unit tests for AI Metadata Generator Service
"""
import pytest
import json
from datetime import datetime, timezone
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from app.services.metadata_generator import (
    MetadataGenerator,
    get_metadata_generator,
    reset_metadata_generator,
    METADATA_SYSTEM_PROMPT,
    METADATA_USER_PROMPT,
)
from app.models.ai_metadata import JournalAIMetadata, SentimentType


@pytest.fixture
def mock_anthropic_response():
    """Mock Anthropic message response with metadata JSON."""
    response_json = {
        "synopsis": "A reflective journal entry about personal growth and overcoming challenges.",
        "themes": ["growth", "resilience", "self-awareness", "goals"],
        "insights": [
            "Recognized the importance of patience",
            "Learned to embrace uncertainty"
        ],
        "sentiment": "reflective",
        "emotionalTone": "hopeful but grounded"
    }

    mock_content = Mock()
    mock_content.text = json.dumps(response_json)

    mock_message = Mock()
    mock_message.content = [mock_content]

    return mock_message


@pytest.fixture
def mock_anthropic_response_with_code_block():
    """Mock Anthropic response with markdown code block."""
    response_json = {
        "synopsis": "Journal entry with code block response.",
        "themes": ["testing"],
        "insights": [],
        "sentiment": "neutral",
        "emotionalTone": ""
    }

    mock_content = Mock()
    mock_content.text = f"```json\n{json.dumps(response_json)}\n```"

    mock_message = Mock()
    mock_message.content = [mock_content]

    return mock_message


@pytest.fixture
def sample_journal_content():
    """Sample journal content for testing."""
    return """
    Today I spent some time reflecting on my goals and what I want to achieve.
    I've realized that patience is key - things don't happen overnight.

    Gratitude:
    - My family's support
    - Good health
    - The opportunity to grow

    I'm feeling hopeful about the future, even though there's uncertainty.
    Learning to embrace that uncertainty has been a journey in itself.
    """


@pytest.fixture
def sample_tiptap_content():
    """Sample TipTap JSON content for testing."""
    return {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {"type": "text", "text": "Today I reflected on my goals."}
                ]
            },
            {
                "type": "paragraph",
                "content": [
                    {"type": "text", "text": "I'm grateful for family and health."}
                ]
            }
        ]
    }


class TestMetadataGenerator:
    """Test cases for MetadataGenerator."""

    def test_extract_text_content_string(self):
        """Test extracting text from string content."""
        generator = MetadataGenerator()
        result = generator._extract_text_content("Hello, this is plain text.")
        assert result == "Hello, this is plain text."

    def test_extract_text_content_tiptap(self, sample_tiptap_content):
        """Test extracting text from TipTap JSON content."""
        generator = MetadataGenerator()
        result = generator._extract_text_content(sample_tiptap_content)
        assert "Today I reflected on my goals" in result
        assert "grateful for family and health" in result

    def test_extract_text_content_none(self):
        """Test extracting text from None content."""
        generator = MetadataGenerator()
        result = generator._extract_text_content(None)
        assert result == ""

    def test_extract_tiptap_text_nested(self):
        """Test extracting text from nested TipTap structure."""
        generator = MetadataGenerator()
        nested_content = {
            "type": "doc",
            "content": [
                {
                    "type": "bulletList",
                    "content": [
                        {
                            "type": "listItem",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [
                                        {"type": "text", "text": "Item 1"}
                                    ]
                                }
                            ]
                        },
                        {
                            "type": "listItem",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [
                                        {"type": "text", "text": "Item 2"}
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        result = generator._extract_tiptap_text(nested_content)
        assert "Item 1" in result
        assert "Item 2" in result

    def test_normalize_themes_valid(self):
        """Test normalizing valid themes."""
        generator = MetadataGenerator()
        themes = ["Growth", "  resilience  ", "Self-Awareness", "GOALS"]
        result = generator._normalize_themes(themes)
        assert "growth" in result
        assert "resilience" in result
        assert "self-awareness" in result
        assert "goals" in result

    def test_normalize_themes_empty(self):
        """Test normalizing empty themes list."""
        generator = MetadataGenerator()
        result = generator._normalize_themes([])
        assert result == ["reflection"]

    def test_normalize_themes_duplicates(self):
        """Test normalizing themes with duplicates."""
        generator = MetadataGenerator()
        themes = ["growth", "Growth", "GROWTH"]
        result = generator._normalize_themes(themes)
        assert len([t for t in result if t == "growth"]) == 1

    def test_normalize_themes_limit(self):
        """Test normalizing themes respects limit."""
        generator = MetadataGenerator()
        themes = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"]
        result = generator._normalize_themes(themes)
        assert len(result) <= 7

    def test_normalize_sentiment_valid(self):
        """Test normalizing valid sentiment values."""
        generator = MetadataGenerator()
        for sentiment in ["reflective", "positive", "challenging", "grateful",
                         "anxious", "hopeful", "neutral", "mixed"]:
            result = generator._normalize_sentiment(sentiment)
            assert result == sentiment

    def test_normalize_sentiment_uppercase(self):
        """Test normalizing uppercase sentiment."""
        generator = MetadataGenerator()
        result = generator._normalize_sentiment("POSITIVE")
        assert result == "positive"

    def test_normalize_sentiment_invalid(self):
        """Test normalizing invalid sentiment defaults to neutral."""
        generator = MetadataGenerator()
        result = generator._normalize_sentiment("invalid_sentiment")
        assert result == "neutral"

    def test_normalize_sentiment_empty(self):
        """Test normalizing empty sentiment defaults to neutral."""
        generator = MetadataGenerator()
        result = generator._normalize_sentiment("")
        assert result == "neutral"

    def test_create_minimal_metadata(self):
        """Test creating minimal metadata for short content."""
        generator = MetadataGenerator()
        result = generator._create_minimal_metadata("My Title")

        assert "My Title" in result.synopsis
        assert result.themes == ["reflection"]
        assert result.insights == []
        assert result.sentiment == "neutral"
        assert result.model_used == "none"

    def test_create_minimal_metadata_untitled(self):
        """Test creating minimal metadata for untitled journal."""
        generator = MetadataGenerator()
        result = generator._create_minimal_metadata("")

        assert "Untitled" in result.synopsis

    @pytest.mark.asyncio
    @patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"})
    @patch("app.services.metadata_generator.anthropic.Anthropic")
    async def test_generate_metadata_success(
        self, mock_anthropic_class, mock_anthropic_response
    ):
        """Test successful metadata generation."""
        # Setup mock
        mock_client = Mock()
        mock_client.messages.create.return_value = mock_anthropic_response
        mock_anthropic_class.return_value = mock_client

        reset_metadata_generator()
        generator = MetadataGenerator()

        # Generate
        content = "This is a journal entry with enough content. " * 10
        result = await generator.generate_metadata(
            journal_id="test-123",
            title="My Reflection",
            content=content
        )

        # Assert
        assert isinstance(result, JournalAIMetadata)
        assert "personal growth" in result.synopsis
        assert "growth" in result.themes
        assert result.sentiment == "reflective"

    @pytest.mark.asyncio
    @patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"})
    @patch("app.services.metadata_generator.anthropic.Anthropic")
    async def test_generate_metadata_with_code_block(
        self, mock_anthropic_class, mock_anthropic_response_with_code_block
    ):
        """Test metadata generation when response has code block."""
        mock_client = Mock()
        mock_client.messages.create.return_value = mock_anthropic_response_with_code_block
        mock_anthropic_class.return_value = mock_client

        reset_metadata_generator()
        generator = MetadataGenerator()

        content = "This is a journal entry with enough content. " * 10
        result = await generator.generate_metadata(
            journal_id="test-123",
            title="Test Journal",
            content=content
        )

        assert isinstance(result, JournalAIMetadata)
        assert result.themes == ["testing"]

    @pytest.mark.asyncio
    async def test_generate_metadata_short_content(self):
        """Test metadata generation with insufficient content."""
        reset_metadata_generator()
        generator = MetadataGenerator()

        result = await generator.generate_metadata(
            journal_id="test-123",
            title="Short Entry",
            content="Too short"
        )

        # Should return minimal metadata
        assert "Short Entry" in result.synopsis
        assert result.model_used == "none"

    @pytest.mark.asyncio
    @patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"})
    @patch("app.services.metadata_generator.anthropic.Anthropic")
    async def test_generate_metadata_truncates_long_content(
        self, mock_anthropic_class, mock_anthropic_response
    ):
        """Test that very long content is truncated."""
        mock_client = Mock()
        mock_client.messages.create.return_value = mock_anthropic_response
        mock_anthropic_class.return_value = mock_client

        reset_metadata_generator()
        generator = MetadataGenerator()

        # Very long content
        long_content = "This is repeated content. " * 1000

        result = await generator.generate_metadata(
            journal_id="test-123",
            title="Long Entry",
            content=long_content
        )

        # Verify API was called
        mock_client.messages.create.assert_called_once()
        call_args = mock_client.messages.create.call_args
        user_message = call_args[1]["messages"][0]["content"]

        # Should contain truncation notice
        assert "[Content truncated for analysis]" in user_message

    @pytest.mark.asyncio
    @patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"})
    @patch("app.services.metadata_generator.anthropic.Anthropic")
    async def test_generate_metadata_json_error(self, mock_anthropic_class):
        """Test handling of invalid JSON response."""
        mock_content = Mock()
        mock_content.text = "This is not valid JSON"

        mock_message = Mock()
        mock_message.content = [mock_content]

        mock_client = Mock()
        mock_client.messages.create.return_value = mock_message
        mock_anthropic_class.return_value = mock_client

        reset_metadata_generator()
        generator = MetadataGenerator()

        content = "This is a journal entry with enough content. " * 10
        result = await generator.generate_metadata(
            journal_id="test-123",
            title="Test",
            content=content
        )

        # Should return minimal metadata on JSON error
        assert result.model_used == "none"

    @pytest.mark.asyncio
    @patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"})
    @patch("app.services.metadata_generator.anthropic.Anthropic")
    async def test_generate_metadata_api_error(self, mock_anthropic_class):
        """Test handling of Anthropic API error."""
        import anthropic

        mock_client = Mock()
        mock_client.messages.create.side_effect = anthropic.APIError(
            message="Rate limit exceeded",
            request=Mock(),
            body=None
        )
        mock_anthropic_class.return_value = mock_client

        reset_metadata_generator()
        generator = MetadataGenerator()

        content = "This is a journal entry with enough content. " * 10

        with pytest.raises(anthropic.APIError):
            await generator.generate_metadata(
                journal_id="test-123",
                title="Test",
                content=content
            )

    @pytest.mark.asyncio
    @patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"})
    @patch("app.services.metadata_generator.anthropic.Anthropic")
    async def test_generate_metadata_unexpected_error(self, mock_anthropic_class):
        """Test handling of unexpected errors returns minimal metadata."""
        mock_client = Mock()
        mock_client.messages.create.side_effect = RuntimeError("Unexpected")
        mock_anthropic_class.return_value = mock_client

        reset_metadata_generator()
        generator = MetadataGenerator()

        content = "This is a journal entry with enough content. " * 10
        result = await generator.generate_metadata(
            journal_id="test-123",
            title="Test",
            content=content
        )

        # Should return minimal metadata on unexpected error
        assert result.model_used == "none"


class TestMetadataGeneratorSingleton:
    """Test singleton pattern for MetadataGenerator."""

    def test_get_metadata_generator_singleton(self):
        """Test that get_metadata_generator returns singleton."""
        reset_metadata_generator()

        gen1 = get_metadata_generator()
        gen2 = get_metadata_generator()

        assert gen1 is gen2

    def test_reset_metadata_generator(self):
        """Test that reset creates new instance."""
        reset_metadata_generator()

        gen1 = get_metadata_generator()
        reset_metadata_generator()
        gen2 = get_metadata_generator()

        assert gen1 is not gen2


class TestMetadataPrompts:
    """Test prompt templates."""

    def test_system_prompt_exists(self):
        """Test that system prompt is defined."""
        assert METADATA_SYSTEM_PROMPT is not None
        assert len(METADATA_SYSTEM_PROMPT) > 100

    def test_system_prompt_contains_json_schema(self):
        """Test that system prompt describes JSON format."""
        assert "synopsis" in METADATA_SYSTEM_PROMPT
        assert "themes" in METADATA_SYSTEM_PROMPT
        assert "insights" in METADATA_SYSTEM_PROMPT
        assert "sentiment" in METADATA_SYSTEM_PROMPT

    def test_user_prompt_template(self):
        """Test user prompt template."""
        prompt = METADATA_USER_PROMPT.format(
            title="Test Title",
            content="Test content here"
        )
        assert "Test Title" in prompt
        assert "Test content here" in prompt
