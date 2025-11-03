"""
Reading position management endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Optional
from app.models.reading_position import (
    ReadingPositionCreate,
    ReadingPositionResponse,
    ReadingPositionListResponse
)
from app.services.reading_position import ReadingPositionService
from app.services.exceptions import (
    UnauthorizedError,
    JournalNotFoundError
)
from app.core.dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api", tags=["Reading Positions"])


@router.post("/reading-positions", response_model=ReadingPositionResponse, status_code=status.HTTP_201_CREATED)
async def save_reading_position(
    position: ReadingPositionCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Save or update a reading position for a journal.

    This endpoint allows users to save their current reading position in a journal,
    including scroll position, progress percentage, and word count.
    """
    try:
        logger.info(f"[API_SAVE_POSITION] user={current_user.get('sub')}, journal={position.journal_id}")

        service = ReadingPositionService()
        result = service.save_position(
            user_id=current_user.get("sub", ""),
            journal_id=position.journal_id,
            space_id=position.space_id,
            position_data=position
        )

        response = ReadingPositionResponse(
            user_id=result['user_id'],
            journal_id=result['journal_id'],
            space_id=result['space_id'],
            scroll_position=result['scroll_position'],
            current_section_id=result.get('current_section_id'),
            progress_percent=result['progress_percent'],
            words_read=result['words_read'],
            total_words=result['total_words'],
            created_at=result['created_at'],
            updated_at=result['updated_at']
        )

        logger.info(f"[API_SAVE_POSITION] Position saved for journal={position.journal_id}")
        return response

    except UnauthorizedError as e:
        logger.warning(f"[API_SAVE_POSITION] Unauthorized: {e}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except JournalNotFoundError as e:
        logger.warning(f"[API_SAVE_POSITION] Journal not found: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"[API_SAVE_POSITION] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save reading position"
        )


@router.get("/reading-positions/{journal_id}", response_model=ReadingPositionResponse)
async def get_reading_position(
    journal_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get the reading position for a journal.

    Returns the user's saved reading position for the specified journal.
    """
    try:
        logger.info(f"[API_GET_POSITION] user={current_user.get('sub')}, journal={journal_id}")

        service = ReadingPositionService()
        result = service.get_position(
            user_id=current_user.get("sub", ""),
            journal_id=journal_id
        )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Reading position not found for journal {journal_id}"
            )

        response = ReadingPositionResponse(
            user_id=result['user_id'],
            journal_id=result['journal_id'],
            space_id=result['space_id'],
            scroll_position=result['scroll_position'],
            current_section_id=result.get('current_section_id'),
            progress_percent=result['progress_percent'],
            words_read=result['words_read'],
            total_words=result['total_words'],
            created_at=result['created_at'],
            updated_at=result['updated_at']
        )

        logger.info(f"[API_GET_POSITION] Position retrieved for journal={journal_id}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[API_GET_POSITION] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get reading position"
        )


@router.delete("/reading-positions/{journal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reading_position(
    journal_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a reading position for a journal.

    This endpoint allows users to mark a journal as complete or remove their
    saved reading position.
    """
    try:
        logger.info(f"[API_DELETE_POSITION] user={current_user.get('sub')}, journal={journal_id}")

        service = ReadingPositionService()
        deleted = service.delete_position(
            user_id=current_user.get("sub", ""),
            journal_id=journal_id
        )

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Reading position not found for journal {journal_id}"
            )

        logger.info(f"[API_DELETE_POSITION] Position deleted for journal={journal_id}")
        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[API_DELETE_POSITION] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete reading position"
        )


@router.get("/reading-positions", response_model=ReadingPositionListResponse)
async def get_user_reading_positions(
    current_user: dict = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of positions to return")
):
    """
    Get all reading positions for the current user.

    Returns a list of the user's recent reading positions across all journals,
    sorted by most recently updated.
    """
    try:
        logger.info(f"[API_GET_USER_POSITIONS] user={current_user.get('sub')}, limit={limit}")

        service = ReadingPositionService()
        positions = service.get_user_positions(
            user_id=current_user.get("sub", ""),
            limit=limit
        )

        # Convert to response format
        position_responses = []
        for pos in positions:
            position_responses.append(ReadingPositionResponse(
                user_id=pos['user_id'],
                journal_id=pos['journal_id'],
                space_id=pos['space_id'],
                scroll_position=pos['scroll_position'],
                current_section_id=pos.get('current_section_id'),
                progress_percent=pos['progress_percent'],
                words_read=pos['words_read'],
                total_words=pos['total_words'],
                created_at=pos['created_at'],
                updated_at=pos['updated_at']
            ))

        response = ReadingPositionListResponse(
            positions=position_responses,
            total=len(position_responses)
        )

        logger.info(f"[API_GET_USER_POSITIONS] Retrieved {len(positions)} positions")
        return response

    except Exception as e:
        logger.error(f"[API_GET_USER_POSITIONS] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get reading positions"
        )
