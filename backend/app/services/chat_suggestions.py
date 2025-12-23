"""
Chat Suggestions Service

Provides context-aware conversation starter suggestions based on chat mode.
- Author mode: Self-reflection focused prompts
- Supporter mode: Understanding and support focused prompts
"""

from typing import List, Dict, Optional
from app.models.chat import ChatMode


# =============================================================================
# AUTHOR MODE SUGGESTIONS
# Focused on self-reflection and personal growth
# =============================================================================

AUTHOR_SUGGESTIONS = [
    {
        "icon": "TrendingUp",
        "text": "What patterns do you see in my journals?",
        "category": "patterns",
    },
    {
        "icon": "Heart",
        "text": "What have I been grateful for lately?",
        "category": "gratitude",
    },
    {
        "icon": "Target",
        "text": "How am I progressing on my goals?",
        "category": "goals",
    },
    {
        "icon": "Sparkles",
        "text": "What insights can you share from my reflections?",
        "category": "insights",
    },
    {
        "icon": "Lightbulb",
        "text": "What might I be avoiding or not seeing?",
        "category": "blind_spots",
    },
    {
        "icon": "TrendingDown",
        "text": "What has been challenging for me recently?",
        "category": "challenges",
    },
]


# =============================================================================
# SUPPORTER MODE SUGGESTIONS
# Focused on understanding and supporting the journal author
# {name} is replaced with the author's display name
# =============================================================================

SUPPORTER_SUGGESTIONS_TEMPLATE = [
    {
        "icon": "Heart",
        "text": "What has {name} been feeling lately?",
        "category": "emotions",
    },
    {
        "icon": "HelpCircle",
        "text": "How can I better support {name} right now?",
        "category": "support",
    },
    {
        "icon": "TrendingUp",
        "text": "What patterns should I be aware of in {name}'s journals?",
        "category": "patterns",
    },
    {
        "icon": "MessageCircle",
        "text": "What topics might {name} want to talk about?",
        "category": "conversation",
    },
    {
        "icon": "Star",
        "text": "What has {name} been proud of or excited about?",
        "category": "celebration",
    },
    {
        "icon": "AlertCircle",
        "text": "Is there anything {name} seems worried about?",
        "category": "concerns",
    },
]


def get_suggestions(
    mode: ChatMode,
    author_name: Optional[str] = None,
    limit: int = 4,
) -> List[Dict[str, str]]:
    """
    Get conversation starter suggestions appropriate for the chat mode.

    Args:
        mode: Current chat mode (AUTHOR or SUPPORTER)
        author_name: Display name of journal author (for supporter mode personalization)
        limit: Maximum number of suggestions to return (default 4)

    Returns:
        List of suggestion dicts with 'icon', 'text', and 'category' keys
    """
    if mode == ChatMode.AUTHOR:
        return AUTHOR_SUGGESTIONS[:limit]

    # Supporter mode - personalize with author name
    name = author_name or "them"
    suggestions = []

    for template in SUPPORTER_SUGGESTIONS_TEMPLATE[:limit]:
        suggestions.append({
            "icon": template["icon"],
            "text": template["text"].replace("{name}", name),
            "category": template["category"],
        })

    return suggestions


def get_all_suggestions(
    mode: ChatMode, author_name: Optional[str] = None
) -> List[Dict[str, str]]:
    """
    Get all available suggestions for a mode (no limit).

    Useful for testing or showing extended options.
    """
    if mode == ChatMode.AUTHOR:
        return AUTHOR_SUGGESTIONS.copy()

    name = author_name or "them"
    return [
        {
            "icon": t["icon"],
            "text": t["text"].replace("{name}", name),
            "category": t["category"],
        }
        for t in SUPPORTER_SUGGESTIONS_TEMPLATE
    ]
