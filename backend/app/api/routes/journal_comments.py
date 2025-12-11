"""
API routes for Journal-level Comments (Conversations feature).
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.models.journal_comment import (
    JournalCommentModel,
    JournalCommentListResponse,
    CreateJournalCommentRequest,
    UpdateJournalCommentRequest,
)
from app.services.journal_comment_service import (
    JournalCommentService,
    get_journal_comment_service,
)
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/spaces", tags=["journal-comments"])


@router.post(
    "/{space_id}/journals/{journal_id}/comments",
    response_model=JournalCommentModel,
    status_code=status.HTTP_201_CREATED,
)
async def create_journal_comment(
    space_id: str,
    journal_id: str,
    request: CreateJournalCommentRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a new comment on a journal. Any space member can comment."""
    service = get_journal_comment_service()

    user_id = current_user.get("sub") or current_user.get("userId")
    user_name = current_user.get("profile", {}).get("display_name", "Unknown User")

    # Verify user is a member of this space
    if not service.is_space_member(space_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this space to comment",
        )

    comment = await service.create_comment(
        space_id=space_id,
        journal_id=journal_id,
        user_id=user_id,
        user_name=user_name,
        request=request,
    )

    return comment


@router.get(
    "/{space_id}/journals/{journal_id}/comments",
    response_model=JournalCommentListResponse,
)
async def get_journal_comments(
    space_id: str,
    journal_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get all comments for a journal. Any space member can view comments."""
    service = get_journal_comment_service()

    user_id = current_user.get("sub") or current_user.get("userId")

    # Verify user is a member of this space
    if not service.is_space_member(space_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this space to view comments",
        )

    comments = await service.get_comments_for_journal(space_id, journal_id)
    return JournalCommentListResponse(comments=comments, count=len(comments))


@router.put(
    "/{space_id}/journal-comments/{comment_id}",
    response_model=JournalCommentModel,
)
async def update_journal_comment(
    space_id: str,
    comment_id: str,
    request: UpdateJournalCommentRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update a journal comment. Only the author can update their own comments."""
    service = get_journal_comment_service()

    user_id = current_user.get("sub") or current_user.get("userId")

    # Verify user is a member of this space
    if not service.is_space_member(space_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this space",
        )

    comment = await service.update_comment(
        space_id=space_id,
        comment_id=comment_id,
        user_id=user_id,
        request=request,
    )

    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found or you don't have permission to update it",
        )

    return comment


@router.delete(
    "/{space_id}/journal-comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_journal_comment(
    space_id: str,
    comment_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a journal comment. Only the author can delete their own comments."""
    service = get_journal_comment_service()

    user_id = current_user.get("sub") or current_user.get("userId")

    # Verify user is a member of this space
    if not service.is_space_member(space_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this space",
        )

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


@router.get(
    "/{space_id}/journals/{journal_id}/comments/count",
    response_model=dict,
)
async def get_journal_comment_count(
    space_id: str,
    journal_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get the comment count for a journal."""
    service = get_journal_comment_service()

    user_id = current_user.get("sub") or current_user.get("userId")

    # Verify user is a member of this space
    if not service.is_space_member(space_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this space",
        )

    count = await service.get_comment_count(space_id, journal_id)
    return {"count": count}
