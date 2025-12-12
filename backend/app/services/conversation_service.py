"""
Service layer for Conversations aggregation feature.
Handles thread-level conversation data across journals in a space.

Per-Thread Read Status:
- Each thread (highlight or journal discussion) has its own read status
- Stored as: PK=USER#{user_id}, SK=THREAD_READ#{space_id}#{thread_id}
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional, Set, Dict
import logging
import os

import boto3
from boto3.dynamodb.conditions import Key

from app.core.database import get_db
from app.models.conversation import (
    ConversationThread,
    ThreadsResponse,
    UnreadCountResponse,
    # Legacy models for backwards compatibility
    ConversationModel,
    ConversationsResponse,
)
from app.models.read_status import (
    ThreadReadStatus,
    thread_read_status_to_db_item,
    db_item_to_thread_read_status,
    # Legacy - kept for backwards compatibility
    ReadStatusModel,
    read_status_to_db_item,
    db_item_to_read_status,
)

logger = logging.getLogger(__name__)


class ConversationService:
    """Service for thread-level conversation data across a space."""

    def __init__(self):
        self.db = get_db()
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

    # ========================================================================
    # PER-THREAD READ STATUS
    # ========================================================================

    def _get_thread_read_status(
        self, user_id: str, space_id: str, thread_id: str
    ) -> Optional[ThreadReadStatus]:
        """Get user's read status for a specific thread."""
        try:
            item = self.db.get_item(
                pk=f"USER#{user_id}",
                sk=f"THREAD_READ#{space_id}#{thread_id}"
            )
            if item:
                return db_item_to_thread_read_status(item)
            return None
        except Exception as e:
            logger.warning(f"Failed to get thread read status: {e}")
            return None

    def _get_all_thread_read_statuses(
        self, user_id: str, space_id: str
    ) -> Dict[str, ThreadReadStatus]:
        """Get all thread read statuses for a user in a space."""
        try:
            items = self.db.query(
                pk=f"USER#{user_id}",
                sk_prefix=f"THREAD_READ#{space_id}#"
            )

            statuses = {}
            for item in items:
                if item.get("EntityType") == "ThreadReadStatus":
                    status = db_item_to_thread_read_status(item)
                    statuses[status.thread_id] = status

            return statuses
        except Exception as e:
            logger.warning(f"Failed to get thread read statuses: {e}")
            return {}

    def _set_thread_read_status(
        self,
        user_id: str,
        space_id: str,
        thread_id: str,
        thread_type: str,
        journal_id: str,
        comment_count: int = 0,
    ) -> bool:
        """Set/update read status for a specific thread."""
        try:
            now = datetime.now(timezone.utc).isoformat()

            status = ThreadReadStatus(
                userId=user_id,
                spaceId=space_id,
                threadId=thread_id,
                threadType=thread_type,
                journalId=journal_id,
                lastReadAt=now,
                lastCommentCount=comment_count,
            )

            item = thread_read_status_to_db_item(status)
            self.db.put_item(item)

            logger.info(
                f"Thread read status saved: user={user_id}, thread={thread_id}, "
                f"type={thread_type}, comments={comment_count}"
            )
            return True
        except Exception as e:
            logger.error(f"Failed to set thread read status: {e}")
            return False

    def _normalize_timestamp(self, ts: Optional[str]) -> str:
        """Normalize timestamp for consistent comparison."""
        if not ts:
            return ""
        # Ensure timezone suffix for consistent comparison
        if not ts.endswith('Z') and '+' not in ts and '-' not in ts[10:]:
            return ts + 'Z'
        return ts

    # ========================================================================
    # DATA FETCHING
    # ========================================================================

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

    def _get_highlight_comments(self, highlight_id: str) -> List[dict]:
        """Get all comments for a specific highlight."""
        items = self.db.query(pk=f"HIGHLIGHT#{highlight_id}", index_name="GSI1")
        return [item for item in items if item.get("EntityType") == "Comment"]

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

    def _get_user_info(self, user_id: str) -> dict:
        """Get user display name from user profile."""
        try:
            item = self.db.get_item(pk=f"USER#{user_id}", sk="PROFILE")
            if item:
                return {
                    "user_id": user_id,
                    "display_name": item.get("displayName", item.get("display_name", "Unknown")),
                }
        except Exception as e:
            logger.warning(f"Failed to get user info for {user_id}: {e}")
        return {"user_id": user_id, "display_name": "Unknown"}

    def _build_highlight_thread(
        self,
        highlight: dict,
        journal: dict,
        user_id: str,
        read_status: Optional[ThreadReadStatus],
        user_info_cache: Dict[str, dict],
    ) -> Optional[ConversationThread]:
        """Build a ConversationThread from a highlight and its comments."""
        highlight_id = highlight.get("id", highlight.get("highlightId"))
        if not highlight_id:
            return None

        # Get comments for this highlight
        comments = self._get_highlight_comments(highlight_id)

        # Skip highlights with no comments (no conversation)
        if not comments:
            return None

        # Sort comments by time
        comments.sort(key=lambda c: c.get("createdAt", ""))

        # Build participant tracking
        participants: List[str] = []
        participant_ids: List[str] = []
        user_participated = False
        user_last_comment: Optional[str] = None
        has_reply_to_user = False

        for comment in comments:
            author_id = comment.get("authorId", comment.get("author", comment.get("userId", "")))
            author_name = comment.get("authorName", "Unknown")

            if author_id and author_id not in participant_ids:
                participant_ids.append(author_id)
                participants.append(author_name)

            if author_id == user_id:
                user_participated = True
                user_last_comment = comment.get("createdAt")
            elif user_last_comment and comment.get("createdAt", "") > user_last_comment:
                # Someone else commented after user's last comment
                has_reply_to_user = True

        # Latest comment for preview
        latest_comment = comments[-1] if comments else None

        # Determine unread status using per-thread tracking
        last_read_at = self._normalize_timestamp(
            read_status.last_read_at if read_status else None
        )
        unread_count = 0
        is_unread = False

        if last_read_at:
            for c in comments:
                comment_time = self._normalize_timestamp(c.get("createdAt", ""))
                if comment_time > last_read_at:
                    unread_count += 1
                    is_unread = True
        else:
            # Never read - all are unread
            unread_count = len(comments)
            is_unread = len(comments) > 0

        # Highlight creator info
        creator_id = highlight.get("createdBy", highlight.get("userId", ""))
        user_started = creator_id == user_id

        # Get journal author info
        journal_author_id = journal.get("user_id", "")
        if journal_author_id not in user_info_cache:
            user_info_cache[journal_author_id] = self._get_user_info(journal_author_id)
        journal_author_info = user_info_cache[journal_author_id]

        # Get latest activity time from comments
        last_activity = (
            latest_comment.get("createdAt", "")
            if latest_comment
            else highlight.get("createdAt", "")
        )

        return ConversationThread(
            threadId=highlight_id,
            threadType="highlight",
            journalId=journal.get("journal_id", ""),
            journalTitle=journal.get("title", "Untitled"),
            journalAuthorId=journal_author_id,
            journalAuthorName=journal_author_info["display_name"],
            highlightText=highlight.get("highlightedText", highlight.get("text", ""))[:100],
            highlightColor=highlight.get("color"),
            lastActivity=last_activity,
            createdAt=highlight.get("createdAt", ""),
            commentCount=len(comments),
            participants=participants[:5],
            participantIds=participant_ids[:5],
            userParticipated=user_participated,
            userStarted=user_started,
            userLastSeen=last_read_at if last_read_at else None,
            userLastComment=user_last_comment,
            isUnread=is_unread,
            unreadCount=unread_count,
            hasReplyToUser=has_reply_to_user,
            latestCommentText=latest_comment.get("text", "")[:100] if latest_comment else None,
            latestCommentAuthor=latest_comment.get("authorName") if latest_comment else None,
            latestCommentAuthorId=latest_comment.get("authorId", latest_comment.get("author")) if latest_comment else None,
            latestCommentTime=latest_comment.get("createdAt") if latest_comment else None,
        )

    def _build_journal_discussion_thread(
        self,
        journal: dict,
        comments: List[dict],
        user_id: str,
        read_status: Optional[ThreadReadStatus],
        user_info_cache: Dict[str, dict],
    ) -> Optional[ConversationThread]:
        """Build a ConversationThread for journal-level discussion."""
        if not comments:
            return None

        journal_id = journal.get("journal_id", "")
        thread_id = f"journal-discussion-{journal_id}"

        # Sort comments by time
        comments = sorted(comments, key=lambda c: c.get("createdAt", ""))

        # Build participant tracking
        participants: List[str] = []
        participant_ids: List[str] = []
        user_participated = False
        user_last_comment: Optional[str] = None
        has_reply_to_user = False

        for comment in comments:
            author_id = comment.get("authorId", comment.get("author", comment.get("userId", "")))
            author_name = comment.get("authorName", "Unknown")

            if author_id and author_id not in participant_ids:
                participant_ids.append(author_id)
                participants.append(author_name)

            if author_id == user_id:
                user_participated = True
                user_last_comment = comment.get("createdAt")
            elif user_last_comment and comment.get("createdAt", "") > user_last_comment:
                has_reply_to_user = True

        # Latest comment for preview
        latest_comment = comments[-1] if comments else None

        # Determine unread status using per-thread tracking
        last_read_at = self._normalize_timestamp(
            read_status.last_read_at if read_status else None
        )
        unread_count = 0
        is_unread = False

        if last_read_at:
            for c in comments:
                comment_time = self._normalize_timestamp(c.get("createdAt", ""))
                if comment_time > last_read_at:
                    unread_count += 1
                    is_unread = True
        else:
            unread_count = len(comments)
            is_unread = len(comments) > 0

        # Journal author info
        journal_author_id = journal.get("user_id", "")
        if journal_author_id not in user_info_cache:
            user_info_cache[journal_author_id] = self._get_user_info(journal_author_id)
        journal_author_info = user_info_cache[journal_author_id]

        # User started = user is the journal author (started the discussion context)
        user_started = journal_author_id == user_id

        # Last activity is the latest comment time
        last_activity = (
            latest_comment.get("createdAt", "")
            if latest_comment
            else journal.get("createdAt", "")
        )

        # Created at is the first comment time (when discussion started)
        created_at = comments[0].get("createdAt", "") if comments else journal.get("createdAt", "")

        return ConversationThread(
            threadId=thread_id,
            threadType="journal_discussion",
            journalId=journal_id,
            journalTitle=journal.get("title", "Untitled"),
            journalAuthorId=journal_author_id,
            journalAuthorName=journal_author_info["display_name"],
            highlightText=None,
            highlightColor=None,
            lastActivity=last_activity,
            createdAt=created_at,
            commentCount=len(comments),
            participants=participants[:5],
            participantIds=participant_ids[:5],
            userParticipated=user_participated,
            userStarted=user_started,
            userLastSeen=last_read_at if last_read_at else None,
            userLastComment=user_last_comment,
            isUnread=is_unread,
            unreadCount=unread_count,
            hasReplyToUser=has_reply_to_user,
            latestCommentText=latest_comment.get("text", "")[:100] if latest_comment else None,
            latestCommentAuthor=latest_comment.get("authorName") if latest_comment else None,
            latestCommentAuthorId=latest_comment.get("authorId", latest_comment.get("author")) if latest_comment else None,
            latestCommentTime=latest_comment.get("createdAt") if latest_comment else None,
        )

    async def get_conversation_threads(
        self,
        space_id: str,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        sort_by: str = "recent",
        filter_type: Optional[str] = None,  # "highlight", "journal_discussion", or None for all
        filter_participation: Optional[str] = None,  # "participated", "unread", or None for all
        time_filter: Optional[str] = None,  # "today", "week", "month", or None for all
        search: Optional[str] = None,
    ) -> ThreadsResponse:
        """
        Get thread-level conversation data for a space.

        Args:
            space_id: Space ID
            user_id: User requesting the data
            limit: Maximum threads to return
            offset: Skip this many threads (for pagination)
            sort_by: "recent", "unread", "replies" (threads with replies to user)
            filter_type: Filter by thread type
            filter_participation: Filter by participation ("participated") or unread ("unread")
            time_filter: Filter by time period ("today", "week", "month")
            search: Search query for highlight text, journal title, or comment text

        Returns:
            ThreadsResponse with thread-level data
        """
        # Calculate time filter cutoff
        time_cutoff: Optional[str] = None
        if time_filter:
            now = datetime.now(timezone.utc)
            if time_filter == "today":
                cutoff = now - timedelta(days=1)
            elif time_filter == "week":
                cutoff = now - timedelta(days=7)
            elif time_filter == "month":
                cutoff = now - timedelta(days=30)
            else:
                cutoff = None
            if cutoff:
                time_cutoff = cutoff.isoformat()

        journals = self._get_journals_for_space(space_id)

        # Get all read statuses for this user/space at once (efficiency)
        all_read_statuses = self._get_all_thread_read_statuses(user_id, space_id)

        threads: List[ConversationThread] = []
        total_unread = 0
        threads_with_replies = 0
        user_info_cache: Dict[str, dict] = {}
        search_lower = search.lower() if search else None

        for journal in journals:
            journal_id = journal.get("journal_id")
            if not journal_id:
                continue

            # Build highlight threads
            if filter_type is None or filter_type == "highlight":
                highlights = self._get_highlights_for_journal(journal_id, space_id)
                for highlight in highlights:
                    highlight_id = highlight.get("id", highlight.get("highlightId"))
                    if not highlight_id:
                        continue

                    # Get per-thread read status
                    read_status = all_read_statuses.get(highlight_id)

                    thread = self._build_highlight_thread(
                        highlight, journal, user_id, read_status, user_info_cache
                    )
                    if thread:
                        # Apply participation filter
                        if filter_participation == "participated" and not thread.user_participated:
                            continue
                        # Apply unread filter
                        if filter_participation == "unread" and not thread.is_unread:
                            continue
                        # Apply time filter
                        if time_cutoff and thread.last_activity < time_cutoff:
                            continue
                        # Apply search filter
                        if search_lower:
                            searchable = " ".join([
                                thread.highlight_text or "",
                                thread.journal_title or "",
                                thread.latest_comment_text or "",
                            ]).lower()
                            if search_lower not in searchable:
                                continue
                        threads.append(thread)
                        total_unread += thread.unread_count
                        if thread.has_reply_to_user:
                            threads_with_replies += 1

            # Build journal discussion thread
            if filter_type is None or filter_type == "journal_discussion":
                journal_comments = self._get_journal_comments(journal_id, space_id)
                thread_id = f"journal-discussion-{journal_id}"

                # Get per-thread read status
                read_status = all_read_statuses.get(thread_id)

                thread = self._build_journal_discussion_thread(
                    journal, journal_comments, user_id, read_status, user_info_cache
                )
                if thread:
                    # Apply participation filter
                    if filter_participation == "participated" and not thread.user_participated:
                        continue
                    # Apply unread filter
                    if filter_participation == "unread" and not thread.is_unread:
                        continue
                    # Apply time filter
                    if time_cutoff and thread.last_activity < time_cutoff:
                        continue
                    # Apply search filter
                    if search_lower:
                        searchable = " ".join([
                            thread.journal_title or "",
                            thread.latest_comment_text or "",
                        ]).lower()
                        if search_lower not in searchable:
                            continue
                    threads.append(thread)
                    total_unread += thread.unread_count
                    if thread.has_reply_to_user:
                        threads_with_replies += 1

        # Sort threads
        if sort_by == "unread":
            # Unread first, then by recent
            threads.sort(key=lambda t: (-t.unread_count, t.last_activity), reverse=True)
        elif sort_by == "replies":
            # Threads with replies to user first
            threads.sort(key=lambda t: (t.has_reply_to_user, t.last_activity), reverse=True)
        else:
            # Default: most recent activity first
            threads.sort(key=lambda t: t.last_activity, reverse=True)

        # Calculate total before pagination
        total_count = len(threads)
        has_more = offset + limit < total_count

        # Apply pagination
        threads = threads[offset:offset + limit]

        return ThreadsResponse(
            threads=threads,
            totalUnread=total_unread,
            threadsWithReplies=threads_with_replies,
            totalCount=total_count,
            hasMore=has_more,
            nextToken=None,
        )

    async def mark_thread_as_read(
        self,
        user_id: str,
        space_id: str,
        thread_id: str,
        thread_type: str,
    ) -> bool:
        """
        Mark a specific thread as read using per-thread tracking.

        Each thread gets its own read status entry:
        PK=USER#{user_id}, SK=THREAD_READ#{space_id}#{thread_id}
        """
        journal_id: str = ""
        comment_count: int = 0

        if thread_type == "journal_discussion":
            # Extract journal_id from thread_id format: "journal-discussion-{journal_id}"
            journal_id = thread_id.replace("journal-discussion-", "")

            # Get current comment count
            comments = self._get_journal_comments(journal_id, space_id)
            comment_count = len(comments)
        else:
            # For highlights, look up the highlight to get its journal_id
            # Highlights are stored with PK=SPACE#{space_id}, SK=HIGHLIGHT#{highlight_id}
            highlight = self.db.get_item(
                pk=f"SPACE#{space_id}",
                sk=f"HIGHLIGHT#{thread_id}"
            )

            if highlight:
                journal_id = highlight.get("journalEntryId", "")
                # Get current comment count
                comments = self._get_highlight_comments(thread_id)
                comment_count = len(comments)
            else:
                logger.warning(f"Could not find highlight {thread_id} in space {space_id}")
                return False

        if not journal_id:
            logger.warning(f"No journal_id found for thread {thread_id}")
            return False

        return self._set_thread_read_status(
            user_id=user_id,
            space_id=space_id,
            thread_id=thread_id,
            thread_type=thread_type,
            journal_id=journal_id,
            comment_count=comment_count,
        )

    async def mark_all_as_read(self, user_id: str, space_id: str) -> int:
        """
        Mark all threads in a space as read using per-thread tracking.

        Returns the number of threads marked as read.
        """
        # Get all threads first
        response = await self.get_conversation_threads(
            space_id=space_id,
            user_id=user_id,
            limit=1000,  # Get all
            offset=0,
        )

        marked_count = 0
        for thread in response.threads:
            if thread.is_unread:
                success = await self.mark_thread_as_read(
                    user_id=user_id,
                    space_id=space_id,
                    thread_id=thread.thread_id,
                    thread_type=thread.thread_type,
                )
                if success:
                    marked_count += 1

        return marked_count

    # ========== Legacy methods for backwards compatibility ==========

    def _get_latest_activity(
        self, journal: dict, highlights: List[dict], journal_comments: List[dict]
    ) -> dict:
        """Get info about the most recent activity on a journal."""
        activities = []

        journal_ts = journal.get("updatedAt", journal.get("created_at", ""))
        if journal_ts:
            activities.append({
                "timestamp": journal_ts,
                "activity_type": "highlight",
                "highlight_id": None,
            })

        for h in highlights:
            highlight_id = h.get("id", h.get("highlightId"))
            h_ts = h.get("updatedAt", h.get("createdAt", ""))
            comment_count = h.get("commentCount", 0)
            if h_ts:
                activities.append({
                    "timestamp": h_ts,
                    "activity_type": "highlight_comment" if comment_count > 0 else "highlight",
                    "highlight_id": highlight_id,
                })

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
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "activity_type": "highlight",
                "highlight_id": None,
            }

        activities.sort(key=lambda a: a["timestamp"], reverse=True)
        return activities[0]

    def _get_participants(self, highlights: List[dict], journal_comments: List[dict]) -> List[str]:
        """Get unique participant names."""
        participants: Set[str] = set()
        for h in highlights:
            name = h.get("createdByName")
            if name:
                participants.add(name)
        for c in journal_comments:
            name = c.get("authorName")
            if name:
                participants.add(name)
        return list(participants)[:5]

    def _get_preview_text(self, journal_comments: List[dict]) -> Optional[str]:
        """Get preview text from the most recent journal comment."""
        if not journal_comments:
            return None
        sorted_comments = sorted(journal_comments, key=lambda c: c.get("createdAt", ""), reverse=True)
        text = sorted_comments[0].get("text", "")
        return text[:97] + "..." if len(text) > 100 else text

    def _calculate_unread_count(
        self,
        highlights: List[dict],
        journal_comments: List[dict],
        read_status: Optional[ReadStatusModel],
    ) -> int:
        """Calculate unread comments count."""
        if not read_status:
            highlight_comment_count = sum(h.get("commentCount", 0) for h in highlights)
            return highlight_comment_count + len(journal_comments)

        unread = 0
        last_read_highlight = read_status.last_read_highlight_comment_at
        if last_read_highlight:
            for h in highlights:
                if h.get("updatedAt", h.get("createdAt", "")) > last_read_highlight:
                    unread += h.get("commentCount", 0)
        else:
            unread += sum(h.get("commentCount", 0) for h in highlights)

        last_read_journal = read_status.last_read_journal_comment_at
        if last_read_journal:
            for c in journal_comments:
                if c.get("createdAt", "") > last_read_journal:
                    unread += 1
        else:
            unread += len(journal_comments)

        return unread

    async def get_space_conversations(
        self, space_id: str, user_id: str, limit: int = 20, sort_by: str = "recent_activity"
    ) -> ConversationsResponse:
        """DEPRECATED: Legacy method for journal-level aggregation."""
        journals = self._get_journals_for_space(space_id)
        conversations = []
        total_unread = 0

        for journal in journals:
            journal_id = journal.get("journal_id")
            if not journal_id:
                continue

            highlights = self._get_highlights_for_journal(journal_id, space_id)
            highlight_count = len(highlights)
            highlight_comment_count = sum(h.get("commentCount", 0) for h in highlights)

            journal_comments = self._get_journal_comments(journal_id, space_id)
            journal_comment_count = len(journal_comments)

            if highlight_count == 0 and journal_comment_count == 0:
                continue

            read_status = self._get_user_read_status(user_id, space_id, journal_id)
            unread_count = self._calculate_unread_count(highlights, journal_comments, read_status)
            total_unread += unread_count

            activity_info = self._get_latest_activity(journal, highlights, journal_comments)
            author_info = self._get_user_info(journal.get("user_id", ""))
            participants = self._get_participants(highlights, journal_comments)
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

        if sort_by == "unread":
            conversations.sort(key=lambda c: (-c.unread_count, c.last_activity), reverse=True)
        else:
            conversations.sort(key=lambda c: c.last_activity, reverse=True)

        return ConversationsResponse(
            conversations=conversations[:limit],
            totalUnread=total_unread,
            nextToken=None,
        )

    async def mark_journal_as_read(
        self,
        user_id: str,
        space_id: str,
        journal_id: str,
        mark_highlight_comments: bool = True,
        mark_journal_comments: bool = True,
    ) -> bool:
        """Mark a journal as read for a user."""
        now = datetime.now(timezone.utc).isoformat()
        existing = self._get_user_read_status(user_id, space_id, journal_id)

        status = ReadStatusModel(
            userId=user_id,
            spaceId=space_id,
            journalId=journal_id,
            lastReadHighlightCommentAt=now if mark_highlight_comments else (
                existing.last_read_highlight_comment_at if existing else None
            ),
            lastReadJournalCommentAt=now if mark_journal_comments else (
                existing.last_read_journal_comment_at if existing else None
            ),
        )

        item = read_status_to_db_item(status)
        self.db.put_item(item)
        return True

    async def get_unread_count(self, user_id: str, space_id: str) -> UnreadCountResponse:
        """Get total unread count for a user in a space."""
        # Use the new thread-based method for accuracy
        threads_response = await self.get_conversation_threads(space_id, user_id)

        return UnreadCountResponse(
            totalUnread=threads_response.total_unread,
            threadsWithReplies=threads_response.threads_with_replies,
            spaceId=space_id,
        )


# Singleton
_conversation_service: Optional[ConversationService] = None


def get_conversation_service() -> ConversationService:
    """Get or create the conversation service singleton."""
    global _conversation_service
    if _conversation_service is None:
        _conversation_service = ConversationService()
    return _conversation_service
