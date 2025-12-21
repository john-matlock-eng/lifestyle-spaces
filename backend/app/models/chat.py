"""
Chat Models

Pydantic models for AI chat conversations with Ellie.
"""

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict
from uuid import uuid4


class JournalCitation(BaseModel):
    """Reference to a journal used in AI response."""

    journal_id: str = Field(..., alias="journalId")
    title: str
    relevance_score: float = Field(..., alias="relevanceScore")
    excerpt: Optional[str] = None
    created_at: Optional[str] = Field(None, alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class ChatMessage(BaseModel):
    """A single message in a conversation."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    role: Literal["user", "assistant", "system"]
    content: str
    citations: List[JournalCitation] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class ChatConversation(BaseModel):
    """A chat conversation within a space."""

    conversation_id: str = Field(
        default_factory=lambda: str(uuid4()), alias="conversationId"
    )
    space_id: str = Field(..., alias="spaceId")
    user_id: str = Field(..., alias="userId")
    title: Optional[str] = None
    messages: List[ChatMessage] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True)


# =============================================================================
# API Request/Response Models
# =============================================================================


class CreateChatConversationRequest(BaseModel):
    """Request to start a new conversation."""

    initial_message: Optional[str] = Field(None, alias="initialMessage")

    model_config = ConfigDict(populate_by_name=True)


class CreateChatConversationResponse(BaseModel):
    """Response after creating a conversation."""

    conversation_id: str = Field(..., alias="conversationId")
    space_id: str = Field(..., alias="spaceId")
    created_at: datetime = Field(..., alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class SendMessageRequest(BaseModel):
    """Request to send a message."""

    content: str = Field(..., min_length=1, max_length=10000)

    model_config = ConfigDict(populate_by_name=True)


class SendMessageResponse(BaseModel):
    """Response after sending a message (non-streaming)."""

    message: ChatMessage
    citations: List[JournalCitation] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class ChatConversationResponse(BaseModel):
    """Full conversation response."""

    conversation: ChatConversation

    model_config = ConfigDict(populate_by_name=True)


class ChatConversationListItem(BaseModel):
    """Summary item for conversation list."""

    conversation_id: str = Field(..., alias="conversationId")
    title: Optional[str] = None
    message_count: int = Field(..., alias="messageCount")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True)


class ChatConversationListResponse(BaseModel):
    """Response for listing conversations."""

    conversations: List[ChatConversationListItem]
    total: int

    model_config = ConfigDict(populate_by_name=True)
