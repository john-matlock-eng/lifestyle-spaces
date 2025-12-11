"""
Test that content_tiptap is properly saved and retrieved.
"""
import os

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("DYNAMODB_TABLE", "lifestyle-spaces-test")
os.environ.setdefault("AWS_REGION", "us-east-1")

import pytest
from unittest.mock import patch, MagicMock
from app.services.journal import JournalService
from app.models.journal import JournalCreate


@pytest.fixture
def mock_table():
    """Create a mock DynamoDB table."""
    with patch("app.services.journal.boto3.resource") as mock_resource:
        mock_table = MagicMock()
        mock_resource.return_value.Table.return_value = mock_table
        yield mock_table


@pytest.fixture
def journal_service(mock_table):
    """Create a JournalService instance with mocked table."""
    return JournalService()


@pytest.fixture
def mock_get_space():
    """Mock the _get_space method."""
    with patch("app.services.journal.JournalService._get_space") as mock:
        mock.return_value = {"id": "space-123", "name": "Test Space"}
        yield mock


@pytest.fixture
def mock_is_member():
    """Mock the _is_space_member method."""
    with patch("app.services.journal.JournalService._is_space_member") as mock:
        mock.return_value = True
        yield mock


@pytest.fixture
def mock_get_author():
    """Mock the _get_author_info method."""
    with patch("app.services.journal.JournalService._get_author_info") as mock:
        mock.return_value = {
            "user_id": "user-123",
            "username": "testuser",
            "display_name": "Test User",
        }
        yield mock


def test_content_tiptap_saved_and_retrieved(
    journal_service, mock_get_space, mock_is_member, mock_get_author
):
    """Test that content_tiptap is saved to DynamoDB and retrieved correctly."""

    # Sample TipTap content
    tiptap_content = {
        "raw_thoughts": {
            "type": "doc",
            "content": [
                {"type": "paragraph", "content": [{"type": "text", "text": "Test content"}]}
            ],
        }
    }

    # Create journal with content_tiptap
    journal_data = JournalCreate(
        space_id="space-123",
        title="Test Journal",
        content="Test content",
        content_tiptap=tiptap_content,
        tags=["test"],
        emotions=[],
    )

    # Mock table.put_item to capture what's being saved
    saved_items = []

    def capture_put_item(Item):
        saved_items.append(Item)

    journal_service.table.put_item.side_effect = capture_put_item

    # Create the journal
    result = journal_service.create_journal_entry(
        space_id="space-123", user_id="user-123", data=journal_data
    )

    # Verify content_tiptap is in the create response
    assert result["content_tiptap"] == tiptap_content

    # Verify content_tiptap was saved to DynamoDB
    journal_item = saved_items[0]  # First item is the journal (second is activity log)
    assert journal_item["content_tiptap"] == tiptap_content

    # Now test retrieval
    journal_id = result["journal_id"]

    # Mock table.get_item to return the saved journal
    journal_service.table.get_item.return_value = {"Item": journal_item}

    # Retrieve the journal
    retrieved = journal_service.get_journal_entry(
        space_id="space-123", journal_id=journal_id, user_id="user-123"
    )

    # Verify content_tiptap is in the retrieved journal
    assert retrieved["content_tiptap"] == tiptap_content
    assert retrieved["title"] == "Test Journal"


def test_content_tiptap_null_handling(
    journal_service, mock_get_space, mock_is_member, mock_get_author
):
    """Test that journals without content_tiptap work correctly."""

    # Create journal without content_tiptap
    journal_data = JournalCreate(
        space_id="space-123",
        title="Test Journal",
        content="Test content",
        content_tiptap=None,
        tags=[],
        emotions=[],
    )

    # Mock table operations
    saved_items = []

    def capture_put_item(Item):
        saved_items.append(Item)

    journal_service.table.put_item.side_effect = capture_put_item

    # Create the journal
    result = journal_service.create_journal_entry(
        space_id="space-123", user_id="user-123", data=journal_data
    )

    # Verify content_tiptap is None (not included in result when None)
    assert result.get("content_tiptap") is None

    # Verify content_tiptap was NOT added to DynamoDB item
    journal_item = saved_items[0]
    assert "content_tiptap" not in journal_item

    # Mock retrieval
    journal_service.table.get_item.return_value = {"Item": journal_item}

    # Retrieve the journal
    retrieved = journal_service.get_journal_entry(
        space_id="space-123", journal_id=result["journal_id"], user_id="user-123"
    )

    # Verify content_tiptap is None in retrieved journal
    assert retrieved["content_tiptap"] is None
