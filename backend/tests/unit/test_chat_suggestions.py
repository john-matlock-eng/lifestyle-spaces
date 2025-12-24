"""
Tests for Chat Suggestions Service
"""

import pytest
from app.models.chat import ChatMode
from app.services.chat_suggestions import (
    get_suggestions,
    get_all_suggestions,
    AUTHOR_SUGGESTIONS,
    SUPPORTER_SUGGESTIONS_TEMPLATE,
)


class TestGetSuggestions:
    """Tests for get_suggestions function."""

    def test_author_mode_returns_author_suggestions(self):
        """Author mode returns self-reflection suggestions."""
        suggestions = get_suggestions(ChatMode.AUTHOR)

        assert len(suggestions) == 4  # Default limit
        assert all("icon" in s for s in suggestions)
        assert all("text" in s for s in suggestions)
        assert all("category" in s for s in suggestions)

        # Should be about "my" journals
        texts = [s["text"] for s in suggestions]
        assert any("my" in t.lower() for t in texts)

    def test_supporter_mode_returns_supporter_suggestions(self):
        """Supporter mode returns support-focused suggestions."""
        suggestions = get_suggestions(ChatMode.SUPPORTER, author_name="Alex")

        assert len(suggestions) == 4

        # Should reference the author by name
        texts = [s["text"] for s in suggestions]
        assert any("Alex" in t for t in texts)

        # Should be about support/understanding
        all_text = " ".join(texts).lower()
        assert "support" in all_text or "help" in all_text or "feeling" in all_text

    def test_supporter_mode_default_name(self):
        """Supporter mode uses 'them' when no name provided."""
        suggestions = get_suggestions(ChatMode.SUPPORTER, author_name=None)

        texts = [s["text"] for s in suggestions]
        assert any("them" in t for t in texts)
        assert not any("{name}" in t for t in texts)  # No unreplaced templates

    def test_limit_parameter(self):
        """Respects the limit parameter."""
        suggestions_2 = get_suggestions(ChatMode.AUTHOR, limit=2)
        suggestions_6 = get_suggestions(ChatMode.AUTHOR, limit=6)

        assert len(suggestions_2) == 2
        assert len(suggestions_6) == 6

    def test_limit_exceeds_available(self):
        """Handles limit larger than available suggestions."""
        suggestions = get_suggestions(ChatMode.AUTHOR, limit=100)

        assert len(suggestions) == len(AUTHOR_SUGGESTIONS)

    def test_suggestions_have_required_fields(self):
        """All suggestions have required fields."""
        for mode in [ChatMode.AUTHOR, ChatMode.SUPPORTER]:
            suggestions = get_suggestions(mode, author_name="Test")

            for s in suggestions:
                assert "icon" in s
                assert "text" in s
                assert "category" in s
                assert isinstance(s["icon"], str)
                assert isinstance(s["text"], str)
                assert isinstance(s["category"], str)
                assert len(s["icon"]) > 0
                assert len(s["text"]) > 0

    def test_no_template_variables_in_output(self):
        """No unreplaced template variables in output."""
        for name in [None, "Alex", "Test User"]:
            suggestions = get_suggestions(ChatMode.SUPPORTER, author_name=name)

            for s in suggestions:
                assert "{name}" not in s["text"]
                assert "{" not in s["text"]


class TestGetAllSuggestions:
    """Tests for get_all_suggestions function."""

    def test_returns_all_author_suggestions(self):
        """Returns all author suggestions without limit."""
        suggestions = get_all_suggestions(ChatMode.AUTHOR)

        assert len(suggestions) == len(AUTHOR_SUGGESTIONS)

    def test_returns_all_supporter_suggestions(self):
        """Returns all supporter suggestions without limit."""
        suggestions = get_all_suggestions(ChatMode.SUPPORTER, author_name="Alex")

        assert len(suggestions) == len(SUPPORTER_SUGGESTIONS_TEMPLATE)

    def test_does_not_modify_originals(self):
        """Getting suggestions doesn't modify the original templates."""
        original_count = len(AUTHOR_SUGGESTIONS)
        original_first = AUTHOR_SUGGESTIONS[0]["text"]

        get_all_suggestions(ChatMode.AUTHOR)
        get_all_suggestions(ChatMode.SUPPORTER, author_name="Test")

        assert len(AUTHOR_SUGGESTIONS) == original_count
        assert AUTHOR_SUGGESTIONS[0]["text"] == original_first


class TestSuggestionContent:
    """Tests for suggestion content quality."""

    def test_author_suggestions_are_self_focused(self):
        """Author suggestions focus on self-reflection."""
        suggestions = get_all_suggestions(ChatMode.AUTHOR)
        texts = [s["text"].lower() for s in suggestions]

        # Should use first person
        first_person_count = sum(1 for t in texts if "my" in t or "i " in t or "me" in t)
        assert first_person_count >= len(texts) // 2

    def test_supporter_suggestions_are_other_focused(self):
        """Supporter suggestions focus on understanding someone else."""
        suggestions = get_all_suggestions(ChatMode.SUPPORTER, author_name="Partner")
        texts = [s["text"].lower() for s in suggestions]

        # Should reference the other person
        other_person_count = sum(1 for t in texts if "partner" in t)
        assert other_person_count >= len(texts) // 2

    def test_suggestions_are_questions_or_requests(self):
        """Suggestions are phrased as questions or actionable requests."""
        for mode in [ChatMode.AUTHOR, ChatMode.SUPPORTER]:
            suggestions = get_all_suggestions(mode, author_name="Test")

            for s in suggestions:
                text = s["text"]
                # Should end with ? or be a request
                is_question = text.endswith("?")
                is_request = text.lower().startswith(
                    ("how", "what", "tell", "show", "help", "is")
                )
                assert is_question or is_request, f"Suggestion not actionable: {text}"

    def test_icon_names_are_valid_lucide_icons(self):
        """Icon names correspond to valid Lucide icons."""
        valid_icons = {
            "TrendingUp",
            "TrendingDown",
            "Heart",
            "Target",
            "Sparkles",
            "Lightbulb",
            "HelpCircle",
            "MessageCircle",
            "Star",
            "AlertCircle",
            "Clock",
            "Calendar",
            "CheckCircle",
            "XCircle",
            "Info",
        }

        for mode in [ChatMode.AUTHOR, ChatMode.SUPPORTER]:
            suggestions = get_all_suggestions(mode, author_name="Test")

            for s in suggestions:
                assert s["icon"] in valid_icons, f"Invalid icon: {s['icon']}"


class TestSuggestionCategories:
    """Tests for suggestion categories."""

    def test_author_suggestions_have_unique_categories(self):
        """Author suggestions have distinct categories."""
        suggestions = get_all_suggestions(ChatMode.AUTHOR)
        categories = [s["category"] for s in suggestions]

        assert len(categories) == len(set(categories)), "Categories should be unique"

    def test_supporter_suggestions_have_unique_categories(self):
        """Supporter suggestions have distinct categories."""
        suggestions = get_all_suggestions(ChatMode.SUPPORTER, author_name="Test")
        categories = [s["category"] for s in suggestions]

        assert len(categories) == len(set(categories)), "Categories should be unique"

    def test_categories_are_descriptive(self):
        """Categories are lowercase and descriptive."""
        for mode in [ChatMode.AUTHOR, ChatMode.SUPPORTER]:
            suggestions = get_all_suggestions(mode, author_name="Test")

            for s in suggestions:
                category = s["category"]
                assert category == category.lower(), f"Category not lowercase: {category}"
                assert len(category) >= 4, f"Category too short: {category}"
                assert "_" in category or category.isalpha(), (
                    f"Category should be alpha or snake_case: {category}"
                )
