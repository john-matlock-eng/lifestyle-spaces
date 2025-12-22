"""
Pinecone Vector Store Implementation

Uses Pinecone's integrated embeddings (llama-text-embed-v2) for
semantic search of journal entries.
"""

import logging
from typing import List, Optional, Dict, Any

from pinecone import Pinecone

from app.core.config import get_settings
from app.core.secrets import get_secret, SecretsManagerError
from .base import (
    VectorStore,
    VectorDocument,
    SearchResult,
    IndexResult,
    IndexStatus,
)

logger = logging.getLogger(__name__)


class PineconeStore(VectorStore):
    """
    Pinecone implementation of vector store.

    Uses integrated embeddings to avoid managing a separate embedding service.
    Supports namespace isolation for multi-tenant security.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        host: Optional[str] = None,
        embedding_model: Optional[str] = None,
    ):
        """
        Initialize Pinecone store.

        Args:
            api_key: Pinecone API key. If not provided, fetched from Secrets Manager.
            host: Pinecone index host URL. If not provided, uses config.
            embedding_model: Embedding model to use. If not provided, uses config.
        """
        settings = get_settings()

        # Get API key from parameter, env, or Secrets Manager
        if api_key:
            self._api_key = api_key
        else:
            try:
                self._api_key = get_secret(settings.pinecone_secret_name)
            except SecretsManagerError as e:
                logger.warning(f"Could not get Pinecone API key: {e}")
                self._api_key = None

        self._host = host or settings.pinecone_host
        self._embedding_model = embedding_model or settings.pinecone_embedding_model
        self._client: Optional[Pinecone] = None
        self._index = None

    def _ensure_client(self) -> None:
        """Initialize Pinecone client and index if not already done."""
        if self._client is None:
            if not self._api_key:
                raise RuntimeError(
                    "Pinecone API key not available. "
                    "Set PINECONE_API_KEY environment variable or configure Secrets Manager."
                )
            self._client = Pinecone(api_key=self._api_key)

        if self._index is None:
            self._index = self._client.Index(host=self._host)

    async def upsert(self, documents: List[VectorDocument]) -> List[IndexResult]:
        """
        Insert or update documents using integrated embeddings.

        Documents are grouped by namespace for efficient batch operations.
        """
        if not documents:
            return []

        self._ensure_client()
        results = []

        # Group documents by namespace
        docs_by_namespace: Dict[str, List[VectorDocument]] = {}
        for doc in documents:
            namespace = doc.namespace or "default"
            if namespace not in docs_by_namespace:
                docs_by_namespace[namespace] = []
            docs_by_namespace[namespace].append(doc)

        # Process each namespace
        for namespace, ns_docs in docs_by_namespace.items():
            try:
                # Prepare records for upsert with integrated embeddings
                records = []
                for doc in ns_docs:
                    record = {
                        "_id": doc.id,
                        "text": doc.text,
                        **doc.metadata,
                    }
                    records.append(record)

                # Use upsert_records for integrated embeddings
                self._index.upsert_records(
                    namespace=namespace,
                    records=records,
                )

                # Mark all as successful
                for doc in ns_docs:
                    results.append(
                        IndexResult(
                            status=IndexStatus.SUCCESS,
                            document_id=doc.id,
                        )
                    )

                logger.info(
                    f"Upserted {len(ns_docs)} documents to namespace '{namespace}'"
                )

            except Exception as e:
                logger.error(f"Failed to upsert documents to '{namespace}': {e}")
                for doc in ns_docs:
                    results.append(
                        IndexResult(
                            status=IndexStatus.FAILED,
                            document_id=doc.id,
                            error=str(e),
                        )
                    )

        return results

    async def search(
        self,
        query: str,
        namespace: str,
        top_k: int = 10,
        filter: Optional[Dict[str, Any]] = None,
    ) -> List[SearchResult]:
        """
        Search for similar documents using integrated embeddings.

        Args:
            query: Search query text.
            namespace: Namespace to search within (required).
            top_k: Maximum number of results.
            filter: Optional metadata filter.

        Returns:
            List of search results ordered by similarity.
        """
        self._ensure_client()

        try:
            # Use search_records for integrated embeddings
            # Include section-level fields for granular retrieval
            search_params = {
                "namespace": namespace,
                "query": {"top_k": top_k, "inputs": {"text": query}},
                "fields": [
                    "text",
                    "journalId",
                    "journalTitle",
                    "sectionIndex",
                    "sectionTitle",
                    "sectionType",
                    "spaceId",
                    "userId",
                    "templateId",
                    "frameworkId",
                    "createdAt",
                    "tags",
                ],
            }

            if filter:
                search_params["query"]["filter"] = filter

            response = self._index.search_records(**search_params)
            logger.debug(f"Pinecone search response: {response}")

            results = []
            if response and hasattr(response, "result") and response.result:
                for hit in response.result.hits:
                    results.append(
                        SearchResult(
                            id=hit["_id"],
                            score=hit.get("_score", 0.0),
                            metadata=hit.get("fields", {}),
                        )
                    )

            logger.debug(
                f"Search in '{namespace}' returned {len(results)} results"
            )
            return results

        except Exception as e:
            logger.error(f"Search failed in namespace '{namespace}': {e}")
            return []

    async def delete(self, ids: List[str], namespace: str) -> bool:
        """
        Delete documents by ID.

        Args:
            ids: List of document IDs to delete.
            namespace: Namespace containing the documents.

        Returns:
            True if deletion was successful.
        """
        if not ids:
            return True

        self._ensure_client()

        try:
            self._index.delete(ids=ids, namespace=namespace)
            logger.info(
                f"Deleted {len(ids)} documents from namespace '{namespace}'"
            )
            return True

        except Exception as e:
            logger.error(f"Failed to delete from '{namespace}': {e}")
            return False

    async def delete_namespace(self, namespace: str) -> bool:
        """
        Delete all documents in a namespace.

        Args:
            namespace: Namespace to delete.

        Returns:
            True if deletion was successful.
        """
        self._ensure_client()

        try:
            self._index.delete(delete_all=True, namespace=namespace)
            logger.info(f"Deleted all documents in namespace '{namespace}'")
            return True

        except Exception as e:
            logger.error(f"Failed to delete namespace '{namespace}': {e}")
            return False

    async def delete_by_filter(
        self,
        filter: Dict[str, Any],
        namespace: str
    ) -> int:
        """
        Delete documents matching a metadata filter.

        Args:
            filter: Metadata filter to match documents.
            namespace: Namespace containing the documents.

        Returns:
            Number of documents deleted (estimated).
        """
        self._ensure_client()

        try:
            # Pinecone supports delete by filter
            self._index.delete(filter=filter, namespace=namespace)
            logger.info(
                f"Deleted documents matching filter in namespace '{namespace}'"
            )
            # Pinecone doesn't return count, so return 1 as indicator of success
            return 1

        except Exception as e:
            logger.error(f"Failed to delete by filter from '{namespace}': {e}")
            return 0

    async def get_stats(self, namespace: Optional[str] = None) -> Dict[str, Any]:
        """
        Get statistics about the vector store.

        Args:
            namespace: Optional namespace to get stats for.

        Returns:
            Dictionary with stats (record_count, dimension, etc.).
        """
        self._ensure_client()

        try:
            stats = self._index.describe_index_stats()

            result = {
                "total_record_count": stats.get("total_record_count", 0),
                "dimension": stats.get("dimension", 0),
                "namespaces": {},
            }

            # Get namespace-specific stats
            namespaces = stats.get("namespaces", {})
            for ns_name, ns_data in namespaces.items():
                result["namespaces"][ns_name] = {
                    "record_count": ns_data.get("record_count", 0)
                }

            # If specific namespace requested, return just that
            if namespace:
                ns_stats = namespaces.get(namespace, {})
                return {
                    "record_count": ns_stats.get("record_count", 0),
                    "namespace": namespace,
                }

            return result

        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {"record_count": 0, "error": str(e)}


# Singleton instance
_store_instance: Optional[PineconeStore] = None


def get_vector_store() -> PineconeStore:
    """
    Get the singleton vector store instance.

    Returns:
        PineconeStore instance.
    """
    global _store_instance
    if _store_instance is None:
        _store_instance = PineconeStore()
    return _store_instance


def reset_vector_store() -> None:
    """Reset the singleton instance. Useful for testing."""
    global _store_instance
    _store_instance = None
