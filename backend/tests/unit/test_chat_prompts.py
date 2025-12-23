"""
Tests for Chat System Prompts
"""

import pytest
from app.models.chat import ChatMode
from app.services.chat_prompts import (
    get_system_prompt,
    get_welcome_message,
    ELLIE_AUTHOR_PROMPT,
    ELLIE_SUPPORTER_PROMPT_TEMPLATE,
)


class TestGetSystemPrompt:
    """Tests for get_system_prompt function."""

    def test_author_mode_returns_author_prompt(self):
        """Author mode returns the author-specific prompt."""
        prompt = get_system_prompt(ChatMode.AUTHOR)

        assert prompt == ELLIE_AUTHOR_PROMPT
        assert "their own journal entries" in prompt.lower()

    def test_supporter_mode_substitutes_author_name(self):
        """Supporter mode substitutes author name throughout."""
        prompt = get_system_prompt(ChatMode.SUPPORTER, author_name="Alex")

        assert "Alex" in prompt
        assert "{author_name}" not in prompt  # Template replaced
        assert "support" in prompt.lower()

    def test_supporter_mode_default_name(self):
        """Supporter mode uses default name when none provided."""
        prompt = get_system_prompt(ChatMode.SUPPORTER, author_name=None)

        assert "your partner" in prompt
        assert "{author_name}" not in prompt

    def test_author_prompt_contains_key_elements(self):
        """Author prompt contains essential guidance."""
        prompt = ELLIE_AUTHOR_PROMPT

        # Check for key elements
        assert "Ellie" in prompt
        assert "reflect" in prompt.lower()
        assert "pattern" in prompt.lower()
        assert "therapist" in prompt.lower()  # Boundary setting

    def test_supporter_prompt_contains_key_elements(self):
        """Supporter prompt template contains essential guidance."""
        prompt = ELLIE_SUPPORTER_PROMPT_TEMPLATE

        # Check for key elements
        assert "Ellie" in prompt
        assert "support" in prompt.lower()
        assert "understand" in prompt.lower()
        assert "{author_name}" in prompt  # Template variable
        assert "surveillance" in prompt.lower()  # Important guardrail

    def test_author_prompt_uses_second_person(self):
        """Author prompt addresses user directly."""
        prompt = ELLIE_AUTHOR_PROMPT

        # Should use "you" and "your" for direct address
        assert "your" in prompt.lower()
        assert "you" in prompt.lower()

    def test_supporter_prompt_multiple_substitutions(self):
        """Supporter prompt substitutes author name in all locations."""
        prompt = get_system_prompt(ChatMode.SUPPORTER, author_name="TestUser")

        # Count occurrences - name should appear multiple times
        count = prompt.count("TestUser")
        assert count > 5, f"Expected multiple substitutions, found {count}"

    def test_author_prompt_no_template_variables(self):
        """Author prompt has no unsubstituted template variables."""
        prompt = get_system_prompt(ChatMode.AUTHOR)

        assert "{" not in prompt
        assert "}" not in prompt

    def test_supporter_prompt_no_template_variables_after_substitution(self):
        """Supporter prompt has no template variables after substitution."""
        prompt = get_system_prompt(ChatMode.SUPPORTER, author_name="Someone")

        assert "{author_name}" not in prompt


class TestGetWelcomeMessage:
    """Tests for get_welcome_message function."""

    def test_author_mode_welcome(self):
        """Author mode has appropriate welcome message."""
        message = get_welcome_message(ChatMode.AUTHOR)

        assert "reflect" in message.lower()
        assert "your" in message.lower()

    def test_supporter_mode_welcome_with_name(self):
        """Supporter mode welcome uses author name."""
        message = get_welcome_message(ChatMode.SUPPORTER, author_name="Alex")

        assert "Alex" in message
        assert "support" in message.lower()

    def test_supporter_mode_welcome_default_name(self):
        """Supporter mode welcome uses default when no name."""
        message = get_welcome_message(ChatMode.SUPPORTER, author_name=None)

        assert "them" in message.lower()

    def test_welcome_messages_are_concise(self):
        """Welcome messages are reasonably short."""
        author_msg = get_welcome_message(ChatMode.AUTHOR)
        supporter_msg = get_welcome_message(ChatMode.SUPPORTER, author_name="Test")

        # Welcome messages should be under 200 characters
        assert len(author_msg) < 200
        assert len(supporter_msg) < 200


class TestPromptContent:
    """Tests for prompt content quality."""

    def test_author_prompt_mentions_patterns(self):
        """Author prompt should help users see patterns."""
        prompt = ELLIE_AUTHOR_PROMPT

        assert "pattern" in prompt.lower()

    def test_author_prompt_mentions_growth(self):
        """Author prompt should address personal growth."""
        prompt = ELLIE_AUTHOR_PROMPT

        assert "growth" in prompt.lower()

    def test_supporter_prompt_mentions_support(self):
        """Supporter prompt should focus on support."""
        prompt = ELLIE_SUPPORTER_PROMPT_TEMPLATE

        # "support" should appear multiple times
        count = prompt.lower().count("support")
        assert count >= 5

    def test_supporter_prompt_mentions_understanding(self):
        """Supporter prompt should emphasize understanding."""
        prompt = ELLIE_SUPPORTER_PROMPT_TEMPLATE

        assert "understand" in prompt.lower()

    def test_both_prompts_mention_ellie(self):
        """Both prompts should identify as Ellie."""
        assert "Ellie" in ELLIE_AUTHOR_PROMPT
        assert "Ellie" in ELLIE_SUPPORTER_PROMPT_TEMPLATE

    def test_both_prompts_mention_shih_tzu(self):
        """Both prompts should mention Shih Tzu character."""
        assert "Shih Tzu" in ELLIE_AUTHOR_PROMPT
        assert "Shih Tzu" in ELLIE_SUPPORTER_PROMPT_TEMPLATE

    def test_both_prompts_set_therapy_boundaries(self):
        """Both prompts should clarify not a therapist."""
        assert "therapist" in ELLIE_AUTHOR_PROMPT.lower()
        assert "therapy" in ELLIE_SUPPORTER_PROMPT_TEMPLATE.lower()

    def test_supporter_prompt_has_guardrails(self):
        """Supporter prompt should have privacy/care guardrails."""
        prompt = ELLIE_SUPPORTER_PROMPT_TEMPLATE

        # Should mention positive framing, not surveillance
        assert "surveillance" in prompt.lower()
        assert "care" in prompt.lower()


class TestPromptFormatting:
    """Tests for prompt formatting requirements."""

    def test_prompts_use_markdown_headers(self):
        """Prompts should use markdown section headers."""
        assert "##" in ELLIE_AUTHOR_PROMPT
        assert "##" in ELLIE_SUPPORTER_PROMPT_TEMPLATE

    def test_prompts_mention_no_headers_in_response(self):
        """Prompts should instruct not to use headers in responses."""
        assert "Never use headers" in ELLIE_AUTHOR_PROMPT
        assert "Never use headers" in ELLIE_SUPPORTER_PROMPT_TEMPLATE

    def test_prompts_mention_markdown_formatting(self):
        """Prompts should mention markdown formatting options."""
        # Author prompt
        assert "**bold**" in ELLIE_AUTHOR_PROMPT or "Bold" in ELLIE_AUTHOR_PROMPT
        assert "*italic" in ELLIE_AUTHOR_PROMPT.lower()

        # Supporter prompt
        assert "**bold**" in ELLIE_SUPPORTER_PROMPT_TEMPLATE or "Bold" in ELLIE_SUPPORTER_PROMPT_TEMPLATE
