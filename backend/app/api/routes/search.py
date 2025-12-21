"""
Search API endpoints.

Provides semantic search across journal entries using vector similarity.
All searches are space-isolated for multi-tenant security.
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
import logging

from app.core.dependencies import get_current_user
from app.services.journal_indexer import get_journal_indexer
from app.services.space import SpaceService
from app.services.exceptions import SpaceNotFoundError, UnauthorizedError

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api", tags=["Search"])


class SearchResultItem(BaseModel):
    """Individual search result."""

    journal_id: str = Field(..., alias="journalId")
    score: float = Field(..., description="Similarity score (0-1, higher is better)")
    space_id: Optional[str] = Field(None, alias="spaceId")
    user_id: Optional[str] = Field(None, alias="userId")
    template_id: Optional[str] = Field(None, alias="templateId")
    created_at: Optional[str] = Field(None, alias="createdAt")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class SearchResponse(BaseModel):
    """Search response containing results."""

    query: str
    results: List[SearchResultItem]
    total: int

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


@router.get(
    "/spaces/{space_id}/search",
    response_model=SearchResponse,
    summary="Search journals",
    description="Perform semantic search across journals in a space.",
)
async def search_journals(
    space_id: str,
    q: str = Query(..., min_length=1, max_length=500, description="Search query"),
    top_k: int = Query(10, ge=1, le=50, alias="topK", description="Max results to return"),
    template_id: Optional[str] = Query(None, alias="templateId", description="Filter by template"),
    framework_id: Optional[str] = Query(None, alias="frameworkId", description="Filter by framework"),
    current_user: dict = Depends(get_current_user),
):
    """
    Search journals within a space using semantic similarity.

    Returns journals ranked by relevance to the query.
    Results are always limited to the specified space for security.
    """
    try:
        user_id = current_user.get("sub", "")

        # Verify user has access to the space
        space_service = SpaceService()
        space = space_service.get_space(space_id)
        if not space:
            raise SpaceNotFoundError(f"Space {space_id} not found")

        # Check if user is a member
        is_member = space_service.is_space_member(space_id, user_id)
        if not is_member:
            raise UnauthorizedError("You are not a member of this space")

        logger.info(
            f"[SEARCH] user={user_id}, space={space_id}, query='{q[:50]}...', "
            f"top_k={top_k}, template={template_id}, framework={framework_id}"
        )

        # Perform search
        indexer = get_journal_indexer()
        results = await indexer.search(
            query=q,
            space_id=space_id,
            top_k=top_k,
            template_id=template_id,
            framework_id=framework_id,
        )

        # Convert to response format
        search_results = []
        for result in results:
            search_results.append(
                SearchResultItem(
                    journal_id=result.id,
                    score=result.score,
                    space_id=result.metadata.get("space_id"),
                    user_id=result.metadata.get("user_id"),
                    template_id=result.metadata.get("template_id"),
                    created_at=result.metadata.get("created_at"),
                )
            )

        logger.info(f"[SEARCH] Returned {len(search_results)} results")

        return SearchResponse(
            query=q,
            results=search_results,
            total=len(search_results),
        )

    except SpaceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"[SEARCH] Failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search failed. Please try again.",
        )
