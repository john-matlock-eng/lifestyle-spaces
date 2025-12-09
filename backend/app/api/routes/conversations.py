"""
API routes for Conversations aggregation feature.
Provides endpoints for viewing thread-level discussion data across a space.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional

from app.models.conversation import (
    ThreadsResponse,
    UnreadCountResponse,
    MarkReadRequest,
    MarkReadResponse,
    # Legacy
    ConversationsResponse,
)
from app.services.conversation_service import (
    get_conversation_service,
)
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/spaces", tags=["conversations"])


@router.get(
    "/{space_id}/threads",
    response_model=ThreadsResponse,
)
async def get_conversation_threads(
    space_id: str,
    limit: int = Query(default=50, ge=1, le=100, description="Maximum threads to return"),
    sort: str = Query(
        default="recent",
        pattern="^(recent|unread|replies)$",
        description="Sort order: recent, unread, or replies (threads with replies to you)",
    ),
    type: Optional[str] = Query(
        default=None,
        pattern="^(highlight|journal_discussion)$",
        description="Filter by thread type",
    ),
    current_user: dict = Depends(get_current_user),
):
    """
    Get thread-level conversation data for a space.

    Each thread is either:
    - A highlight with comments
    - A journal-level discussion

    Includes rich participation data: who's involved, whether you've participated,
    whether someone replied after your last comment, etc.
    """
    service = get_conversation_service()

    user_id = current_user.get("sub") or current_user.get("userId")

    if not service.is_space_member(space_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this space to view conversations",
        )

    threads = await service.get_conversation_threads(
        space_id=space_id,
        user_id=user_id,
        limit=limit,
        sort_by=sort,
        filter_type=type,
    )

    return threads


@router.get(
    "/{space_id}/conversations",
    response_model=ConversationsResponse,
    deprecated=True,
)
async def get_space_conversations(
    space_id: str,
    limit: int = Query(default=20, ge=1, le=100, description="Maximum conversations to return"),
    sort: str = Query(default="recent", pattern="^(recent|unread)$", description="Sort order"),
    current_user: dict = Depends(get_current_user),
):
    """
    DEPRECATED: Use /threads instead.

    Get aggregated conversation data for all journals with discussions in a space.
    """
    service = get_conversation_service()

    user_id = current_user.get("sub") or current_user.get("userId")

    if not service.is_space_member(space_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this space to view conversations",
        )

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
    Get the total unread comment count and threads with replies for the current user.

    Returns:
    - totalUnread: Total unread comments across all threads
    - threadsWithReplies: Number of threads where someone replied after your last comment
    """
    service = get_conversation_service()

    user_id = current_user.get("sub") or current_user.get("userId")

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

    if not service.is_space_member(space_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this space",
        )

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
