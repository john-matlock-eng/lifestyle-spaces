"""
Tests for Vector Store and Journal Indexer.

These tests use mocks to avoid requiring actual Pinecone API access.
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime, timezone

from app.services.vector_store.base import (
    VectorStore,
    VectorDocument,
    SearchResult,
    IndexResult,
    IndexStatus,
)
from app.services.vector_store.pinecone_store import (
    PineconeStore,
    get_vector_store,
    reset_vector_store,
)
from app.services.journal_indexer import (
    JournalIndexer,
    extract_plain_text,
    get_journal_indexer,
    reset_journal_indexer,
)
from app.models.journal import JournalEntry


class TestVectorStoreBase:
    """Tests for base vector store classes."""

    def test_vector_document_creation(self):
        """Test VectorDocument dataclass."""
        doc = VectorDocument(
            id="test-123",
            text="Test content",
            metadata={"key": "value"},
            namespace="space_abc",
        )
        assert doc.id == "test-123"
        assert doc.text == "Test content"
        assert doc.metadata == {"key": "value"}
        assert doc.namespace == "space_abc"

    def test_vector_document_defaults(self):
        """Test VectorDocument default values."""
        doc = VectorDocument(id="test", text="content")
        assert doc.metadata == {}
        assert doc.namespace is None

    def test_search_result_creation(self):
        """Test SearchResult dataclass."""
        result = SearchResult(
            id="result-123",
            score=0.95,
            metadata={"journal_id": "j123"},
        )
        assert result.id == "result-123"
        assert result.score == 0.95
        assert result.metadata == {"journal_id": "j123"}

    def test_index_result_success(self):
        """Test IndexResult for successful indexing."""
        result = IndexResult(
            status=IndexStatus.SUCCESS,
            document_id="doc-123",
        )
        assert result.status == IndexStatus.SUCCESS
        assert result.document_id == "doc-123"
        assert result.error is None

    def test_index_result_failed(self):
        """Test IndexResult for failed indexing."""
        result = IndexResult(
            status=IndexStatus.FAILED,
            document_id="doc-123",
            error="Connection failed",
        )
        assert result.status == IndexStatus.FAILED
        assert result.error == "Connection failed"

    def test_get_space_namespace(self):
        """Test namespace generation for spaces."""
        namespace = VectorStore.get_space_namespace("abc-123")
        assert namespace == "space_abc-123"


class TestExtractPlainText:
    """Tests for text extraction utility."""

    def test_extract_removes_html_comments(self):
        """Test that HTML comments are removed."""
        content = "<!-- template metadata -->\nActual content"
        result = extract_plain_text(content)
        assert "template metadata" not in result
        assert "Actual content" in result

    def test_extract_removes_markdown_headers(self):
        """Test that markdown headers are stripped."""
        content = "# Header\n## Subheader\nContent"
        result = extract_plain_text(content)
        assert result.startswith("Header")
        assert "#" not in result

    def test_extract_removes_markdown_formatting(self):
        """Test that bold/italic formatting is removed."""
        content = "This is **bold** and *italic* text"
        result = extract_plain_text(content)
        assert "bold" in result
        assert "italic" in result
        assert "*" not in result

    def test_extract_removes_links(self):
        """Test that markdown links are converted to plain text."""
        content = "Check [this link](https://example.com) out"
        result = extract_plain_text(content)
        assert "this link" in result
        assert "https://example.com" not in result

    def test_extract_removes_code_blocks(self):
        """Test that code blocks are removed."""
        content = "Before\n```python\ndef foo(): pass\n```\nAfter"
        result = extract_plain_text(content)
        assert "Before" in result
        assert "After" in result
        assert "def foo" not in result

    def test_extract_removes_list_markers(self):
        """Test that list markers are removed."""
        content = "- Item 1\n* Item 2\n1. Item 3"
        result = extract_plain_text(content)
        assert "Item 1" in result
        assert "Item 2" in result
        assert "Item 3" in result
        assert "-" not in result

    def test_extract_empty_content(self):
        """Test handling of empty content."""
        assert extract_plain_text("") == ""
        assert extract_plain_text(None) == ""


class TestPineconeStore:
    """Tests for Pinecone vector store implementation."""

    @pytest.fixture
    def mock_pinecone(self):
        """Create a mock Pinecone client."""
        with patch("app.services.vector_store.pinecone_store.Pinecone") as mock:
            mock_index = MagicMock()
            mock.return_value.Index.return_value = mock_index
            yield mock, mock_index

    @pytest.fixture
    def store_with_key(self, mock_pinecone):
        """Create a PineconeStore with a mock API key."""
        reset_vector_store()
        store = PineconeStore(api_key="test-api-key")
        return store, mock_pinecone[1]

    def test_store_initialization(self):
        """Test store initialization with API key."""
        reset_vector_store()
        store = PineconeStore(api_key="test-key")
        assert store._api_key == "test-key"

    @pytest.mark.asyncio
    async def test_upsert_documents(self, store_with_key):
        """Test upserting documents."""
        store, mock_index = store_with_key

        documents = [
            VectorDocument(
                id="doc-1",
                text="Test content 1",
                metadata={"journal_id": "j1"},
                namespace="space_abc",
            ),
            VectorDocument(
                id="doc-2",
                text="Test content 2",
                metadata={"journal_id": "j2"},
                namespace="space_abc",
            ),
        ]

        results = await store.upsert(documents)

        assert len(results) == 2
        assert all(r.status == IndexStatus.SUCCESS for r in results)
        mock_index.upsert_records.assert_called_once()

    @pytest.mark.asyncio
    async def test_upsert_empty_list(self, store_with_key):
        """Test upserting empty list."""
        store, mock_index = store_with_key
        results = await store.upsert([])
        assert results == []
        mock_index.upsert_records.assert_not_called()

    @pytest.mark.asyncio
    async def test_search(self, store_with_key):
        """Test searching documents."""
        store, mock_index = store_with_key

        # Mock search response
        mock_response = MagicMock()
        mock_response.result.hits = [
            {"_id": "doc-1", "_score": 0.95, "fields": {"journal_id": "j1"}},
            {"_id": "doc-2", "_score": 0.85, "fields": {"journal_id": "j2"}},
        ]
        mock_index.search_records.return_value = mock_response

        results = await store.search(
            query="test query",
            namespace="space_abc",
            top_k=10,
        )

        assert len(results) == 2
        assert results[0].id == "doc-1"
        assert results[0].score == 0.95
        mock_index.search_records.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete(self, store_with_key):
        """Test deleting documents."""
        store, mock_index = store_with_key

        success = await store.delete(["doc-1", "doc-2"], "space_abc")

        assert success is True
        mock_index.delete.assert_called_once_with(
            ids=["doc-1", "doc-2"],
            namespace="space_abc",
        )

    @pytest.mark.asyncio
    async def test_delete_empty_list(self, store_with_key):
        """Test deleting empty list."""
        store, mock_index = store_with_key
        success = await store.delete([], "space_abc")
        assert success is True
        mock_index.delete.assert_not_called()

    @pytest.mark.asyncio
    async def test_delete_namespace(self, store_with_key):
        """Test deleting entire namespace."""
        store, mock_index = store_with_key

        success = await store.delete_namespace("space_abc")

        assert success is True
        mock_index.delete.assert_called_once_with(
            delete_all=True,
            namespace="space_abc",
        )


class TestJournalIndexer:
    """Tests for journal indexing service."""

    @pytest.fixture
    def mock_store(self):
        """Create a mock vector store."""
        store = Mock(spec=VectorStore)
        store.upsert = AsyncMock(return_value=[
            IndexResult(status=IndexStatus.SUCCESS, document_id="j123")
        ])
        store.search = AsyncMock(return_value=[
            SearchResult(id="j123", score=0.9, metadata={"journal_id": "j123"})
        ])
        store.delete = AsyncMock(return_value=True)
        store.delete_namespace = AsyncMock(return_value=True)
        return store

    @pytest.fixture
    def indexer(self, mock_store):
        """Create a JournalIndexer with mock store."""
        reset_journal_indexer()
        return JournalIndexer(vector_store=mock_store)

    @pytest.fixture
    def sample_journal(self):
        """Create a sample journal entry."""
        return JournalEntry(
            journal_id="j123",
            space_id="space-abc",
            user_id="user-123",
            title="Test Journal",
            content="This is test content for indexing.",
            template_id="daily-reflection",
            framework_id="charter-and-course",
            tags=["test", "sample"],
            emotions=["happy"],
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            word_count=6,
        )

    @pytest.mark.asyncio
    async def test_index_journal(self, indexer, mock_store, sample_journal):
        """Test indexing a single journal."""
        result = await indexer.index_journal(sample_journal)

        assert result.status == IndexStatus.SUCCESS
        assert result.document_id == "j123"
        mock_store.upsert.assert_called_once()

        # Verify the document that was upserted
        call_args = mock_store.upsert.call_args[0][0]
        assert len(call_args) == 1
        doc = call_args[0]
        assert doc.id == "j123"
        assert doc.namespace == "space_space-abc"
        assert "Test Journal" in doc.text
        assert doc.metadata["journal_id"] == "j123"

    @pytest.mark.asyncio
    async def test_index_multiple_journals(self, indexer, mock_store, sample_journal):
        """Test batch indexing journals."""
        journals = [sample_journal]
        mock_store.upsert = AsyncMock(return_value=[
            IndexResult(status=IndexStatus.SUCCESS, document_id="j123")
        ])

        results = await indexer.index_journals(journals)

        assert len(results) == 1
        assert results[0].status == IndexStatus.SUCCESS

    @pytest.mark.asyncio
    async def test_delete_journal(self, indexer, mock_store):
        """Test deleting a journal from index."""
        success = await indexer.delete_journal("j123", "space-abc")

        assert success is True
        mock_store.delete.assert_called_once_with(
            ["j123"],
            "space_space-abc",
        )

    @pytest.mark.asyncio
    async def test_delete_space(self, indexer, mock_store):
        """Test deleting all journals for a space."""
        success = await indexer.delete_space("space-abc")

        assert success is True
        mock_store.delete_namespace.assert_called_once_with("space_space-abc")

    @pytest.mark.asyncio
    async def test_search(self, indexer, mock_store):
        """Test searching journals."""
        results = await indexer.search(
            query="test query",
            space_id="space-abc",
            top_k=10,
        )

        assert len(results) == 1
        assert results[0].id == "j123"
        mock_store.search.assert_called_once()

    @pytest.mark.asyncio
    async def test_search_with_filters(self, indexer, mock_store):
        """Test searching with filters."""
        await indexer.search(
            query="test",
            space_id="space-abc",
            template_id="daily-reflection",
            framework_id="charter",
            user_id="user-123",
        )

        call_kwargs = mock_store.search.call_args[1]
        assert call_kwargs["filter"] is not None
        assert "template_id" in call_kwargs["filter"]
        assert "framework_id" in call_kwargs["filter"]
        assert "user_id" in call_kwargs["filter"]


class TestSecretsHelper:
    """Tests for AWS Secrets Manager helper."""

    def test_get_secret_from_env(self):
        """Test getting secret from environment variable."""
        import os
        from app.core.secrets import get_secret, clear_secret_cache

        clear_secret_cache()

        # Set environment variable
        os.environ["PINECONE_API_KEY"] = "test-key-from-env"

        try:
            secret = get_secret("lifestyle-spaces/pinecone-api-key")
            assert secret == "test-key-from-env"
        finally:
            del os.environ["PINECONE_API_KEY"]
            clear_secret_cache()

    def test_clear_cache(self):
        """Test cache clearing."""
        from app.core.secrets import clear_secret_cache

        # Should not raise
        clear_secret_cache()
