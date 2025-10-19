"""
API routes for Journal Highlights and Comments.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.models.highlight import (
    HighlightModel,
    CommentModel,
    CreateHighlightRequest,
    CreateCommentRequest,
)
from app.services.highlight_service import HighlightService, CommentService
from app.core.dependencies import get_current_user
from app.websocket.highlight_manager import get_websocket_manager

router = APIRouter(prefix="/api/highlights", tags=["highlights"])


# Highlight endpoints
@router.post(
    "/spaces/{space_id}/journals/{journal_entry_id}/highlights",
    response_model=HighlightModel,
    status_code=status.HTTP_201_CREATED,
)
async def create_highlight(
    space_id: str,
    journal_entry_id: str,
    request: CreateHighlightRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a new highlight on a journal entry."""
    service = HighlightService()
    ws_manager = get_websocket_manager()

    # TODO: Verify user has access to this space
    # TODO: Verify journal entry exists and belongs to this space

    user_id = current_user.get("sub") or current_user.get("userId")
    user_name = current_user.get("profile", {}).get("display_name", "Unknown User")

    highlight = await service.create_highlight(
        space_id=space_id,
        journal_entry_id=journal_entry_id,
        user_id=user_id,
        user_name=user_name,
        request=request,
    )

    # Broadcast to WebSocket clients
    await ws_manager.broadcast_message(
        journal_entry_id=journal_entry_id,
        message_type="NEW_HIGHLIGHT",
        payload=highlight.dict(by_alias=True),
        sender_id=user_id
    )

    return highlight


@router.get(
    "/spaces/{space_id}/journals/{journal_entry_id}/highlights",
    response_model=List[HighlightModel],
)
async def get_highlights(
    space_id: str,
    journal_entry_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get all highlights for a journal entry."""
    service = HighlightService()

    # TODO: Verify user has access to this space

    highlights = await service.get_highlights_for_journal(space_id, journal_entry_id)
    return highlights


@router.delete(
    "/spaces/{space_id}/highlights/{highlight_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_highlight(
    space_id: str,
    highlight_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a highlight. Only the creator can delete."""
    service = HighlightService()
    ws_manager = get_websocket_manager()

    user_id = current_user.get("sub") or current_user.get("userId")

    # Get highlight first to find journal_entry_id
    highlight = await service.get_highlight(space_id, highlight_id)
    if not highlight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Highlight not found",
        )

    success = await service.delete_highlight(
        space_id=space_id,
        highlight_id=highlight_id,
        user_id=user_id,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Highlight not found or you don't have permission to delete it",
        )

    # Broadcast to WebSocket clients
    await ws_manager.broadcast_message(
        journal_entry_id=highlight.journal_entry_id,
        message_type="DELETE_HIGHLIGHT",
        payload={"id": highlight_id},
        sender_id=user_id
    )

    return None


# Comment endpoints
@router.post(
    "/spaces/{space_id}/highlights/{highlight_id}/comments",
    response_model=CommentModel,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    space_id: str,
    highlight_id: str,
    request: CreateCommentRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a new comment on a highlight."""
    service = CommentService()

    # TODO: Verify user has access to this space
    # TODO: Verify highlight exists

    user_id = current_user.get("sub") or current_user.get("userId")
    user_name = current_user.get("profile", {}).get("display_name", "Unknown User")

    comment = await service.create_comment(
        space_id=space_id,
        highlight_id=highlight_id,
        user_id=user_id,
        user_name=user_name,
        request=request,
    )

    return comment


@router.get(
    "/spaces/{space_id}/highlights/{highlight_id}/comments",
    response_model=List[CommentModel],
)
async def get_comments(
    space_id: str,
    highlight_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get all comments for a highlight."""
    service = CommentService()

    # TODO: Verify user has access to this space

    comments = await service.get_comments_for_highlight(space_id, highlight_id)
    return comments


@router.put(
    "/spaces/{space_id}/comments/{comment_id}",
    response_model=CommentModel,
)
async def update_comment(
    space_id: str,
    comment_id: str,
    new_text: str,
    current_user: dict = Depends(get_current_user),
):
    """Update a comment. Only the author can update."""
    service = CommentService()

    user_id = current_user.get("sub") or current_user.get("userId")

    comment = await service.update_comment(
        space_id=space_id,
        comment_id=comment_id,
        user_id=user_id,
        new_text=new_text,
    )

    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found or you don't have permission to update it",
        )

    return comment


@router.delete(
    "/spaces/{space_id}/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_comment(
    space_id: str,
    comment_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a comment. Only the author can delete."""
    service = CommentService()

    user_id = current_user.get("sub") or current_user.get("userId")

    success = await service.delete_comment(
        space_id=space_id,
        comment_id=comment_id,
        user_id=user_id,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found or you don't have permission to delete it",
        )

    return None
