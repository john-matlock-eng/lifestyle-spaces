"""
API routes for Conversations aggregation feature.
Provides endpoints for viewing aggregated discussion data across a space.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.models.conversation import (
    ConversationsResponse,
    UnreadCountResponse,
    MarkReadRequest,
    MarkReadResponse,
)
from app.services.conversation_service import (
    ConversationService,
    get_conversation_service,
)
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/spaces", tags=["conversations"])


@router.get(
    "/{space_id}/conversations",
    response_model=ConversationsResponse,
)
async def get_space_conversations(
    space_id: str,
    limit: int = Query(default=20, ge=1, le=100, description="Maximum conversations to return"),
    sort: str = Query(default="recent", pattern="^(recent|unread)$", description="Sort order"),
    current_user: dict = Depends(get_current_user),
):
    """
    Get aggregated conversation data for all journals with discussions in a space.

    Returns journals that have highlights or comments, sorted by recent activity
    or unread count.
    """
    service = get_conversation_service()

    user_id = current_user.get("sub") or current_user.get("userId")

    # Verify user is a member of this space
    if not service.is_space_member(space_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this space to view conversations",
        )

    # Map query param to service param
    sort_by = "recent_activity" if sort == "recent" else "unread"

    conversations = await service.get_space_conversations(
        space_id=space_id,
        user_id=user_id,
        limit=limit,
        sort_by=sort_by,
    )

    return conversations


@router.get(
    "/{space_id}/conversations/unread-count",
    response_model=UnreadCountResponse,
)
async def get_unread_count(
    space_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get the total unread comment count for the current user in a space.

    Useful for displaying a badge on the Conversations tab.
    """
    service = get_conversation_service()

    user_id = current_user.get("sub") or current_user.get("userId")

    # Verify user is a member of this space
    if not service.is_space_member(space_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this space",
        )

    result = await service.get_unread_count(user_id, space_id)
    return result


@router.post(
    "/{space_id}/journals/{journal_id}/mark-read",
    response_model=MarkReadResponse,
)
async def mark_journal_as_read(
    space_id: str,
    journal_id: str,
    request: MarkReadRequest = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Mark a journal's comments as read for the current user.

    Can optionally specify whether to mark highlight comments and/or
    journal comments as read.
    """
    service = get_conversation_service()

    user_id = current_user.get("sub") or current_user.get("userId")

    # Verify user is a member of this space
    if not service.is_space_member(space_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this space",
        )

    # Use defaults if no request body provided
    mark_highlight_comments = True
    mark_journal_comments = True

    if request:
        mark_highlight_comments = request.mark_highlight_comments
        mark_journal_comments = request.mark_journal_comments

    success = await service.mark_journal_as_read(
        user_id=user_id,
        space_id=space_id,
        journal_id=journal_id,
        mark_highlight_comments=mark_highlight_comments,
        mark_journal_comments=mark_journal_comments,
    )

    return MarkReadResponse(
        success=success,
        journalId=journal_id,
        spaceId=space_id,
    )
