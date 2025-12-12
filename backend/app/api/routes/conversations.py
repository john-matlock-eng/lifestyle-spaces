"""
API routes for Conversations aggregation feature.
Provides endpoints for viewing thread-level discussion data across a space.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from pydantic import BaseModel

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


class MarkThreadReadRequest(BaseModel):
    """Request body for marking a thread as read."""
    thread_type: str


class MarkAllReadResponse(BaseModel):
    """Response for marking all threads as read."""
    success: bool
    marked_count: int


@router.get(
    "/{space_id}/threads",
    response_model=ThreadsResponse,
)
async def get_conversation_threads(
    space_id: str,
    limit: int = Query(default=50, ge=1, le=100, description="Maximum threads to return"),
    offset: int = Query(default=0, ge=0, description="Skip this many threads for pagination"),
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
    filter: Optional[str] = Query(
        default=None,
        pattern="^(participated|unread)$",
        description="Filter: 'participated' for threads you've been in, 'unread' for unread only",
    ),
    time_filter: Optional[str] = Query(
        default=None,
        pattern="^(today|week|month)$",
        description="Filter by time: 'today', 'week', or 'month'",
    ),
    search: Optional[str] = Query(
        default=None,
        max_length=200,
        description="Search query for highlight text, journal title, or comment text",
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

    Supports pagination via offset/limit, filtering, and search.
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
        offset=offset,
        sort_by=sort,
        filter_type=type,
        filter_participation=filter,
        time_filter=time_filter,
        search=search,
    )

    return threads


@router.post(
    "/{space_id}/threads/{thread_id}/mark-read",
    response_model=MarkReadResponse,
)
async def mark_thread_as_read(
    space_id: str,
    thread_id: str,
    request: MarkThreadReadRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Mark a specific thread as read.

    For highlight threads, marks that specific highlight's comments as read.
    For journal discussions, marks that specific journal's discussion as read.

    Each thread is tracked independently (per-thread read status).
    """
    service = get_conversation_service()

    user_id = current_user.get("sub") or current_user.get("userId")

    if not service.is_space_member(space_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this space",
        )

    success = await service.mark_thread_as_read(
        user_id=user_id,
        space_id=space_id,
        thread_id=thread_id,
        thread_type=request.thread_type,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Thread '{thread_id}' not found or could not be marked as read",
        )

    # Extract journal_id for response
    if request.thread_type == "journal_discussion":
        journal_id = thread_id.replace("journal-discussion-", "")
    else:
        # For highlights, look up the actual journal_id
        highlight = service.db.get_item(
            pk=f"SPACE#{space_id}",
            sk=f"HIGHLIGHT#{thread_id}"
        )
        journal_id = highlight.get("journalEntryId", "") if highlight else ""

    return MarkReadResponse(
        success=True,
        journalId=journal_id,
        spaceId=space_id,
        threadId=thread_id,
    )


@router.post(
    "/{space_id}/threads/mark-all-read",
    response_model=MarkAllReadResponse,
)
async def mark_all_threads_as_read(
    space_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Mark all threads in a space as read.
    """
    service = get_conversation_service()

    user_id = current_user.get("sub") or current_user.get("userId")

    if not service.is_space_member(space_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this space",
        )

    marked_count = await service.mark_all_as_read(user_id=user_id, space_id=space_id)

    return MarkAllReadResponse(success=True, marked_count=marked_count)


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
