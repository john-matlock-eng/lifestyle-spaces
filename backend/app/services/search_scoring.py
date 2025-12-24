"""
Search Scoring Utilities

Provides hybrid scoring that combines semantic similarity with recency.
This allows recent journals to naturally surface higher while still
finding relevant older content when the semantic match is strong.

Scoring Formula:
    final_score = (semantic_score * semantic_weight) + (recency_score * recency_weight)

Where:
    - semantic_score: 0.0-1.0 from vector similarity search
    - recency_score: 0.0-1.0 based on age (1.0 = today, 0.0 = max_age_days old)
    - Default weights: semantic=0.7, recency=0.3
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


def calculate_recency_score(
    created_at: Optional[str],
    max_age_days: int = 365,
    reference_date: Optional[datetime] = None,
) -> float:
    """
    Calculate a recency score for a journal entry.

    The score decays linearly from 1.0 (today) to 0.0 (max_age_days old).
    Entries older than max_age_days receive a score of 0.0.

    Args:
        created_at: ISO format date string of entry creation
        max_age_days: Entries older than this get 0 recency score (default: 365)
        reference_date: Reference point for age calculation (default: now)

    Returns:
        Score between 0.0 (old/missing date) and 1.0 (very recent)

    Examples:
        - Today's entry: 1.0
        - 1 week old (7 days): ~0.98 (with 365 day max)
        - 6 months old (182 days): ~0.50
        - 1 year old (365 days): 0.0
        - 2 years old: 0.0
    """
    if not created_at:
        return 0.0

    try:
        # Use provided reference or current time
        ref = reference_date or datetime.now(timezone.utc)

        # Parse the created_at date
        # Handle various ISO formats
        if isinstance(created_at, str):
            # Remove 'Z' suffix and handle timezone
            date_str = created_at.replace('Z', '+00:00')

            # Handle date-only format (YYYY-MM-DD)
            if len(date_str) == 10:
                date_str = f"{date_str}T00:00:00+00:00"

            entry_date = datetime.fromisoformat(date_str)
        else:
            # Already a datetime
            entry_date = created_at

        # Ensure timezone awareness
        if entry_date.tzinfo is None:
            entry_date = entry_date.replace(tzinfo=timezone.utc)
        if ref.tzinfo is None:
            ref = ref.replace(tzinfo=timezone.utc)

        # Calculate days old
        days_old = (ref - entry_date).days

        # Handle future dates (shouldn't happen, but be safe)
        if days_old < 0:
            return 1.0

        # At or beyond max age
        if days_old >= max_age_days:
            return 0.0

        # Linear decay
        score = 1.0 - (days_old / max_age_days)
        return round(score, 4)

    except (ValueError, TypeError, AttributeError) as e:
        logger.debug(f"Could not parse date '{created_at}': {e}")
        return 0.0


def apply_recency_boost(
    results: List[Dict[str, Any]],
    semantic_weight: float = 0.7,
    recency_weight: float = 0.3,
    max_age_days: int = 365,
    score_field: str = "topScore",
    date_field: str = "createdAt",
    reference_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    Apply recency boosting to search results.

    Combines the semantic similarity score with a recency score to produce
    a hybrid ranking that prefers recent content while respecting relevance.

    Args:
        results: List of search results with score and date fields
        semantic_weight: Weight for semantic similarity (0-1, default 0.7)
        recency_weight: Weight for recency (0-1, default 0.3)
        max_age_days: Max age for recency calculation (default 365)
        score_field: Field name containing semantic score (default "topScore")
        date_field: Field name containing creation date (default "createdAt")
        reference_date: Reference date for age calculation (default: now)

    Returns:
        Results list with updated scores, re-sorted by hybrid score (descending)

    Note:
        - Original scores are preserved in 'semanticScore' field
        - Recency scores are stored in 'recencyScore' field
        - The 'score' or score_field is updated with the hybrid score
    """
    if not results:
        return results

    # Validate weights
    if abs(semantic_weight + recency_weight - 1.0) > 0.001:
        logger.warning(
            f"Weights sum to {semantic_weight + recency_weight}, not 1.0. "
            "Results may not be as expected."
        )

    # Process each result
    for result in results:
        # Get semantic score (try multiple field names)
        semantic_score = (
            result.get(score_field)
            or result.get("score")
            or result.get("topScore")
            or 0.0
        )

        # Ensure it's a float
        if isinstance(semantic_score, (int, float)):
            semantic_score = float(semantic_score)
        else:
            semantic_score = 0.0

        # Get creation date
        created_at = result.get(date_field) or result.get("createdAt")

        # Calculate recency score
        recency_score = calculate_recency_score(
            created_at=created_at,
            max_age_days=max_age_days,
            reference_date=reference_date,
        )

        # Store component scores for transparency/debugging
        result["semanticScore"] = round(semantic_score, 4)
        result["recencyScore"] = recency_score

        # Calculate hybrid score
        hybrid_score = (semantic_score * semantic_weight) + (recency_score * recency_weight)

        # Update the score field(s)
        result["score"] = round(hybrid_score, 4)
        if score_field != "score":
            result[score_field] = round(hybrid_score, 4)

    # Re-sort by hybrid score (descending)
    sorted_results = sorted(
        results,
        key=lambda x: x.get("score", 0),
        reverse=True
    )

    logger.debug(
        f"Applied recency boost to {len(results)} results "
        f"(semantic={semantic_weight}, recency={recency_weight})"
    )

    return sorted_results


def get_recency_tier(
    created_at: Optional[str], reference_date: Optional[datetime] = None
) -> str:
    """
    Get a human-readable recency tier for a date.

    Useful for UI display and debugging.

    Args:
        created_at: ISO format date string
        reference_date: Reference point (default: now)

    Returns:
        One of: "today", "this_week", "this_month", "recent", "older"
    """
    if not created_at:
        return "unknown"

    try:
        ref = reference_date or datetime.now(timezone.utc)

        date_str = created_at.replace('Z', '+00:00')
        if len(date_str) == 10:
            date_str = f"{date_str}T00:00:00+00:00"

        entry_date = datetime.fromisoformat(date_str)

        if entry_date.tzinfo is None:
            entry_date = entry_date.replace(tzinfo=timezone.utc)
        if ref.tzinfo is None:
            ref = ref.replace(tzinfo=timezone.utc)

        days_old = (ref - entry_date).days

        if days_old < 0:
            return "future"  # Shouldn't happen
        elif days_old == 0:
            return "today"
        elif days_old <= 7:
            return "this_week"
        elif days_old <= 30:
            return "this_month"
        elif days_old <= 90:
            return "recent"
        else:
            return "older"

    except (ValueError, TypeError, AttributeError):
        return "unknown"
