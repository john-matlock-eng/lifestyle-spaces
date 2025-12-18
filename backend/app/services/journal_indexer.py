"""
Journal Indexer Service

Handles indexing journal entries to the vector store for semantic search.
Provides space-isolated indexing with proper namespace management.
"""

import logging
import re
from typing import List, Optional, Dict, Any

from app.models.journal import JournalEntry
from app.services.vector_store import (
    VectorStore,
    VectorDocument,
    SearchResult,
    IndexResult,
    IndexStatus,
    get_vector_store,
)

logger = logging.getLogger(__name__)


def extract_plain_text(content: str) -> str:
    """
    Extract plain text from journal content with template metadata.

    Removes HTML comments, template markers, and markdown formatting
    to get clean searchable text.

    Args:
        content: Raw journal content with embedded template metadata.

    Returns:
        Clean plain text suitable for embedding.
    """
    if not content:
        return ""

    # Remove HTML comments (template metadata)
    text = re.sub(r"<!--[\s\S]*?-->", "", content)

    # Remove markdown headers
    text = re.sub(r"^#+\s*", "", text, flags=re.MULTILINE)

    # Remove markdown bold/italic
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"__([^_]+)__", r"\1", text)
    text = re.sub(r"_([^_]+)_", r"\1", text)

    # Remove markdown links but keep text
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)

    # Remove markdown code blocks
    text = re.sub(r"```[\s\S]*?```", "", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)

    # Remove bullet points and list markers
    text = re.sub(r"^[\s]*[-*+]\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"^[\s]*\d+\.\s*", "", text, flags=re.MULTILINE)

    # Normalize whitespace
    text = re.sub(r"\n\s*\n", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)

    return text.strip()


class JournalIndexer:
    """
    Service for indexing journals to vector store.

    Handles:
    - Converting journal entries to vector documents
    - Managing space-isolated namespaces
    - Batch indexing for backfill operations
    - Search with space isolation
    """

    def __init__(self, vector_store: Optional[VectorStore] = None):
        """
        Initialize the journal indexer.

        Args:
            vector_store: Vector store instance. If not provided, uses singleton.
        """
        self._store = vector_store

    @property
    def store(self) -> VectorStore:
        """Get the vector store instance."""
        if self._store is None:
            self._store = get_vector_store()
        return self._store

    def _journal_to_document(self, journal: JournalEntry) -> VectorDocument:
        """
        Convert a journal entry to a vector document.

        Args:
            journal: Journal entry to convert.

        Returns:
            VectorDocument ready for indexing.
        """
        # Extract clean text for embedding
        text = extract_plain_text(journal.content)

        # Add title to searchable text
        if journal.title:
            text = f"{journal.title}\n\n{text}"

        # Build metadata
        metadata = {
            "journal_id": journal.journal_id,
            "space_id": journal.space_id,
            "user_id": journal.user_id,
            "created_at": journal.created_at.isoformat(),
        }

        # Add optional fields
        if journal.template_id:
            metadata["template_id"] = journal.template_id
        if journal.framework_id:
            metadata["framework_id"] = journal.framework_id
        if journal.tags:
            metadata["tags"] = journal.tags
        if journal.emotions:
            metadata["emotions"] = journal.emotions

        # Get namespace for space isolation
        namespace = VectorStore.get_space_namespace(journal.space_id)

        return VectorDocument(
            id=journal.journal_id,
            text=text,
            metadata=metadata,
            namespace=namespace,
        )

    async def index_journal(self, journal: JournalEntry) -> IndexResult:
        """
        Index a single journal entry.

        Args:
            journal: Journal entry to index.

        Returns:
            IndexResult with status.
        """
        try:
            document = self._journal_to_document(journal)
            results = await self.store.upsert([document])

            if results and len(results) > 0:
                return results[0]

            return IndexResult(
                status=IndexStatus.FAILED,
                document_id=journal.journal_id,
                error="No result returned from upsert",
            )

        except Exception as e:
            logger.error(f"Failed to index journal {journal.journal_id}: {e}")
            return IndexResult(
                status=IndexStatus.FAILED,
                document_id=journal.journal_id,
                error=str(e),
            )

    async def index_journals(
        self, journals: List[JournalEntry]
    ) -> List[IndexResult]:
        """
        Index multiple journal entries.

        Args:
            journals: List of journal entries to index.

        Returns:
            List of IndexResult for each journal.
        """
        if not journals:
            return []

        try:
            documents = [self._journal_to_document(j) for j in journals]
            return await self.store.upsert(documents)

        except Exception as e:
            logger.error(f"Failed to batch index journals: {e}")
            return [
                IndexResult(
                    status=IndexStatus.FAILED,
                    document_id=j.journal_id,
                    error=str(e),
                )
                for j in journals
            ]

    async def delete_journal(self, journal_id: str, space_id: str) -> bool:
        """
        Delete a journal from the index.

        Args:
            journal_id: ID of the journal to delete.
            space_id: Space ID for namespace lookup.

        Returns:
            True if deletion was successful.
        """
        namespace = VectorStore.get_space_namespace(space_id)
        return await self.store.delete([journal_id], namespace)

    async def delete_space(self, space_id: str) -> bool:
        """
        Delete all journals for a space from the index.

        Called when a space is deleted.

        Args:
            space_id: Space ID to delete.

        Returns:
            True if deletion was successful.
        """
        namespace = VectorStore.get_space_namespace(space_id)
        return await self.store.delete_namespace(namespace)

    async def search(
        self,
        query: str,
        space_id: str,
        top_k: int = 10,
        template_id: Optional[str] = None,
        framework_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> List[SearchResult]:
        """
        Search journals within a space.

        Args:
            query: Search query text.
            space_id: Space to search within (required for isolation).
            top_k: Maximum number of results.
            template_id: Optional filter by template.
            framework_id: Optional filter by framework.
            user_id: Optional filter by user.

        Returns:
            List of search results with journal metadata.
        """
        namespace = VectorStore.get_space_namespace(space_id)

        # Build filter
        filter_dict: Optional[Dict[str, Any]] = None
        if template_id or framework_id or user_id:
            filter_dict = {}
            if template_id:
                filter_dict["template_id"] = {"$eq": template_id}
            if framework_id:
                filter_dict["framework_id"] = {"$eq": framework_id}
            if user_id:
                filter_dict["user_id"] = {"$eq": user_id}

        return await self.store.search(
            query=query,
            namespace=namespace,
            top_k=top_k,
            filter=filter_dict,
        )


# Singleton instance
_indexer_instance: Optional[JournalIndexer] = None


def get_journal_indexer() -> JournalIndexer:
    """
    Get the singleton journal indexer instance.

    Returns:
        JournalIndexer instance.
    """
    global _indexer_instance
    if _indexer_instance is None:
        _indexer_instance = JournalIndexer()
    return _indexer_instance


def reset_journal_indexer() -> None:
    """Reset the singleton instance. Useful for testing."""
    global _indexer_instance
    _indexer_instance = None
