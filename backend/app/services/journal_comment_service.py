"""
Service layer for Journal-level Comments (Conversations feature).
Handles business logic for creating, retrieving, and managing journal comments.
"""

from datetime import datetime
from typing import List, Optional
from uuid import uuid4
import logging

from app.core.database import get_db
from app.models.journal_comment import (
    JournalCommentModel,
    CreateJournalCommentRequest,
    UpdateJournalCommentRequest,
)
from app.models.activity import ActivityType

logger = logging.getLogger(__name__)


class JournalCommentService:
    """Service for managing journal-level comments."""

    def __init__(self):
        self.db = get_db()

    def is_space_member(self, space_id: str, user_id: str) -> bool:
        """Check if user is a member of the space."""
        try:
            item = self.db.get_item(pk=f"SPACE#{space_id}", sk=f"MEMBER#{user_id}")
            return item is not None
        except Exception:
            return False

    def _get_journal_title(self, space_id: str, journal_id: str) -> str:
        """Get the title of a journal entry."""
        try:
            item = self.db.get_item(pk=f"SPACE#{space_id}", sk=f"JOURNAL#{journal_id}")
            if item:
                return item.get("title", "Untitled")
        except Exception as e:
            logger.warning(f"Failed to get journal title for {journal_id}: {e}")
        return "Untitled"

    async def create_comment(
        self,
        space_id: str,
        journal_id: str,
        user_id: str,
        user_name: str,
        request: CreateJournalCommentRequest,
    ) -> JournalCommentModel:
        """Create a new comment on a journal."""
        now = datetime.utcnow().isoformat()
        comment_id = str(uuid4())

        comment = JournalCommentModel(
            id=comment_id,
            journalId=journal_id,
            spaceId=space_id,
            text=request.text,
            author=user_id,
            authorName=user_name,
            parentCommentId=request.parent_comment_id,
            mentions=request.mentions or [],
            createdAt=now,
            updatedAt=now,
            isEdited=False,
        )

        # Store in DynamoDB
        item = {
            "PK": f"SPACE#{space_id}",
            "SK": f"JOURNAL_COMMENT#{comment_id}",
            "GSI1PK": f"JOURNAL#{journal_id}",
            "GSI1SK": f"JOURNAL_COMMENT#{now}",
            "EntityType": "JournalComment",
            "id": comment_id,
            "journalId": journal_id,
            "spaceId": space_id,
            "text": request.text,
            "author": user_id,
            "authorName": user_name,
            "parentCommentId": request.parent_comment_id,
            "mentions": request.mentions or [],
            "createdAt": now,
            "updatedAt": now,
            "isEdited": False,
        }

        self.db.put_item(item)

        # Record activity
        try:
            from app.services.activity import get_activity_service

            activity_service = get_activity_service()
            journal_title = self._get_journal_title(space_id, journal_id)
            activity_service.record_activity(
                space_id=space_id,
                activity_type=ActivityType.JOURNAL_COMMENT_CREATED,
                user_id=user_id,
                user_name=user_name,
                metadata={
                    "comment_id": comment_id,
                    "journal_id": journal_id,
                    "journal_title": journal_title,
                    "comment_text": request.text[:100] if len(request.text) > 100 else request.text,
                },
            )
        except Exception as e:
            logger.warning(f"Failed to record journal comment created activity: {e}")

        return comment

    async def get_comments_for_journal(
        self, space_id: str, journal_id: str
    ) -> List[JournalCommentModel]:
        """Get all comments for a specific journal."""
        # Query using GSI1 (JOURNAL#{journal_id})
        items = self.db.query(pk=f"JOURNAL#{journal_id}", index_name="GSI1")

        comments = []
        for item in items:
            if item.get("EntityType") == "JournalComment" and item.get("spaceId") == space_id:
                comments.append(self._item_to_comment(item))

        # Sort by creation time
        comments.sort(key=lambda c: c.created_at)
        return comments

    async def get_comment(self, space_id: str, comment_id: str) -> Optional[JournalCommentModel]:
        """Get a specific comment by ID."""
        item = self.db.get_item(pk=f"SPACE#{space_id}", sk=f"JOURNAL_COMMENT#{comment_id}")

        if not item:
            return None

        return self._item_to_comment(item)

    async def update_comment(
        self,
        space_id: str,
        comment_id: str,
        user_id: str,
        request: UpdateJournalCommentRequest,
    ) -> Optional[JournalCommentModel]:
        """Update a comment. Only the author can update."""
        # First verify ownership
        comment = await self.get_comment(space_id, comment_id)
        if not comment or comment.author != user_id:
            return None

        # Update the comment
        now = datetime.utcnow().isoformat()
        self.db.update_item(
            pk=f"SPACE#{space_id}",
            sk=f"JOURNAL_COMMENT#{comment_id}",
            updates={
                "text": request.text,
                "mentions": request.mentions or [],
                "updatedAt": now,
                "isEdited": True,
            },
        )

        comment.text = request.text
        comment.mentions = request.mentions or []
        comment.updated_at = now
        comment.is_edited = True
        return comment

    async def delete_comment(self, space_id: str, comment_id: str, user_id: str) -> bool:
        """Delete a comment. Only the author can delete."""
        # First verify ownership
        comment = await self.get_comment(space_id, comment_id)
        if not comment or comment.author != user_id:
            return False

        # Delete the comment
        self.db.delete_item(pk=f"SPACE#{space_id}", sk=f"JOURNAL_COMMENT#{comment_id}")

        return True

    async def get_comment_count(self, space_id: str, journal_id: str) -> int:
        """Get the count of comments for a journal."""
        comments = await self.get_comments_for_journal(space_id, journal_id)
        return len(comments)

    def _item_to_comment(self, item: dict) -> JournalCommentModel:
        """Convert DynamoDB item to JournalCommentModel."""
        return JournalCommentModel(
            id=item["id"],
            journalId=item["journalId"],
            spaceId=item["spaceId"],
            text=item["text"],
            author=item["author"],
            authorName=item["authorName"],
            parentCommentId=item.get("parentCommentId"),
            mentions=item.get("mentions", []),
            createdAt=item["createdAt"],
            updatedAt=item["updatedAt"],
            isEdited=item.get("isEdited", False),
        )


# Singleton instance
_journal_comment_service: Optional[JournalCommentService] = None


def get_journal_comment_service() -> JournalCommentService:
    """Get or create the journal comment service singleton."""
    global _journal_comment_service
    if _journal_comment_service is None:
        _journal_comment_service = JournalCommentService()
    return _journal_comment_service
