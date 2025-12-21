"""
Vector Store Module

Provides vector database functionality for semantic search.
Currently uses Pinecone with integrated embeddings.
"""

from .base import (
    VectorStore,
    VectorDocument,
    SearchResult,
    IndexResult,
    IndexStatus,
)
from .pinecone_store import (
    PineconeStore,
    get_vector_store,
    reset_vector_store,
)

__all__ = [
    # Base classes
    "VectorStore",
    "VectorDocument",
    "SearchResult",
    "IndexResult",
    "IndexStatus",
    # Pinecone implementation
    "PineconeStore",
    "get_vector_store",
    "reset_vector_store",
]
