"""
Journal Indexing Service

Indexes journal sections into Pinecone for semantic search.
Each section is indexed as a separate vector for granular retrieval.

SECURITY: All operations are space-isolated via namespaces.
"""

import logging
from typing import Optional, List, Dict, Any

from app.models.journal import JournalEntry
from app.services.vector_store import (
    VectorDocument,
    get_vector_store,
)
from app.services.vector_store.base import SectionSearchResult
from app.services.section_parser import get_section_parser, ParsedSection
from app.services.search_scoring import apply_recency_boost
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class JournalIndexer:
    """
    Service for indexing journals into vector store at section level.

    ISOLATION MODEL:
    - Each space gets its own Pinecone namespace: space_{spaceId}
    - Searches are ALWAYS scoped to a single space
    """

    def __init__(self):
        self.vector_store = get_vector_store()
        self.section_parser = get_section_parser()

    @staticmethod
    def _get_namespace(space_id: str) -> str:
        """Generate namespace for a space."""
        if not space_id:
            raise ValueError("space_id is REQUIRED for namespace generation")
        return f"space_{space_id}"

    @staticmethod
    def _get_section_document_id(journal_id: str, section_index: int) -> str:
        """Generate document ID for a journal section."""
        return f"journal_{journal_id}_section_{section_index}"

    @staticmethod
    def _get_journal_id_prefix(journal_id: str) -> str:
        """Get prefix for all sections of a journal."""
        return f"journal_{journal_id}_section_"

    def _build_section_documents(
        self,
        journal: JournalEntry,
        sections: List[ParsedSection]
    ) -> List[VectorDocument]:
        """Build vector documents for each section."""
        documents = []

        title = journal.title or "Untitled"
        namespace = self._get_namespace(journal.space_id)

        for section in sections:
            doc_id = self._get_section_document_id(
                journal.journal_id, section.index
            )

            # Build rich metadata for filtering and display
            metadata = {
                "journalId": journal.journal_id,
                "journalTitle": title[:100],
                "sectionIndex": section.index,
                "sectionTitle": section.title[:100],
                "sectionType": section.section_type,
                "userId": journal.user_id,
                "spaceId": journal.space_id,
                "templateId": journal.template_id or "",
                "frameworkId": journal.framework_id or "",
                "status": getattr(journal, 'status', None) or "published",
                "createdAt": (
                    journal.created_at.isoformat() if journal.created_at else ""
                ),
            }

            # Add tags if present
            if hasattr(journal, 'tags') and journal.tags:
                metadata["tags"] = journal.tags[:10]

            documents.append(VectorDocument(
                id=doc_id,
                text=section.content,
                metadata=metadata,
                namespace=namespace,
            ))

        return documents

    async def index_journal(self, journal: JournalEntry) -> int:
        """
        Index a journal's sections.

        Args:
            journal: Journal to index

        Returns:
            Number of sections indexed
        """
        if not journal.space_id:
            logger.error(
                f"Cannot index journal {journal.journal_id}: missing space_id"
            )
            return 0

        try:
            # First, delete any existing sections for this journal
            await self._delete_journal_sections(
                journal.journal_id, journal.space_id
            )

            # Parse content into sections
            # Handle both TipTap JSON (contentTiptap) and plain content
            content_to_parse = journal.content
            if hasattr(journal, 'content_tiptap') and journal.content_tiptap:
                content_to_parse = journal.content_tiptap

            sections = self.section_parser.parse(
                content=content_to_parse,
                template_id=journal.template_id,
                title=journal.title
            )

            if not sections:
                logger.warning(
                    f"No sections parsed from journal {journal.journal_id}"
                )
                return 0

            # Build documents
            documents = self._build_section_documents(journal, sections)

            # Index to vector store
            results = await self.vector_store.upsert(documents)
            count = sum(1 for r in results if r.status.value == "success")

            logger.info(
                f"Indexed {count} sections for journal {journal.journal_id} "
                f"→ {self._get_namespace(journal.space_id)}"
            )
            return count

        except Exception as e:
            logger.error(f"Failed to index journal {journal.journal_id}: {e}")
            return 0

    async def index_journals(self, journals: List[JournalEntry]) -> int:
        """Batch index multiple journals."""
        total = 0
        for journal in journals:
            count = await self.index_journal(journal)
            total += count
        return total

    async def _delete_journal_sections(
        self, journal_id: str, space_id: str
    ) -> None:
        """Delete all sections for a journal."""
        namespace = self._get_namespace(space_id)

        try:
            # Delete by filter matching journalId
            await self.vector_store.delete_by_filter(
                filter={"journalId": {"$eq": journal_id}},
                namespace=namespace
            )
            logger.debug(f"Deleted existing sections for journal {journal_id}")
        except Exception as e:
            logger.warning(f"Failed to delete existing sections: {e}")

    async def delete_journal(self, journal_id: str, space_id: str) -> bool:
        """Remove all sections for a journal from the index."""
        if not space_id:
            raise ValueError("space_id is REQUIRED for deletion")

        try:
            await self._delete_journal_sections(journal_id, space_id)
            logger.info(f"Deleted journal {journal_id} sections from index")
            return True
        except Exception as e:
            logger.error(f"Failed to delete journal {journal_id}: {e}")
            return False

    async def search_space(
        self,
        query: str,
        space_id: str,
        user_id: Optional[str] = None,
        framework_id: Optional[str] = None,
        template_id: Optional[str] = None,
        top_k: int = 10
    ) -> List[SectionSearchResult]:
        """
        Search journal sections within a space.

        Returns section-level results with actual content excerpts.

        Args:
            query: Natural language search query
            space_id: REQUIRED - Space to search within
            user_id: Optional - Filter to specific user
            framework_id: Optional - Filter by framework
            template_id: Optional - Filter by template
            top_k: Number of results (default 10 for sections)

        Returns:
            List of section results with excerpts
        """
        if not space_id:
            raise ValueError("space_id is REQUIRED - cannot search across spaces")

        if not query or not query.strip():
            raise ValueError("query is required")

        # Build metadata filter
        filter_dict: Dict[str, Any] = {}

        if user_id:
            filter_dict["userId"] = {"$eq": user_id}
        if framework_id:
            filter_dict["frameworkId"] = {"$eq": framework_id}
        if template_id:
            filter_dict["templateId"] = {"$eq": template_id}

        namespace = self._get_namespace(space_id)

        try:
            results = await self.vector_store.search(
                query=query.strip(),
                namespace=namespace,
                top_k=min(top_k, 20),
                filter=filter_dict if filter_dict else None,
            )

            section_results = []
            for r in results:
                # Extract section info from metadata
                metadata = r.metadata

                section_results.append(SectionSearchResult(
                    id=r.id,
                    score=round(r.score, 4),
                    journal_id=metadata.get("journalId", ""),
                    section_index=metadata.get("sectionIndex", 0),
                    section_title=metadata.get("sectionTitle", ""),
                    excerpt=self._get_excerpt_from_result(r),
                    metadata={
                        "journalTitle": metadata.get("journalTitle", "Untitled"),
                        "templateId": metadata.get("templateId"),
                        "frameworkId": metadata.get("frameworkId"),
                        "createdAt": metadata.get("createdAt"),
                        "userId": metadata.get("userId"),
                    }
                ))

            logger.debug(
                f"Search '{query[:30]}...' in {namespace}: "
                f"{len(section_results)} sections"
            )
            return section_results

        except Exception as e:
            logger.error(f"Search failed in {namespace}: {e}")
            return []

    def _get_excerpt_from_result(self, result) -> str:
        """
        Extract excerpt from search result.

        Pinecone with integrated embeddings may return the text in metadata.
        """
        # Try to get original text from result
        # This depends on how Pinecone returns it
        text = result.metadata.get("text", "")

        if not text:
            # Fallback - we don't have the original text
            # Return a placeholder; the actual text can be fetched from DynamoDB
            return ""

        # Truncate for excerpt
        max_excerpt = 300
        if len(text) > max_excerpt:
            return text[:max_excerpt] + "..."
        return text

    async def search_space_grouped(
        self,
        query: str,
        space_id: str,
        user_id: Optional[str] = None,
        top_k: int = 5
    ) -> List[dict]:
        """
        Search and group results by journal, with recency boosting.

        Returns top N journals with their best matching sections,
        re-ranked by a hybrid score combining semantic similarity and recency.

        Args:
            query: Search query text
            space_id: Space to search within
            user_id: Optional user filter
            top_k: Number of journals to return

        Returns:
            List of journal results with sections, sorted by hybrid score
        """
        settings = get_settings()

        # Get more section results to ensure we have enough journals after grouping
        section_results = await self.search_space(
            query=query,
            space_id=space_id,
            user_id=user_id,
            top_k=top_k * 3  # Get more to allow grouping
        )

        # Group by journal
        journal_map: Dict[str, dict] = {}
        for result in section_results:
            jid = result.journal_id
            if jid not in journal_map:
                journal_map[jid] = {
                    "journalId": jid,
                    "journalTitle": result.metadata.get(
                        "journalTitle", "Untitled"
                    ),
                    "topScore": result.score,
                    "sections": [],
                    "createdAt": result.metadata.get("createdAt"),
                    "userId": result.metadata.get("userId"),
                }

            journal_map[jid]["sections"].append({
                "sectionIndex": result.section_index,
                "sectionTitle": result.section_title,
                "score": result.score,
                "excerpt": result.excerpt,
            })

        # Convert to list and sort by semantic score first
        grouped = sorted(
            journal_map.values(),
            key=lambda x: x["topScore"],
            reverse=True
        )

        # Apply recency boost to re-rank results
        grouped = apply_recency_boost(
            results=grouped,
            semantic_weight=settings.search_semantic_weight,
            recency_weight=settings.search_recency_weight,
            max_age_days=settings.search_max_age_days,
            score_field="topScore",
            date_field="createdAt",
        )

        # Limit to requested number
        return grouped[:top_k]

    async def delete_space_index(self, space_id: str) -> bool:
        """Delete ALL indexed data for a space."""
        if not space_id:
            raise ValueError("space_id is required")

        try:
            namespace = self._get_namespace(space_id)
            await self.vector_store.delete_namespace(namespace)
            logger.info(f"Deleted entire index for space {space_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete space index {space_id}: {e}")
            return False

    async def get_space_stats(self, space_id: str) -> dict:
        """Get indexing stats for a space."""
        if not space_id:
            raise ValueError("space_id is required")

        namespace = self._get_namespace(space_id)
        stats = await self.vector_store.get_stats(namespace=namespace)
        return {
            "space_id": space_id,
            "indexed_sections": stats.get("record_count", 0)
        }


# Singleton
_journal_indexer: Optional[JournalIndexer] = None


def get_journal_indexer() -> JournalIndexer:
    """Get singleton journal indexer instance."""
    global _journal_indexer
    if _journal_indexer is None:
        _journal_indexer = JournalIndexer()
    return _journal_indexer


def reset_journal_indexer() -> None:
    """Reset singleton (for testing)."""
    global _journal_indexer
    _journal_indexer = None
