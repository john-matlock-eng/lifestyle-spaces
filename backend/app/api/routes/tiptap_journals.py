"""
API routes for TipTap-native journal operations with embedded highlights.

This module handles journals stored in TipTap JSON format, where highlights are
embedded as marks within the document structure.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional
import logging

from app.models.journal import JournalUpdate, JournalResponse
from app.models.highlight import (
    extract_highlights_from_tiptap,
    update_highlight_comment_count_in_tiptap,
    remove_highlight_from_tiptap,
)
from app.services.journal import JournalService
from app.services.highlight_service import HighlightService, CommentService
from app.core.dependencies import get_current_user
from app.websocket.highlight_manager import get_websocket_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tiptap", tags=["tiptap-journals"])


@router.put(
    "/spaces/{space_id}/journals/{journal_id}",
    response_model=JournalResponse,
)
async def update_tiptap_journal(
    space_id: str,
    journal_id: str,
    content_tiptap: Dict[str, Any],
    content: Optional[str] = None,  # Optional markdown fallback
    current_user: dict = Depends(get_current_user),
):
    """
    Update a journal with TipTap JSON content.

    This endpoint:
    1. Saves the TipTap JSON content with embedded highlights
    2. Extracts highlights from the document for indexing
    3. Syncs comment counts with the document
    4. Broadcasts updates via WebSocket
    """
    try:
        user_id = current_user.get("sub") or current_user.get("userId")
        journal_service = JournalService()
        highlight_service = HighlightService()
        ws_manager = get_websocket_manager()

        # Extract highlights from TipTap document
        highlights = extract_highlights_from_tiptap(content_tiptap)
        logger.info(
            f"[TIPTAP_UPDATE] Extracted {len(highlights)} highlights from journal {journal_id}"
        )

        # Update journal with TipTap content
        update_data = JournalUpdate(
            content=content or "TipTap content",  # Fallback to indicate TipTap format
            content_tiptap=content_tiptap,
        )

        updated_journal = journal_service.update_journal_entry(
            space_id=space_id,
            journal_id=journal_id,
            user_id=user_id,
            data=update_data,
        )

        # Index highlights for search and comment management
        # Note: The TipTap document is the source of truth
        for highlight in highlights:
            await highlight_service.index_highlight(
                space_id=space_id,
                journal_entry_id=journal_id,
                highlight_id=highlight.id,
                metadata={
                    "color": highlight.color,
                    "author_id": highlight.author_id,
                    "author_name": highlight.author_name,
                    "created_at": highlight.created_at,
                    "comment_count": highlight.comment_count,
                },
            )

        # Broadcast update via WebSocket
        await ws_manager.broadcast_message(
            journal_entry_id=journal_id,
            message_type="JOURNAL_UPDATED",
            payload={
                "journal_id": journal_id,
                "content_tiptap": content_tiptap,
                "highlights": [h.dict(by_alias=True) for h in highlights],
            },
            sender_id=user_id,
        )

        return JournalResponse(
            journal_id=updated_journal["journal_id"],
            space_id=updated_journal["space_id"],
            user_id=updated_journal["user_id"],
            title=updated_journal["title"],
            content=updated_journal["content"],
            content_tiptap=updated_journal.get("content_tiptap"),
            template_id=updated_journal.get("template_id"),
            tags=updated_journal.get("tags", []),
            emotions=updated_journal.get("emotions", []),
            created_at=updated_journal["created_at"],
            updated_at=updated_journal["updated_at"],
            word_count=updated_journal.get("word_count", 0),
            is_pinned=updated_journal.get("is_pinned", False),
        )

    except Exception as e:
        logger.error(f"[TIPTAP_UPDATE] Failed to update journal: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update journal: {str(e)}",
        )


@router.post(
    "/spaces/{space_id}/journals/{journal_id}/highlights/{highlight_id}/comments/sync",
    status_code=status.HTTP_200_OK,
)
async def sync_highlight_comment_count(
    space_id: str,
    journal_id: str,
    highlight_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Sync comment count for a highlight in the TipTap document.

    This is called after comment operations to keep the document in sync.
    """
    try:
        user_id = current_user.get("sub") or current_user.get("userId")
        journal_service = JournalService()
        comment_service = CommentService()
        ws_manager = get_websocket_manager()

        # Get current journal
        journal = journal_service.get_journal_entry(space_id, journal_id)
        if not journal or not journal.get("content_tiptap"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Journal not found or does not use TipTap format",
            )

        # Get comment count for highlight
        comments = await comment_service.get_comments_for_highlight(space_id, highlight_id)
        comment_count = len(comments)

        # Update comment count in TipTap document
        content_tiptap = journal["content_tiptap"]
        updated_content = update_highlight_comment_count_in_tiptap(
            content_tiptap, highlight_id, comment_count
        )

        # Save updated document
        update_data = JournalUpdate(content_tiptap=updated_content)
        updated_journal = journal_service.update_journal_entry(
            space_id=space_id,
            journal_id=journal_id,
            user_id=user_id,
            data=update_data,
        )

        # Broadcast update via WebSocket
        await ws_manager.broadcast_message(
            journal_entry_id=journal_id,
            message_type="HIGHLIGHT_COMMENT_COUNT_UPDATED",
            payload={
                "highlight_id": highlight_id,
                "comment_count": comment_count,
            },
            sender_id=user_id,
        )

        return {"success": True, "comment_count": comment_count}

    except Exception as e:
        logger.error(f"[TIPTAP_SYNC] Failed to sync comment count: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync comment count: {str(e)}",
        )


@router.delete(
    "/spaces/{space_id}/journals/{journal_id}/highlights/{highlight_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_highlight_from_tiptap(
    space_id: str,
    journal_id: str,
    highlight_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Delete a highlight from the TipTap document.

    This removes the highlight mark from the document structure.
    """
    try:
        user_id = current_user.get("sub") or current_user.get("userId")
        journal_service = JournalService()
        highlight_service = HighlightService()
        ws_manager = get_websocket_manager()

        # Get current journal
        journal = journal_service.get_journal_entry(space_id, journal_id)
        if not journal or not journal.get("content_tiptap"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Journal not found or does not use TipTap format",
            )

        # Remove highlight from TipTap document
        content_tiptap = journal["content_tiptap"]
        updated_content = remove_highlight_from_tiptap(content_tiptap, highlight_id)

        # Save updated document
        update_data = JournalUpdate(content_tiptap=updated_content)
        journal_service.update_journal_entry(
            space_id=space_id,
            journal_id=journal_id,
            user_id=user_id,
            data=update_data,
        )

        # Remove from index
        await highlight_service.delete_highlight(
            space_id=space_id, highlight_id=highlight_id, user_id=user_id
        )

        # Broadcast update via WebSocket
        await ws_manager.broadcast_message(
            journal_entry_id=journal_id,
            message_type="HIGHLIGHT_DELETED",
            payload={"highlight_id": highlight_id},
            sender_id=user_id,
        )

        return None

    except Exception as e:
        logger.error(f"[TIPTAP_DELETE] Failed to delete highlight: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete highlight: {str(e)}",
        )
