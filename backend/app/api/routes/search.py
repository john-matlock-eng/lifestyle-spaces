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


class SearchResult(BaseModel):
    """Individual search result with section info."""

    journal_id: str = Field(..., alias="journalId")
    title: str = Field(..., description="Journal title")
    section_title: str = Field(default="", alias="sectionTitle")
    section_index: int = Field(default=0, alias="sectionIndex")
    score: float = Field(..., description="Similarity score 0-1")
    excerpt: str = Field(default="", description="Matched section content")
    user_id: Optional[str] = Field(None, alias="userId")
    template_id: Optional[str] = Field(None, alias="templateId")
    framework_id: Optional[str] = Field(None, alias="frameworkId")
    created_at: Optional[str] = Field(None, alias="createdAt")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class SearchResponse(BaseModel):
    """Search response containing results."""

    query: str
    space_id: str = Field(..., alias="spaceId")
    results: List[SearchResult]
    count: int

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


@router.get(
    "/spaces/{space_id}/search",
    response_model=SearchResponse,
    summary="Search journal sections",
    description="Semantic search across journal sections in a space.",
)
async def search_journals(
    space_id: str,
    q: str = Query(..., min_length=2, max_length=500, description="Search query"),
    framework_id: Optional[str] = Query(
        None, alias="frameworkId", description="Filter by framework"
    ),
    template_id: Optional[str] = Query(
        None, alias="templateId", description="Filter by template"
    ),
    my_journals_only: bool = Query(
        False, alias="myJournalsOnly", description="Only search my journals"
    ),
    limit: int = Query(10, ge=1, le=20, description="Max results to return"),
    current_user: dict = Depends(get_current_user),
):
    """
    Search journal sections semantically within a space.

    Returns section-level results with excerpts ranked by relevance.
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
            f"limit={limit}, template={template_id}, framework={framework_id}"
        )

        # Perform section-level search
        indexer = get_journal_indexer()
        results = await indexer.search_space(
            query=q,
            space_id=space_id,
            user_id=user_id if my_journals_only else None,
            framework_id=framework_id,
            template_id=template_id,
            top_k=limit,
        )

        # Convert to response format
        search_results = [
            SearchResult(
                journalId=r.journal_id,
                title=r.metadata.get("journalTitle", "Untitled"),
                sectionTitle=r.section_title,
                sectionIndex=r.section_index,
                score=r.score,
                excerpt=r.excerpt,
                userId=r.metadata.get("userId"),
                templateId=r.metadata.get("templateId"),
                frameworkId=r.metadata.get("frameworkId"),
                createdAt=r.metadata.get("createdAt"),
            )
            for r in results
        ]

        logger.info(f"[SEARCH] Returned {len(search_results)} section results")

        return SearchResponse(
            query=q,
            spaceId=space_id,
            results=search_results,
            count=len(search_results),
        )

    except SpaceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"[SEARCH] Failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search failed. Please try again.",
        )
