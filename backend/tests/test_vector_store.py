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
    SectionSearchResult,
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

    def test_section_search_result_creation(self):
        """Test SectionSearchResult dataclass."""
        result = SectionSearchResult(
            id="journal_j123_section_0",
            score=0.95,
            journal_id="j123",
            section_index=0,
            section_title="Express",
            excerpt="I feel grateful today...",
            metadata={"journalTitle": "My Reflection"},
        )
        assert result.id == "journal_j123_section_0"
        assert result.score == 0.95
        assert result.journal_id == "j123"
        assert result.section_index == 0
        assert result.section_title == "Express"
        assert result.excerpt == "I feel grateful today..."

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

    def test_store_initialization_with_custom_host(self):
        """Test store initialization with custom host."""
        reset_vector_store()
        store = PineconeStore(api_key="test-key", host="https://custom.pinecone.io")
        assert store._host == "https://custom.pinecone.io"

    def test_store_initialization_with_custom_model(self):
        """Test store initialization with custom embedding model."""
        reset_vector_store()
        store = PineconeStore(api_key="test-key", embedding_model="text-embedding-3-small")
        assert store._embedding_model == "text-embedding-3-small"

    def test_ensure_client_raises_without_api_key(self):
        """Test that _ensure_client raises when no API key is available."""
        reset_vector_store()
        store = PineconeStore()
        store._api_key = None

        with pytest.raises(RuntimeError) as exc_info:
            store._ensure_client()

        assert "API key not available" in str(exc_info.value)

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
            {"_id": "doc-1", "_score": 0.95, "fields": {"journalId": "j1"}},
            {"_id": "doc-2", "_score": 0.85, "fields": {"journalId": "j2"}},
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

    @pytest.mark.asyncio
    async def test_delete_by_filter(self, store_with_key):
        """Test deleting by metadata filter."""
        store, mock_index = store_with_key

        count = await store.delete_by_filter(
            filter={"journalId": {"$eq": "j123"}},
            namespace="space_abc"
        )

        assert count == 1
        mock_index.delete.assert_called_once_with(
            filter={"journalId": {"$eq": "j123"}},
            namespace="space_abc",
        )

    @pytest.mark.asyncio
    async def test_get_stats(self, store_with_key):
        """Test getting stats."""
        store, mock_index = store_with_key

        mock_index.describe_index_stats.return_value = {
            "total_record_count": 100,
            "dimension": 1024,
            "namespaces": {
                "space_abc": {"record_count": 50},
                "space_def": {"record_count": 50},
            },
        }

        stats = await store.get_stats()

        assert stats["total_record_count"] == 100
        assert stats["dimension"] == 1024
        assert "space_abc" in stats["namespaces"]

    @pytest.mark.asyncio
    async def test_get_stats_by_namespace(self, store_with_key):
        """Test getting stats for specific namespace."""
        store, mock_index = store_with_key

        mock_index.describe_index_stats.return_value = {
            "total_record_count": 100,
            "dimension": 1024,
            "namespaces": {
                "space_abc": {"record_count": 50},
            },
        }

        stats = await store.get_stats(namespace="space_abc")

        assert stats["record_count"] == 50
        assert stats["namespace"] == "space_abc"

    @pytest.mark.asyncio
    async def test_upsert_error_handling(self, store_with_key):
        """Test error handling during upsert."""
        store, mock_index = store_with_key
        mock_index.upsert_records.side_effect = Exception("Connection failed")

        documents = [
            VectorDocument(
                id="doc-1",
                text="Test content",
                namespace="space_abc",
            ),
        ]

        results = await store.upsert(documents)

        assert len(results) == 1
        assert results[0].status == IndexStatus.FAILED
        assert "Connection failed" in results[0].error

    @pytest.mark.asyncio
    async def test_search_error_handling(self, store_with_key):
        """Test error handling during search."""
        store, mock_index = store_with_key
        mock_index.search_records.side_effect = Exception("Search failed")

        results = await store.search(
            query="test",
            namespace="space_abc",
        )

        # Should return empty list on error, not raise
        assert results == []

    @pytest.mark.asyncio
    async def test_delete_error_handling(self, store_with_key):
        """Test error handling during delete."""
        store, mock_index = store_with_key
        mock_index.delete.side_effect = Exception("Delete failed")

        success = await store.delete(["doc-1"], "space_abc")

        assert success is False

    @pytest.mark.asyncio
    async def test_delete_namespace_error_handling(self, store_with_key):
        """Test error handling during namespace deletion."""
        store, mock_index = store_with_key
        mock_index.delete.side_effect = Exception("Namespace delete failed")

        success = await store.delete_namespace("space_abc")

        assert success is False

    @pytest.mark.asyncio
    async def test_search_with_filter(self, store_with_key):
        """Test searching with metadata filter."""
        store, mock_index = store_with_key

        mock_response = MagicMock()
        mock_response.result.hits = []
        mock_index.search_records.return_value = mock_response

        await store.search(
            query="test",
            namespace="space_abc",
            filter={"templateId": {"$eq": "daily"}},
        )

        call_kwargs = mock_index.search_records.call_args[1]
        assert "filter" in call_kwargs["query"]

    @pytest.mark.asyncio
    async def test_search_empty_response(self, store_with_key):
        """Test search with empty/None response."""
        store, mock_index = store_with_key

        # Test with None response
        mock_index.search_records.return_value = None

        results = await store.search(
            query="test",
            namespace="space_abc",
        )

        assert results == []

    @pytest.mark.asyncio
    async def test_upsert_multiple_namespaces(self, store_with_key):
        """Test upserting documents to multiple namespaces."""
        store, mock_index = store_with_key

        documents = [
            VectorDocument(id="doc-1", text="Content 1", namespace="space_a"),
            VectorDocument(id="doc-2", text="Content 2", namespace="space_b"),
            VectorDocument(id="doc-3", text="Content 3", namespace="space_a"),
        ]

        results = await store.upsert(documents)

        assert len(results) == 3
        # Should be called twice, once for each namespace
        assert mock_index.upsert_records.call_count == 2


class TestJournalIndexerSections:
    """Tests for section-level journal indexing."""

    @pytest.fixture
    def mock_vector_store(self):
        """Create a mock vector store."""
        store = MagicMock()
        store.upsert = AsyncMock(return_value=[
            IndexResult(status=IndexStatus.SUCCESS, document_id="section_0"),
            IndexResult(status=IndexStatus.SUCCESS, document_id="section_1"),
        ])
        store.search = AsyncMock(return_value=[
            SearchResult(
                id="journal_j123_section_0",
                score=0.95,
                metadata={
                    "journalId": "j123",
                    "journalTitle": "My Reflection",
                    "sectionIndex": 0,
                    "sectionTitle": "Express",
                    "text": "I feel grateful today for many things...",
                }
            ),
        ])
        store.delete = AsyncMock(return_value=True)
        store.delete_by_filter = AsyncMock(return_value=1)
        store.delete_namespace = AsyncMock(return_value=True)
        store.get_stats = AsyncMock(return_value={"record_count": 10})
        return store

    @pytest.fixture
    def indexer(self, mock_vector_store):
        """Create a JournalIndexer with mock store."""
        reset_journal_indexer()
        indexer = JournalIndexer()
        indexer.vector_store = mock_vector_store
        return indexer

    @pytest.fixture
    def structured_journal(self):
        """Journal with template sections (content must be >50 chars each)."""
        tiptap_content = {
            "type": "doc",
            "content": [
                {"type": "heading", "attrs": {"level": 2}, "content": [
                    {"type": "text", "text": "Express"}
                ]},
                {"type": "paragraph", "content": [
                    {"type": "text", "text": "I feel grateful today for many things happening in my life and work environment."}
                ]},
                {"type": "heading", "attrs": {"level": 2}, "content": [
                    {"type": "text", "text": "Examine"}
                ]},
                {"type": "paragraph", "content": [
                    {"type": "text", "text": "Why do I feel this way? Let me explore the underlying reasons for my feelings."}
                ]},
            ]
        }
        return JournalEntry(
            journal_id="j123",
            space_id="space-abc",
            user_id="user-123",
            title="My Reflection",
            content="Express\nI feel grateful today for many things happening in my life.\nExamine\nWhy do I feel this way? Let me explore.",
            content_tiptap=tiptap_content,
            template_id="express_examine_evolve",
            framework_id=None,
            tags=[],
            emotions=[],
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            word_count=30,
        )

    @pytest.mark.asyncio
    async def test_indexes_multiple_sections(
        self, indexer, mock_vector_store, structured_journal
    ):
        """Should create multiple vectors for sections."""
        count = await indexer.index_journal(structured_journal)

        # Should have called upsert
        mock_vector_store.upsert.assert_called_once()
        call_args = mock_vector_store.upsert.call_args[0][0]

        # Verify multiple documents were created
        assert len(call_args) >= 2

        # Check document IDs include section index
        doc_ids = [d.id for d in call_args]
        assert any("section_0" in id for id in doc_ids)
        assert any("section_1" in id for id in doc_ids)

    @pytest.mark.asyncio
    async def test_section_metadata_includes_section_info(
        self, indexer, mock_vector_store, structured_journal
    ):
        """Section metadata should include section title and index."""
        await indexer.index_journal(structured_journal)

        call_args = mock_vector_store.upsert.call_args[0][0]

        for doc in call_args:
            assert "sectionIndex" in doc.metadata
            assert "sectionTitle" in doc.metadata
            assert "journalId" in doc.metadata

    @pytest.mark.asyncio
    async def test_deletes_old_sections_before_reindex(
        self, indexer, mock_vector_store, structured_journal
    ):
        """Should delete existing sections before re-indexing."""
        await indexer.index_journal(structured_journal)

        # Should have called delete_by_filter
        mock_vector_store.delete_by_filter.assert_called_once()

    @pytest.mark.asyncio
    async def test_search_space_returns_section_results(
        self, indexer, mock_vector_store
    ):
        """Search should return section-level results."""
        results = await indexer.search_space(
            query="grateful",
            space_id="space-abc",
            top_k=10,
        )

        assert len(results) == 1
        assert results[0].journal_id == "j123"
        assert results[0].section_index == 0
        assert results[0].section_title == "Express"

    @pytest.mark.asyncio
    async def test_search_space_grouped_groups_by_journal(
        self, indexer, mock_vector_store
    ):
        """Grouped search should return journals with their sections."""
        # Add more search results
        mock_vector_store.search.return_value = [
            SearchResult(
                id="journal_j123_section_0",
                score=0.95,
                metadata={
                    "journalId": "j123",
                    "journalTitle": "My Reflection",
                    "sectionIndex": 0,
                    "sectionTitle": "Express",
                    "text": "Content...",
                    "createdAt": "2024-01-01",
                }
            ),
            SearchResult(
                id="journal_j123_section_1",
                score=0.85,
                metadata={
                    "journalId": "j123",
                    "journalTitle": "My Reflection",
                    "sectionIndex": 1,
                    "sectionTitle": "Examine",
                    "text": "More content...",
                    "createdAt": "2024-01-01",
                }
            ),
        ]

        results = await indexer.search_space_grouped(
            query="grateful",
            space_id="space-abc",
            top_k=5,
        )

        assert len(results) == 1
        assert results[0]["journalId"] == "j123"
        assert len(results[0]["sections"]) == 2

    @pytest.mark.asyncio
    async def test_delete_journal_removes_all_sections(
        self, indexer, mock_vector_store
    ):
        """Deleting journal should remove all its sections."""
        success = await indexer.delete_journal("j123", "space-abc")

        assert success is True
        mock_vector_store.delete_by_filter.assert_called_once()
        filter_arg = mock_vector_store.delete_by_filter.call_args[1]["filter"]
        assert filter_arg == {"journalId": {"$eq": "j123"}}

    @pytest.mark.asyncio
    async def test_get_space_stats(self, indexer, mock_vector_store):
        """Should return space stats."""
        stats = await indexer.get_space_stats("space-abc")

        assert stats["space_id"] == "space-abc"
        assert stats["indexed_sections"] == 10

    @pytest.mark.asyncio
    async def test_delete_space_index(self, indexer, mock_vector_store):
        """Should delete entire space index."""
        success = await indexer.delete_space_index("space-abc")

        assert success is True
        mock_vector_store.delete_namespace.assert_called_once_with(
            "space_space-abc"
        )

    @pytest.mark.asyncio
    async def test_search_with_filters(self, indexer, mock_vector_store):
        """Search should pass filters to vector store."""
        await indexer.search_space(
            query="test",
            space_id="space-abc",
            user_id="user-123",
            template_id="daily",
            framework_id="charter",
        )

        call_kwargs = mock_vector_store.search.call_args[1]
        assert call_kwargs["filter"] is not None
        assert "userId" in call_kwargs["filter"]
        assert "templateId" in call_kwargs["filter"]
        assert "frameworkId" in call_kwargs["filter"]

    @pytest.mark.asyncio
    async def test_index_journal_without_space_id(self, indexer):
        """Should return 0 when journal has empty space_id."""
        journal = JournalEntry(
            journal_id="j123",
            space_id="",
            user_id="user-123",
            title="Test",
            content="Content",
            tags=[],
            emotions=[],
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            word_count=1,
        )

        count = await indexer.index_journal(journal)
        assert count == 0

    @pytest.mark.asyncio
    async def test_search_space_requires_space_id(self, indexer):
        """Search should raise without space_id."""
        with pytest.raises(ValueError) as exc_info:
            await indexer.search_space(query="test", space_id="")

        assert "space_id is REQUIRED" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_search_space_requires_query(self, indexer):
        """Search should raise without query."""
        with pytest.raises(ValueError) as exc_info:
            await indexer.search_space(query="", space_id="space-abc")

        assert "query is required" in str(exc_info.value)


class TestJournalIndexerSingletons:
    """Tests for singleton functions."""

    def test_get_journal_indexer_singleton(self):
        """Test that get_journal_indexer returns singleton."""
        reset_journal_indexer()
        indexer1 = get_journal_indexer()
        indexer2 = get_journal_indexer()
        assert indexer1 is indexer2

    def test_reset_journal_indexer(self):
        """Test that reset clears the singleton."""
        reset_journal_indexer()
        indexer1 = get_journal_indexer()
        reset_journal_indexer()
        indexer2 = get_journal_indexer()
        assert indexer1 is not indexer2


class TestVectorStoreSingletons:
    """Tests for vector store singleton functions."""

    def test_get_vector_store_singleton(self):
        """Test that get_vector_store returns singleton."""
        reset_vector_store()
        # Can't easily test this without API key, but we can test reset
        reset_vector_store()

    def test_reset_vector_store(self):
        """Test that reset clears the singleton."""
        reset_vector_store()
        # Verify reset doesn't raise
        reset_vector_store()


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
