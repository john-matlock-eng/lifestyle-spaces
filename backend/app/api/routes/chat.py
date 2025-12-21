"""
Chat API Routes

Endpoints for AI chat with journal context (Ellie conversations).
"""

import json
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import Optional

from app.core.dependencies import get_current_user
from app.services.chat_service import get_chat_service
from app.services.space import SpaceService
from app.services.exceptions import SpaceNotFoundError, UnauthorizedError
from app.models.chat import (
    CreateChatConversationRequest,
    CreateChatConversationResponse,
    SendMessageRequest,
    SendMessageResponse,
    ChatConversationResponse,
    ChatConversationListResponse,
    ChatConversationListItem,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["Chat"])


def _verify_space_access(space_id: str, user_id: str) -> None:
    """Verify user has access to the space.

    SpaceService.get_space() already checks:
    1. Space exists (raises SpaceNotFoundError if not)
    2. User is a member or space is public (raises UnauthorizedError if not)
    """
    space_service = SpaceService()
    # get_space raises SpaceNotFoundError if space doesn't exist
    # and UnauthorizedError if user is not a member and space is not public
    space_service.get_space(space_id, user_id)


# =============================================================================
# CONVERSATION ENDPOINTS
# =============================================================================


@router.post(
    "/spaces/{space_id}/conversations",
    response_model=CreateChatConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new chat conversation",
)
async def create_conversation(
    space_id: str,
    request: Optional[CreateChatConversationRequest] = None,
    current_user: dict = Depends(get_current_user),
):
    """Start a new chat conversation with Ellie in a space."""
    try:
        user_id = current_user.get("sub", "")
        _verify_space_access(space_id, user_id)

        service = get_chat_service()
        conversation = await service.create_conversation(
            space_id=space_id, user_id=user_id, request=request
        )

        logger.info(
            f"[CHAT] Created conversation {conversation.conversation_id} "
            f"for user {user_id} in space {space_id}"
        )

        return CreateChatConversationResponse(
            conversationId=conversation.conversation_id,
            spaceId=conversation.space_id,
            createdAt=conversation.created_at,
        )

    except SpaceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"[CHAT] Failed to create conversation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create conversation",
        )


@router.get(
    "/spaces/{space_id}/conversations",
    response_model=ChatConversationListResponse,
    summary="List chat conversations in a space",
)
async def list_conversations(
    space_id: str,
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
):
    """List all chat conversations with Ellie in a space."""
    try:
        user_id = current_user.get("sub", "")
        _verify_space_access(space_id, user_id)

        service = get_chat_service()
        conversations = await service.list_conversations(space_id=space_id, limit=limit)

        # Filter to only user's conversations
        user_conversations = [c for c in conversations if c.user_id == user_id]

        return ChatConversationListResponse(
            conversations=[
                ChatConversationListItem(
                    conversationId=c.conversation_id,
                    title=c.title,
                    messageCount=len(c.messages),
                    createdAt=c.created_at,
                    updatedAt=c.updated_at,
                )
                for c in user_conversations
            ],
            total=len(user_conversations),
        )

    except SpaceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"[CHAT] Failed to list conversations: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list conversations",
        )


@router.get(
    "/spaces/{space_id}/conversations/{conversation_id}",
    response_model=ChatConversationResponse,
    summary="Get a chat conversation",
)
async def get_conversation(
    space_id: str,
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a conversation with full message history."""
    try:
        user_id = current_user.get("sub", "")
        _verify_space_access(space_id, user_id)

        service = get_chat_service()
        conversation = await service.get_conversation(
            space_id=space_id, conversation_id=conversation_id
        )

        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found",
            )

        # Check ownership
        if conversation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this conversation",
            )

        return ChatConversationResponse(conversation=conversation)

    except SpaceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[CHAT] Failed to get conversation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get conversation",
        )


@router.delete(
    "/spaces/{space_id}/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a chat conversation",
)
async def delete_conversation(
    space_id: str,
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a conversation."""
    try:
        user_id = current_user.get("sub", "")
        _verify_space_access(space_id, user_id)

        service = get_chat_service()

        # Verify ownership first
        conversation = await service.get_conversation(space_id, conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found",
            )

        if conversation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this conversation",
            )

        await service.delete_conversation(space_id, conversation_id)
        logger.info(f"[CHAT] Deleted conversation {conversation_id}")

    except SpaceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[CHAT] Failed to delete conversation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete conversation",
        )


# =============================================================================
# MESSAGE ENDPOINTS
# =============================================================================


@router.post(
    "/spaces/{space_id}/conversations/{conversation_id}/messages",
    response_model=SendMessageResponse,
    summary="Send a message (non-streaming)",
)
async def send_message(
    space_id: str,
    conversation_id: str,
    request: SendMessageRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Send a message and receive AI response.

    This endpoint waits for the full response before returning.
    For streaming responses, use the streaming endpoint.
    """
    try:
        user_id = current_user.get("sub", "")
        _verify_space_access(space_id, user_id)

        service = get_chat_service()

        logger.info(
            f"[CHAT] Message from user {user_id} in conversation {conversation_id}: "
            f"'{request.content[:50]}...'"
        )

        message, citations = await service.send_message(
            space_id=space_id,
            conversation_id=conversation_id,
            user_id=user_id,
            request=request,
        )

        logger.info(
            f"[CHAT] Response generated with {len(citations)} citations"
        )

        return SendMessageResponse(message=message, citations=citations)

    except SpaceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"[CHAT] Send message failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process message",
        )


@router.post(
    "/spaces/{space_id}/conversations/{conversation_id}/messages/stream",
    summary="Send a message (streaming)",
)
async def send_message_streaming(
    space_id: str,
    conversation_id: str,
    request: SendMessageRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Send a message and stream AI response.

    Returns a stream of JSON objects:
    - `{"type": "citations", "data": [...]}` - Journal citations used
    - `{"type": "content", "data": "text"}` - Response text chunks
    - `{"type": "done", "messageId": "..."}` - Completion signal
    - `{"type": "error", "message": "..."}` - Error if any

    Use with EventSource or fetch with streaming.
    """
    try:
        user_id = current_user.get("sub", "")
        _verify_space_access(space_id, user_id)

        service = get_chat_service()

        logger.info(
            f"[CHAT] Streaming message from user {user_id} in conversation "
            f"{conversation_id}: '{request.content[:50]}...'"
        )

        async def generate():
            """Generator with error handling inside to catch streaming errors."""
            try:
                async for chunk in service.send_message_streaming(
                    space_id=space_id,
                    conversation_id=conversation_id,
                    user_id=user_id,
                    request=request,
                ):
                    yield f"data: {chunk}\n\n"
            except Exception as e:
                # Log the error that happens during streaming
                logger.error(f"[CHAT] Error during streaming iteration: {e}", exc_info=True)
                # Yield error as SSE event so client knows what happened
                error_event = json.dumps({"type": "error", "message": str(e)})
                yield f"data: {error_event}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    except SpaceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"[CHAT] Streaming failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Streaming failed",
        )
