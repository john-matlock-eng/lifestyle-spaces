"""
Service layer for Journal Highlights and Comments.
Handles business logic for creating, retrieving, and managing highlights and comments.
"""

from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from app.core.database import get_db
from app.models.highlight import (
    HighlightModel,
    CommentModel,
    CreateHighlightRequest,
    UpdateHighlightRequest,
    CreateCommentRequest,
    TextRange,
)


class HighlightService:
    """Service for managing journal highlights."""

    def __init__(self):
        self.db = get_db()

    async def create_highlight(
        self,
        space_id: str,
        journal_entry_id: str,
        user_id: str,
        user_name: str,
        request: CreateHighlightRequest,
    ) -> HighlightModel:
        """Create a new highlight on a journal entry."""
        now = datetime.utcnow().isoformat()
        highlight_id = str(uuid4())

        highlight = HighlightModel(
            id=highlight_id,
            journalEntryId=journal_entry_id,
            spaceId=space_id,
            highlightedText=request.highlighted_text,
            textRange=request.text_range,
            color=request.color or "yellow",
            createdBy=user_id,
            createdByName=user_name,
            createdAt=now,
            updatedAt=now,
            commentCount=0,
        )

        # Store in DynamoDB using resource API
        item = {
            "PK": f"SPACE#{space_id}",
            "SK": f"HIGHLIGHT#{highlight_id}",
            "GSI1PK": f"JOURNAL#{journal_entry_id}",
            "GSI1SK": f"HIGHLIGHT#{now}",
            "EntityType": "Highlight",
            "id": highlight_id,
            "journalEntryId": journal_entry_id,
            "spaceId": space_id,
            "highlightedText": request.highlighted_text,
            "textRange": request.text_range.dict(by_alias=True),
            "color": request.color or "yellow",
            "createdBy": user_id,
            "createdByName": user_name,
            "createdAt": now,
            "updatedAt": now,
            "commentCount": 0,
        }

        self.db.put_item(item)
        return highlight

    async def get_highlights_for_journal(
        self, space_id: str, journal_entry_id: str
    ) -> List[HighlightModel]:
        """Get all highlights for a specific journal entry."""
        # Query using GSI1 (JOURNAL#{journal_entry_id})
        items = self.db.query(
            pk=f"JOURNAL#{journal_entry_id}",
            index_name="GSI1"
        )

        highlights = []
        for item in items:
            if item.get("EntityType") == "Highlight" and item.get("spaceId") == space_id:
                highlights.append(self._item_to_highlight(item))

        return highlights

    async def get_highlight(self, space_id: str, highlight_id: str) -> Optional[HighlightModel]:
        """Get a specific highlight by ID."""
        item = self.db.get_item(
            pk=f"SPACE#{space_id}",
            sk=f"HIGHLIGHT#{highlight_id}"
        )

        if not item:
            return None

        return self._item_to_highlight(item)

    async def delete_highlight(self, space_id: str, highlight_id: str, user_id: str) -> bool:
        """Delete a highlight. Only the creator can delete."""
        # First verify ownership
        highlight = await self.get_highlight(space_id, highlight_id)
        if not highlight or highlight.created_by != user_id:
            return False

        # Delete the highlight
        self.db.delete_item(
            pk=f"SPACE#{space_id}",
            sk=f"HIGHLIGHT#{highlight_id}"
        )

        # TODO: Also delete associated comments in a batch operation
        return True

    async def update_highlight(
        self,
        space_id: str,
        highlight_id: str,
        user_id: str,
        request: UpdateHighlightRequest,
    ) -> Optional[HighlightModel]:
        """Update a highlight's text selection. Only the creator can update."""
        # First verify ownership
        highlight = await self.get_highlight(space_id, highlight_id)
        if not highlight or highlight.created_by != user_id:
            return None

        # Update the highlight
        now = datetime.utcnow().isoformat()
        self.db.update_item(
            pk=f"SPACE#{space_id}",
            sk=f"HIGHLIGHT#{highlight_id}",
            updates={
                "highlightedText": request.highlighted_text,
                "textRange": request.text_range.dict(by_alias=True),
                "updatedAt": now,
            }
        )

        # Update the model and return
        highlight.highlighted_text = request.highlighted_text
        highlight.text_range = request.text_range
        highlight.updated_at = now
        return highlight

    async def increment_comment_count(self, space_id: str, highlight_id: str) -> None:
        """Increment the comment count for a highlight."""
        highlight = await self.get_highlight(space_id, highlight_id)
        if highlight:
            self.db.update_item(
                pk=f"SPACE#{space_id}",
                sk=f"HIGHLIGHT#{highlight_id}",
                updates={"commentCount": highlight.comment_count + 1}
            )

    async def decrement_comment_count(self, space_id: str, highlight_id: str) -> None:
        """Decrement the comment count for a highlight."""
        highlight = await self.get_highlight(space_id, highlight_id)
        if highlight:
            self.db.update_item(
                pk=f"SPACE#{space_id}",
                sk=f"HIGHLIGHT#{highlight_id}",
                updates={"commentCount": max(0, highlight.comment_count - 1)}
            )

    def _item_to_highlight(self, item: dict) -> HighlightModel:
        """Convert DynamoDB item to HighlightModel."""
        return HighlightModel(
            id=item["id"],
            journalEntryId=item["journalEntryId"],
            spaceId=item["spaceId"],
            highlightedText=item["highlightedText"],
            textRange=TextRange(**item["textRange"]),
            color=item.get("color", "yellow"),
            createdBy=item["createdBy"],
            createdByName=item["createdByName"],
            createdAt=item["createdAt"],
            updatedAt=item["updatedAt"],
            commentCount=item.get("commentCount", 0),
        )


class CommentService:
    """Service for managing comments on highlights."""

    def __init__(self):
        self.db = get_db()
        self.highlight_service = HighlightService()

    async def create_comment(
        self,
        space_id: str,
        highlight_id: str,
        user_id: str,
        user_name: str,
        request: CreateCommentRequest,
    ) -> CommentModel:
        """Create a new comment on a highlight."""
        now = datetime.utcnow().isoformat()
        comment_id = str(uuid4())

        comment = CommentModel(
            id=comment_id,
            highlightId=highlight_id,
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

        # Store in DynamoDB using resource API
        item = {
            "PK": f"SPACE#{space_id}",
            "SK": f"COMMENT#{comment_id}",
            "GSI1PK": f"HIGHLIGHT#{highlight_id}",
            "GSI1SK": f"COMMENT#{now}",
            "EntityType": "Comment",
            "id": comment_id,
            "highlightId": highlight_id,
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

        # Increment comment count on highlight
        await self.highlight_service.increment_comment_count(space_id, highlight_id)

        return comment

    async def get_comments_for_highlight(
        self, space_id: str, highlight_id: str
    ) -> List[CommentModel]:
        """Get all comments for a specific highlight."""
        # Query using GSI1 (HIGHLIGHT#{highlight_id})
        items = self.db.query(
            pk=f"HIGHLIGHT#{highlight_id}",
            index_name="GSI1"
        )

        comments = []
        for item in items:
            if item.get("EntityType") == "Comment" and item.get("spaceId") == space_id:
                comments.append(self._item_to_comment(item))

        # Sort by creation time
        comments.sort(key=lambda c: c.created_at)
        return comments

    async def update_comment(
        self, space_id: str, comment_id: str, user_id: str, new_text: str
    ) -> Optional[CommentModel]:
        """Update a comment. Only the author can update."""
        # First verify ownership
        item = self.db.get_item(
            pk=f"SPACE#{space_id}",
            sk=f"COMMENT#{comment_id}"
        )

        if not item:
            return None

        comment = self._item_to_comment(item)
        if comment.author != user_id:
            return None

        # Update the comment
        now = datetime.utcnow().isoformat()
        self.db.update_item(
            pk=f"SPACE#{space_id}",
            sk=f"COMMENT#{comment_id}",
            updates={
                "text": new_text,
                "updatedAt": now,
                "isEdited": True,
            }
        )

        comment.text = new_text
        comment.updated_at = now
        comment.is_edited = True
        return comment

    async def delete_comment(self, space_id: str, comment_id: str, user_id: str) -> bool:
        """Delete a comment. Only the author can delete."""
        # First verify ownership and get highlight_id
        item = self.db.get_item(
            pk=f"SPACE#{space_id}",
            sk=f"COMMENT#{comment_id}"
        )

        if not item:
            return False

        comment = self._item_to_comment(item)
        if comment.author != user_id:
            return False

        # Delete the comment
        self.db.delete_item(
            pk=f"SPACE#{space_id}",
            sk=f"COMMENT#{comment_id}"
        )

        # Decrement comment count on highlight
        await self.highlight_service.decrement_comment_count(space_id, comment.highlight_id)

        return True

    def _item_to_comment(self, item: dict) -> CommentModel:
        """Convert DynamoDB item to CommentModel."""
        return CommentModel(
            id=item["id"],
            highlightId=item["highlightId"],
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
