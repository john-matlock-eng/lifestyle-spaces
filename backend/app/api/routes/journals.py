"""
Journal management endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Optional, List
from botocore.exceptions import ClientError
from app.models.journal import (
    JournalCreate, JournalCreateRequest, JournalResponse, JournalUpdate, JournalListResponse
)
from app.models.common import SuccessResponse
from app.services.journal import JournalService, JournalNotFoundError
from app.services.exceptions import (
    SpaceNotFoundError, UnauthorizedError, ValidationError
)
from app.core.dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api", tags=["Journals"])


@router.post("/spaces/{space_id}/journals", response_model=JournalResponse, status_code=status.HTTP_201_CREATED)
async def create_journal(
    space_id: str,
    journal: JournalCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new journal entry in a space."""
    try:
        logger.info(f"[API_CREATE_JOURNAL] Request from user={current_user.get('sub')}, space={space_id}")

        # Create JournalCreate with space_id from path
        journal_data = JournalCreate(
            space_id=space_id,
            title=journal.title,
            content=journal.content,
            tags=journal.tags,
            mood=journal.mood,
            emotions=journal.emotions,
            is_pinned=journal.is_pinned,
            template_id=journal.template_id,
            template_data=journal.template_data
        )

        service = JournalService()
        result = service.create_journal_entry(
            space_id=space_id,
            user_id=current_user.get("sub", ""),
            data=journal_data
        )

        # Return JournalResponse with proper field mapping
        response = JournalResponse(
            journal_id=result["journal_id"],
            space_id=result["space_id"],
            user_id=result["user_id"],
            title=result["title"],
            content=result["content"],
            template_id=result.get("template_id"),
            template_data=result.get("template_data", {}),
            tags=result.get("tags", []),
            mood=result.get("mood"),
            emotions=result.get("emotions", []),
            created_at=result["created_at"],
            updated_at=result["updated_at"],
            word_count=result.get("word_count", 0),
            is_pinned=result.get("is_pinned", False),
            author=None  # New journal, author info not needed
        )

        logger.info(f"[API_CREATE_JOURNAL] Journal created: {result['journal_id']}")
        return response
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except SpaceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create journal: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create journal"
        )


@router.get("/spaces/{space_id}/journals", response_model=JournalListResponse)
async def list_space_journals(
    space_id: str,
    current_user: dict = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    tags: Optional[str] = Query(None),
    mood: Optional[str] = Query(None),
    author_id: Optional[str] = Query(None, alias="authorId")
):
    """List all journals in a space with optional filtering."""
    try:
        logger.info(f"[API_LIST_SPACE_JOURNALS] space={space_id}, user={current_user.get('sub')}")

        # Parse tags if provided (comma-separated)
        tags_list = tags.split(',') if tags else None

        service = JournalService()
        result = service.list_space_journals(
            space_id=space_id,
            user_id=current_user.get("sub", ""),
            page=page,
            page_size=page_size,
            tags=tags_list,
            mood=mood,
            author_id=author_id
        )

        # Convert to response format
        journal_responses = []
        for journal in result["journals"]:
            journal_responses.append(JournalResponse(
                journal_id=journal["journal_id"],
                space_id=journal["space_id"],
                user_id=journal["user_id"],
                title=journal["title"],
                content=journal["content"],
                template_id=journal.get("template_id"),
                template_data=journal.get("template_data", {}),
                tags=journal.get("tags", []),
                mood=journal.get("mood"),
                emotions=journal.get("emotions", []),
                created_at=journal["created_at"],
                updated_at=journal["updated_at"],
                word_count=journal.get("word_count", 0),
                is_pinned=journal.get("is_pinned", False),
                author=journal.get("author")
            ))

        return JournalListResponse(
            journals=journal_responses,
            total=result["total"],
            page=result["page"],
            page_size=result["page_size"],
            has_more=result.get("has_more", False)
        )
    except SpaceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to list journals: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list journals"
        )


@router.get("/spaces/{space_id}/journals/{journal_id}", response_model=JournalResponse)
async def get_journal(
    space_id: str,
    journal_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a single journal entry by ID."""
    try:
        logger.info(f"[API_GET_JOURNAL] space={space_id}, journal={journal_id}, user={current_user.get('sub')}")

        service = JournalService()
        result = service.get_journal_entry(
            space_id=space_id,
            journal_id=journal_id,
            user_id=current_user.get("sub", "")
        )

        return JournalResponse(
            journal_id=result["journal_id"],
            space_id=result["space_id"],
            user_id=result["user_id"],
            title=result["title"],
            content=result["content"],
            template_id=result.get("template_id"),
            template_data=result.get("template_data", {}),
            tags=result.get("tags", []),
            mood=result.get("mood"),
            emotions=result.get("emotions", []),
            created_at=result["created_at"],
            updated_at=result["updated_at"],
            word_count=result.get("word_count", 0),
            is_pinned=result.get("is_pinned", False),
            author=result.get("author")
        )
    except JournalNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get journal: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get journal"
        )


@router.put("/spaces/{space_id}/journals/{journal_id}", response_model=JournalResponse)
async def update_journal(
    space_id: str,
    journal_id: str,
    update: JournalUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a journal entry (author only)."""
    try:
        logger.info(f"[API_UPDATE_JOURNAL] space={space_id}, journal={journal_id}, user={current_user.get('sub')}")

        service = JournalService()
        result = service.update_journal_entry(
            space_id=space_id,
            journal_id=journal_id,
            user_id=current_user.get("sub", ""),
            data=update
        )

        return JournalResponse(
            journal_id=result["journal_id"],
            space_id=result["space_id"],
            user_id=result["user_id"],
            title=result["title"],
            content=result["content"],
            template_id=result.get("template_id"),
            template_data=result.get("template_data", {}),
            tags=result.get("tags", []),
            mood=result.get("mood"),
            emotions=result.get("emotions", []),
            created_at=result["created_at"],
            updated_at=result["updated_at"],
            word_count=result.get("word_count", 0),
            is_pinned=result.get("is_pinned", False),
            author=result.get("author")
        )
    except JournalNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to update journal: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update journal"
        )


@router.delete("/spaces/{space_id}/journals/{journal_id}", response_model=SuccessResponse)
async def delete_journal(
    space_id: str,
    journal_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a journal entry (author or space owner only)."""
    try:
        logger.info(f"[API_DELETE_JOURNAL] space={space_id}, journal={journal_id}, user={current_user.get('sub')}")

        service = JournalService()
        service.delete_journal_entry(
            space_id=space_id,
            journal_id=journal_id,
            user_id=current_user.get("sub", "")
        )

        return SuccessResponse(
            message=f"Journal {journal_id} deleted successfully"
        )
    except JournalNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to delete journal: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete journal"
        )


@router.get("/users/me/journals", response_model=JournalListResponse)
async def list_user_journals(
    current_user: dict = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize")
):
    """List all journals created by the current user across all spaces."""
    try:
        logger.info(f"[API_LIST_USER_JOURNALS] user={current_user.get('sub')}")

        service = JournalService()
        result = service.list_user_journals(
            user_id=current_user.get("sub", ""),
            page=page,
            page_size=page_size
        )

        # Convert to response format
        journal_responses = []
        for journal in result["journals"]:
            journal_responses.append(JournalResponse(
                journal_id=journal["journal_id"],
                space_id=journal["space_id"],
                user_id=journal["user_id"],
                title=journal["title"],
                content=journal["content"],
                template_id=journal.get("template_id"),
                template_data=journal.get("template_data", {}),
                tags=journal.get("tags", []),
                mood=journal.get("mood"),
                emotions=journal.get("emotions", []),
                created_at=journal["created_at"],
                updated_at=journal["updated_at"],
                word_count=journal.get("word_count", 0),
                is_pinned=journal.get("is_pinned", False),
                author=journal.get("author")
            ))

        return JournalListResponse(
            journals=journal_responses,
            total=result["total"],
            page=result["page"],
            page_size=result["page_size"],
            has_more=result.get("has_more", False)
        )
    except Exception as e:
        logger.error(f"Failed to list user journals: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list journals"
        )
