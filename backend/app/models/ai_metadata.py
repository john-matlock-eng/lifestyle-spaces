"""
AI Metadata Models

Pydantic models for AI-generated journal metadata.
"""

from datetime import datetime, timezone
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


SentimentType = Literal[
    "reflective",
    "positive",
    "challenging",
    "grateful",
    "anxious",
    "hopeful",
    "neutral",
    "mixed"
]


class JournalAIMetadata(BaseModel):
    """AI-generated metadata for a journal entry."""

    synopsis: str = Field(
        ...,
        description="2-3 sentence summary of the journal entry",
        min_length=10,
        max_length=500
    )

    themes: List[str] = Field(
        ...,
        description="3-7 topic tags/themes",
        min_length=1,
        max_length=10
    )

    insights: List[str] = Field(
        default_factory=list,
        description="2-5 key takeaways or realizations",
        max_length=5
    )

    sentiment: SentimentType = Field(
        ...,
        description="Overall emotional tone"
    )

    emotional_tone: str = Field(
        default="",
        alias="emotionalTone",
        description="More nuanced emotional description",
        max_length=100
    )

    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        alias="generatedAt"
    )

    model_used: str = Field(
        default="",
        alias="modelUsed",
        description="Model that generated this metadata"
    )

    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class GenerateMetadataRequest(BaseModel):
    """Request to generate metadata for a journal."""

    force_regenerate: bool = Field(
        default=False,
        alias="forceRegenerate",
        description="Regenerate even if metadata exists"
    )

    model_config = ConfigDict(populate_by_name=True)


class GenerateMetadataResponse(BaseModel):
    """Response after generating metadata."""

    journal_id: str = Field(..., alias="journalId")
    metadata: JournalAIMetadata
    was_cached: bool = Field(default=False, alias="wasCached")

    model_config = ConfigDict(populate_by_name=True)
