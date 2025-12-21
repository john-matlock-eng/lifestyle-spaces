"""
Vector Store Base Classes

Abstract interface for vector store implementations.
Supports namespace isolation for multi-tenant security.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum


class IndexStatus(Enum):
    """Status of vector indexing operation."""

    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class VectorDocument:
    """
    Document to be indexed in the vector store.

    Attributes:
        id: Unique identifier for the document.
        text: Text content to be embedded.
        metadata: Additional metadata to store with the vector.
        namespace: Namespace for multi-tenant isolation (e.g., space_<spaceId>).
    """

    id: str
    text: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    namespace: Optional[str] = None


@dataclass
class SearchResult:
    """
    Result from a vector similarity search.

    Attributes:
        id: Document identifier.
        score: Similarity score (higher is more similar).
        metadata: Document metadata.
    """

    id: str
    score: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class IndexResult:
    """
    Result from an indexing operation.

    Attributes:
        status: Status of the operation.
        document_id: ID of the indexed document.
        error: Error message if failed.
    """

    status: IndexStatus
    document_id: str
    error: Optional[str] = None


class VectorStore(ABC):
    """
    Abstract base class for vector store implementations.

    All implementations must support namespace isolation for
    multi-tenant security. Each space gets its own namespace.
    """

    @abstractmethod
    async def upsert(self, documents: List[VectorDocument]) -> List[IndexResult]:
        """
        Insert or update documents in the vector store.

        Args:
            documents: List of documents to upsert.

        Returns:
            List of index results for each document.
        """
        pass

    @abstractmethod
    async def search(
        self,
        query: str,
        namespace: str,
        top_k: int = 10,
        filter: Optional[Dict[str, Any]] = None,
    ) -> List[SearchResult]:
        """
        Search for similar documents.

        Args:
            query: Search query text.
            namespace: Namespace to search within (required for isolation).
            top_k: Maximum number of results to return.
            filter: Optional metadata filter.

        Returns:
            List of search results ordered by similarity.
        """
        pass

    @abstractmethod
    async def delete(self, ids: List[str], namespace: str) -> bool:
        """
        Delete documents by ID.

        Args:
            ids: List of document IDs to delete.
            namespace: Namespace containing the documents.

        Returns:
            True if deletion was successful.
        """
        pass

    @abstractmethod
    async def delete_namespace(self, namespace: str) -> bool:
        """
        Delete all documents in a namespace.

        Used when a space is deleted.

        Args:
            namespace: Namespace to delete.

        Returns:
            True if deletion was successful.
        """
        pass

    @staticmethod
    def get_space_namespace(space_id: str) -> str:
        """
        Get the namespace for a space.

        Args:
            space_id: The space ID.

        Returns:
            Namespace string in format 'space_{spaceId}'.
        """
        return f"space_{space_id}"
