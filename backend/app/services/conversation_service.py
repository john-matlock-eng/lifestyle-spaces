"""
Service layer for Conversations aggregation feature.
Handles aggregating discussion data across journals in a space.
"""

from datetime import datetime
from typing import List, Optional, Set
import logging
import os

import boto3
from boto3.dynamodb.conditions import Key

from app.core.database import get_db
from app.models.conversation import (
    ConversationModel,
    ConversationsResponse,
    UnreadCountResponse,
)
from app.models.read_status import (
    ReadStatusModel,
    read_status_to_db_item,
    db_item_to_read_status,
)

logger = logging.getLogger(__name__)


class ConversationService:
    """Service for aggregating conversation/discussion data across a space."""

    def __init__(self):
        self.db = get_db()
        # Direct table access for complex queries
        aws_region = os.getenv("AWS_REGION", "us-east-1")
        self.table_name = os.getenv("DYNAMODB_TABLE", "lifestyle-spaces")
        dynamodb = boto3.resource("dynamodb", region_name=aws_region)
        self.table = dynamodb.Table(self.table_name)

    def is_space_member(self, space_id: str, user_id: str) -> bool:
        """Check if user is a member of the space."""
        try:
            item = self.db.get_item(pk=f"SPACE#{space_id}", sk=f"MEMBER#{user_id}")
            return item is not None
        except Exception:
            return False

    def _get_journals_for_space(self, space_id: str) -> List[dict]:
        """Get all journals in a space."""
        response = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"SPACE#{space_id}")
            & Key("SK").begins_with("JOURNAL#")
        )
        return response.get("Items", [])

    def _get_highlights_for_journal(self, journal_id: str, space_id: str) -> List[dict]:
        """Get all highlights for a journal."""
        items = self.db.query(pk=f"JOURNAL#{journal_id}", index_name="GSI1")
        return [
            item
            for item in items
            if item.get("EntityType") == "Highlight" and item.get("spaceId") == space_id
        ]

    def _get_journal_comments(self, journal_id: str, space_id: str) -> List[dict]:
        """Get all journal-level comments for a journal."""
        items = self.db.query(pk=f"JOURNAL#{journal_id}", index_name="GSI1")
        return [
            item
            for item in items
            if item.get("EntityType") == "JournalComment" and item.get("spaceId") == space_id
        ]

    def _get_user_read_status(
        self, user_id: str, space_id: str, journal_id: str
    ) -> Optional[ReadStatusModel]:
        """Get user's read status for a specific journal."""
        try:
            item = self.db.get_item(pk=f"USER#{user_id}", sk=f"READ_STATUS#{space_id}#{journal_id}")
            if item:
                return db_item_to_read_status(item)
            return None
        except Exception as e:
            logger.warning(f"Failed to get read status: {e}")
            return None

    def _get_author_info(self, user_id: str) -> dict:
        """Get author display name from user profile."""
        try:
            item = self.db.get_item(pk=f"USER#{user_id}", sk="PROFILE")
            if item:
                return {
                    "user_id": user_id,
                    "display_name": item.get("displayName", item.get("display_name", "Unknown")),
                }
        except Exception as e:
            logger.warning(f"Failed to get author info for {user_id}: {e}")
        return {"user_id": user_id, "display_name": "Unknown"}

    def _calculate_unread_count(
        self,
        highlights: List[dict],
        journal_comments: List[dict],
        read_status: Optional[ReadStatusModel],
    ) -> int:
        """Calculate unread comments count based on read status."""
        if not read_status:
            # User hasn't read anything - all comments are unread
            highlight_comment_count = sum(h.get("commentCount", 0) for h in highlights)
            return highlight_comment_count + len(journal_comments)

        unread = 0

        # Count unread highlight comments
        last_read_highlight = read_status.last_read_highlight_comment_at
        if last_read_highlight:
            for h in highlights:
                # For simplicity, if highlight was updated after last read, count all its comments
                # A more precise implementation would track individual comment timestamps
                if h.get("updatedAt", h.get("createdAt", "")) > last_read_highlight:
                    unread += h.get("commentCount", 0)
        else:
            unread += sum(h.get("commentCount", 0) for h in highlights)

        # Count unread journal comments
        last_read_journal = read_status.last_read_journal_comment_at
        if last_read_journal:
            for c in journal_comments:
                if c.get("createdAt", "") > last_read_journal:
                    unread += 1
        else:
            unread += len(journal_comments)

        return unread

    def _get_latest_activity(
        self, journal: dict, highlights: List[dict], journal_comments: List[dict]
    ) -> dict:
        """
        Get info about the most recent activity on a journal.

        Returns dict with:
            - timestamp: ISO timestamp of latest activity
            - activity_type: "highlight_comment", "journal_comment", or "highlight"
            - highlight_id: ID of the highlight (if activity was on a highlight)
        """
        # Track activities with their metadata
        activities = []

        # Journal itself (fallback)
        journal_ts = journal.get("updatedAt", journal.get("created_at", ""))
        if journal_ts:
            activities.append({
                "timestamp": journal_ts,
                "activity_type": "highlight",  # Journal update counts as general activity
                "highlight_id": None,
            })

        # Highlights and their comments
        for h in highlights:
            highlight_id = h.get("id", h.get("highlightId"))
            # Highlight has comments - use updatedAt which reflects comment activity
            h_ts = h.get("updatedAt", h.get("createdAt", ""))
            comment_count = h.get("commentCount", 0)
            if h_ts:
                activities.append({
                    "timestamp": h_ts,
                    "activity_type": "highlight_comment" if comment_count > 0 else "highlight",
                    "highlight_id": highlight_id,
                })

        # Journal-level comments
        for c in journal_comments:
            c_ts = c.get("createdAt", "")
            if c_ts:
                activities.append({
                    "timestamp": c_ts,
                    "activity_type": "journal_comment",
                    "highlight_id": None,
                })

        if not activities:
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "activity_type": "highlight",
                "highlight_id": None,
            }

        # Sort by timestamp descending and return the most recent
        activities.sort(key=lambda a: a["timestamp"], reverse=True)
        return activities[0]

    def _get_participants(self, highlights: List[dict], journal_comments: List[dict]) -> List[str]:
        """Get unique participant names from highlights and comments."""
        participants: Set[str] = set()

        for h in highlights:
            name = h.get("createdByName")
            if name:
                participants.add(name)

        for c in journal_comments:
            name = c.get("authorName")
            if name:
                participants.add(name)

        return list(participants)[:5]  # Limit to 5 participants

    def _get_preview_text(self, journal_comments: List[dict]) -> Optional[str]:
        """Get preview text from the most recent journal comment."""
        if not journal_comments:
            return None

        # Sort by createdAt descending
        sorted_comments = sorted(
            journal_comments, key=lambda c: c.get("createdAt", ""), reverse=True
        )
        latest = sorted_comments[0]
        text = latest.get("text", "")

        # Truncate if needed
        if len(text) > 100:
            return text[:97] + "..."
        return text

    async def get_space_conversations(
        self, space_id: str, user_id: str, limit: int = 20, sort_by: str = "recent_activity"
    ) -> ConversationsResponse:
        """
        Get aggregated conversation data for all journals in a space.

        Args:
            space_id: Space ID
            user_id: User requesting the data (for read status)
            limit: Maximum number of conversations to return
            sort_by: Sort order - 'recent_activity' or 'unread'

        Returns:
            ConversationsResponse with aggregated data
        """
        # Get all journals in the space
        journals = self._get_journals_for_space(space_id)

        conversations = []
        total_unread = 0

        for journal in journals:
            journal_id = journal.get("journal_id")
            if not journal_id:
                continue

            # Get highlights and their comment counts
            highlights = self._get_highlights_for_journal(journal_id, space_id)
            highlight_count = len(highlights)
            highlight_comment_count = sum(h.get("commentCount", 0) for h in highlights)

            # Get journal-level comments
            journal_comments = self._get_journal_comments(journal_id, space_id)
            journal_comment_count = len(journal_comments)

            # Skip journals with no activity (no highlights and no comments)
            if highlight_count == 0 and journal_comment_count == 0:
                continue

            # Get user's read status
            read_status = self._get_user_read_status(user_id, space_id, journal_id)

            # Calculate unread count
            unread_count = self._calculate_unread_count(highlights, journal_comments, read_status)
            total_unread += unread_count

            # Get latest activity info
            activity_info = self._get_latest_activity(journal, highlights, journal_comments)

            # Get author info
            author_info = self._get_author_info(journal.get("user_id", ""))

            # Get participants
            participants = self._get_participants(highlights, journal_comments)

            # Get preview text
            preview_text = self._get_preview_text(journal_comments)

            conversation = ConversationModel(
                journalId=journal_id,
                journalTitle=journal.get("title", "Untitled"),
                journalAuthor=journal.get("user_id", ""),
                journalAuthorName=author_info["display_name"],
                lastActivity=activity_info["timestamp"],
                lastActivityType=activity_info["activity_type"],
                lastActivityHighlightId=activity_info["highlight_id"],
                highlightCount=highlight_count,
                highlightCommentCount=highlight_comment_count,
                journalCommentCount=journal_comment_count,
                unreadCount=unread_count,
                participants=participants,
                previewText=preview_text,
            )
            conversations.append(conversation)

        # Sort conversations
        if sort_by == "unread":
            # Unread first, then by recent activity
            conversations.sort(key=lambda c: (-c.unread_count, c.last_activity), reverse=True)
        else:
            # Default: by most recent activity
            conversations.sort(key=lambda c: c.last_activity, reverse=True)

        # Apply limit
        conversations = conversations[:limit]

        return ConversationsResponse(
            conversations=conversations,
            totalUnread=total_unread,
            nextToken=None,  # Pagination not implemented yet
        )

    async def mark_journal_as_read(
        self,
        user_id: str,
        space_id: str,
        journal_id: str,
        mark_highlight_comments: bool = True,
        mark_journal_comments: bool = True,
    ) -> bool:
        """
        Mark a journal as read for a user.

        Args:
            user_id: User ID
            space_id: Space ID
            journal_id: Journal ID
            mark_highlight_comments: Whether to mark highlight comments as read
            mark_journal_comments: Whether to mark journal comments as read

        Returns:
            True if successful
        """
        now = datetime.utcnow().isoformat()

        # Get existing read status
        existing = self._get_user_read_status(user_id, space_id, journal_id)

        # Build updated status
        status = ReadStatusModel(
            userId=user_id,
            spaceId=space_id,
            journalId=journal_id,
            lastReadHighlightCommentAt=now
            if mark_highlight_comments
            else (existing.last_read_highlight_comment_at if existing else None),
            lastReadJournalCommentAt=now
            if mark_journal_comments
            else (existing.last_read_journal_comment_at if existing else None),
        )

        # Store in DynamoDB
        item = read_status_to_db_item(status)
        self.db.put_item(item)

        return True

    async def get_unread_count(self, user_id: str, space_id: str) -> UnreadCountResponse:
        """
        Get total unread comment count for a user in a space.

        Args:
            user_id: User ID
            space_id: Space ID

        Returns:
            UnreadCountResponse with total unread count
        """
        # Get conversations which calculates total unread
        conversations = await self.get_space_conversations(space_id, user_id)

        return UnreadCountResponse(
            totalUnread=conversations.total_unread,
            spaceId=space_id,
        )


# Singleton instance
_conversation_service: Optional[ConversationService] = None


def get_conversation_service() -> ConversationService:
    """Get or create the conversation service singleton."""
    global _conversation_service
    if _conversation_service is None:
        _conversation_service = ConversationService()
    return _conversation_service
