"""
Chat Mode Detection Service

Determines whether the chat user is the journal author or a supporter
based on journal ownership analysis within the space.

Mode Selection Logic:
- If >= 50% of retrieved journals are authored by current user -> AUTHOR MODE
- Otherwise -> SUPPORTER MODE (helping them understand someone else)
"""

import logging
from typing import List, Dict, Any, Optional
from collections import Counter

from app.models.chat import ChatMode, ChatContext

logger = logging.getLogger(__name__)

# Threshold for author mode (50% = user authored at least half the journals)
AUTHOR_MODE_THRESHOLD = 0.5


def detect_chat_mode(
    current_user_id: str,
    journals: List[Dict[str, Any]],
    author_threshold: float = AUTHOR_MODE_THRESHOLD,
) -> ChatContext:
    """
    Detect chat mode based on journal authorship.

    Analyzes the retrieved journals to determine if the current user
    is primarily viewing their own content (author mode) or someone
    else's content (supporter mode).

    Args:
        current_user_id: The ID of the user initiating the chat
        journals: List of journal search results with userId field
        author_threshold: Percentage threshold for author mode (default 50%)

    Returns:
        ChatContext with mode and author information
    """
    if not current_user_id:
        logger.warning("[CHAT_MODE] No user ID provided, defaulting to author mode")
        return ChatContext(
            mode=ChatMode.AUTHOR,
            primary_author_id=None,
            primary_author_name=None,
            author_percentage=1.0,
        )

    if not journals:
        # No journals found - default to author mode (personal space, new user, etc.)
        logger.info(
            "[CHAT_MODE] No journals found for mode detection, defaulting to AUTHOR"
        )
        return ChatContext(
            mode=ChatMode.AUTHOR,
            primary_author_id=current_user_id,
            primary_author_name=None,
            author_percentage=1.0,
        )

    # Count journals by author
    author_counts: Counter = Counter()

    for journal in journals:
        # Handle various field naming conventions
        author_id = (
            journal.get("userId")
            or journal.get("user_id")
            or journal.get("metadata", {}).get("userId")
        )
        if author_id:
            author_counts[author_id] += 1

    total_journals = sum(author_counts.values())

    if total_journals == 0:
        logger.info("[CHAT_MODE] No authors found in journals, defaulting to AUTHOR")
        return ChatContext(
            mode=ChatMode.AUTHOR,
            primary_author_id=current_user_id,
            primary_author_name=None,
            author_percentage=1.0,
        )

    # Calculate current user's authorship percentage
    user_journal_count = author_counts.get(current_user_id, 0)
    author_percentage = user_journal_count / total_journals

    # Find primary author (most frequent)
    primary_author_id, _ = author_counts.most_common(1)[0]

    # Determine mode based on threshold
    if author_percentage >= author_threshold:
        mode = ChatMode.AUTHOR
        logger.info(
            f"[CHAT_MODE] User {current_user_id[:8]}... is AUTHOR "
            f"({author_percentage:.0%} of {total_journals} journals)"
        )
    else:
        mode = ChatMode.SUPPORTER
        logger.info(
            f"[CHAT_MODE] User {current_user_id[:8]}... is SUPPORTER "
            f"(authored {author_percentage:.0%}, primary author: "
            f"{primary_author_id[:8]}...)"
        )

    return ChatContext(
        mode=mode,
        primary_author_id=primary_author_id,
        primary_author_name=None,  # Will be populated separately
        author_percentage=round(author_percentage, 3),
    )


async def get_author_display_name(
    author_id: str,
    dynamodb_table,
) -> Optional[str]:
    """
    Fetch author's display name from user profile.

    Args:
        author_id: User ID of the author
        dynamodb_table: DynamoDB table resource

    Returns:
        Display name if found, None otherwise
    """
    if not author_id:
        return None

    try:
        response = dynamodb_table.get_item(
            Key={"PK": f"USER#{author_id}", "SK": "PROFILE"}
        )

        if "Item" in response:
            item = response["Item"]
            # Try various field names for display name
            name = (
                item.get("display_name")
                or item.get("displayName")
                or item.get("username")
                or item.get("name")
            )
            if name:
                logger.debug(f"[CHAT_MODE] Found author name: {name}")
                return name

    except Exception as e:
        logger.warning(f"[CHAT_MODE] Failed to get author name for {author_id}: {e}")

    return None


def get_mode_description(mode: ChatMode, author_name: Optional[str] = None) -> str:
    """
    Get a human-readable description of the chat mode.

    Useful for logging and debugging.
    """
    if mode == ChatMode.AUTHOR:
        return "Self-reflection mode (viewing own journals)"
    else:
        name = author_name or "another user"
        return f"Supporter mode (viewing {name}'s journals)"
