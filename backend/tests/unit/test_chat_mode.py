"""
Tests for Chat Mode Detection Service
"""

import pytest
from app.models.chat import ChatMode, ChatContext
from app.services.chat_mode import (
    detect_chat_mode,
    get_mode_description,
    AUTHOR_MODE_THRESHOLD,
)


class TestDetectChatMode:
    """Tests for detect_chat_mode function."""

    def test_empty_journals_returns_author_mode(self):
        """When no journals exist, default to author mode."""
        result = detect_chat_mode(
            current_user_id="user-123",
            journals=[],
        )

        assert result.mode == ChatMode.AUTHOR
        assert result.primary_author_id == "user-123"
        assert result.author_percentage == 1.0

    def test_no_user_id_returns_author_mode(self):
        """When no user ID provided, default to author mode."""
        result = detect_chat_mode(
            current_user_id="",
            journals=[{"userId": "other-user"}],
        )

        assert result.mode == ChatMode.AUTHOR

    def test_all_journals_by_current_user_returns_author_mode(self):
        """When user authored all journals, return author mode."""
        journals = [
            {"userId": "user-123", "journalId": "j1"},
            {"userId": "user-123", "journalId": "j2"},
            {"userId": "user-123", "journalId": "j3"},
        ]

        result = detect_chat_mode(
            current_user_id="user-123",
            journals=journals,
        )

        assert result.mode == ChatMode.AUTHOR
        assert result.primary_author_id == "user-123"
        assert result.author_percentage == 1.0

    def test_no_journals_by_current_user_returns_supporter_mode(self):
        """When user authored none of the journals, return supporter mode."""
        journals = [
            {"userId": "author-456", "journalId": "j1"},
            {"userId": "author-456", "journalId": "j2"},
            {"userId": "author-456", "journalId": "j3"},
        ]

        result = detect_chat_mode(
            current_user_id="supporter-123",
            journals=journals,
        )

        assert result.mode == ChatMode.SUPPORTER
        assert result.primary_author_id == "author-456"
        assert result.author_percentage == 0.0

    def test_exactly_50_percent_returns_author_mode(self):
        """At exactly 50% threshold, return author mode."""
        journals = [
            {"userId": "user-123", "journalId": "j1"},
            {"userId": "other-user", "journalId": "j2"},
        ]

        result = detect_chat_mode(
            current_user_id="user-123",
            journals=journals,
        )

        assert result.mode == ChatMode.AUTHOR
        assert result.author_percentage == 0.5

    def test_below_threshold_returns_supporter_mode(self):
        """Below 50% threshold, return supporter mode."""
        journals = [
            {"userId": "user-123", "journalId": "j1"},
            {"userId": "other-user", "journalId": "j2"},
            {"userId": "other-user", "journalId": "j3"},
        ]

        result = detect_chat_mode(
            current_user_id="user-123",
            journals=journals,
        )

        assert result.mode == ChatMode.SUPPORTER
        assert result.author_percentage == pytest.approx(0.333, rel=0.01)

    def test_mixed_authorship_primary_author_detection(self):
        """Correctly identifies primary author in mixed authorship."""
        journals = [
            {"userId": "author-a", "journalId": "j1"},
            {"userId": "author-a", "journalId": "j2"},
            {"userId": "author-a", "journalId": "j3"},
            {"userId": "author-b", "journalId": "j4"},
            {"userId": "author-b", "journalId": "j5"},
        ]

        result = detect_chat_mode(
            current_user_id="supporter-123",
            journals=journals,
        )

        assert result.mode == ChatMode.SUPPORTER
        assert result.primary_author_id == "author-a"  # Most frequent

    def test_handles_user_id_field_variations(self):
        """Handles different field names for user ID."""
        journals = [
            {"user_id": "user-123", "journalId": "j1"},  # snake_case
            {"userId": "user-123", "journalId": "j2"},  # camelCase
        ]

        result = detect_chat_mode(
            current_user_id="user-123",
            journals=journals,
        )

        assert result.mode == ChatMode.AUTHOR
        assert result.author_percentage == 1.0

    def test_handles_metadata_nested_user_id(self):
        """Handles userId nested in metadata."""
        journals = [
            {"metadata": {"userId": "user-123"}, "journalId": "j1"},
            {"metadata": {"userId": "user-123"}, "journalId": "j2"},
        ]

        result = detect_chat_mode(
            current_user_id="user-123",
            journals=journals,
        )

        assert result.mode == ChatMode.AUTHOR

    def test_custom_threshold(self):
        """Respects custom author threshold."""
        journals = [
            {"userId": "user-123", "journalId": "j1"},
            {"userId": "user-123", "journalId": "j2"},
            {"userId": "other-user", "journalId": "j3"},
        ]

        # With 70% threshold, 66% authored should be supporter mode
        result = detect_chat_mode(
            current_user_id="user-123",
            journals=journals,
            author_threshold=0.7,
        )

        assert result.mode == ChatMode.SUPPORTER

        # With 60% threshold, 66% authored should be author mode
        result = detect_chat_mode(
            current_user_id="user-123",
            journals=journals,
            author_threshold=0.6,
        )

        assert result.mode == ChatMode.AUTHOR

    def test_journals_without_user_id_ignored(self):
        """Journals without userId are ignored in calculation."""
        journals = [
            {"userId": "user-123", "journalId": "j1"},
            {"journalId": "j2"},  # No userId
            {"userId": None, "journalId": "j3"},  # Null userId
        ]

        result = detect_chat_mode(
            current_user_id="user-123",
            journals=journals,
        )

        # Only 1 journal counted, all by current user
        assert result.mode == ChatMode.AUTHOR
        assert result.author_percentage == 1.0

    def test_threshold_constant_is_50_percent(self):
        """Verify default threshold constant is 50%."""
        assert AUTHOR_MODE_THRESHOLD == 0.5


class TestChatContext:
    """Tests for ChatContext model."""

    def test_chat_context_serialization(self):
        """ChatContext serializes correctly with aliases."""
        context = ChatContext(
            mode=ChatMode.SUPPORTER,
            primary_author_id="author-123",
            primary_author_name="Alex",
            author_percentage=0.25,
        )

        data = context.model_dump(by_alias=True)

        assert data["mode"] == "supporter"
        assert data["primaryAuthorId"] == "author-123"
        assert data["primaryAuthorName"] == "Alex"
        assert data["authorPercentage"] == 0.25

    def test_chat_context_from_dict(self):
        """ChatContext can be created from dict with aliases."""
        context = ChatContext(
            mode=ChatMode.AUTHOR,
            primary_author_id="user-123",
            author_percentage=1.0,
        )

        assert context.mode == ChatMode.AUTHOR
        assert context.primary_author_id == "user-123"

    def test_chat_context_optional_fields(self):
        """ChatContext handles optional fields correctly."""
        context = ChatContext(
            mode=ChatMode.AUTHOR,
            author_percentage=0.8,
        )

        assert context.primary_author_id is None
        assert context.primary_author_name is None


class TestGetModeDescription:
    """Tests for get_mode_description function."""

    def test_author_mode_description(self):
        """Author mode returns appropriate description."""
        desc = get_mode_description(ChatMode.AUTHOR)
        assert "Self-reflection" in desc
        assert "own journals" in desc

    def test_supporter_mode_description_with_name(self):
        """Supporter mode includes author name."""
        desc = get_mode_description(ChatMode.SUPPORTER, author_name="Alex")
        assert "Supporter" in desc
        assert "Alex" in desc

    def test_supporter_mode_description_without_name(self):
        """Supporter mode uses default when no name provided."""
        desc = get_mode_description(ChatMode.SUPPORTER)
        assert "Supporter" in desc
        assert "another user" in desc


class TestChatModeEnum:
    """Tests for ChatMode enum."""

    def test_chat_mode_values(self):
        """ChatMode has expected string values."""
        assert ChatMode.AUTHOR.value == "author"
        assert ChatMode.SUPPORTER.value == "supporter"

    def test_chat_mode_is_string_enum(self):
        """ChatMode values can be used as strings."""
        assert ChatMode.AUTHOR == "author"
        assert ChatMode.SUPPORTER == "supporter"
