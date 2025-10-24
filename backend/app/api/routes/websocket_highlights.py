"""
WebSocket endpoints for real-time journal highlights collaboration.
"""

import logging
import json
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from fastapi.responses import JSONResponse

from app.websocket.highlight_manager import get_websocket_manager
from app.core.dependencies import get_current_user_ws


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/spaces/{space_id}/journals/{journal_entry_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    space_id: str,
    journal_entry_id: str,
    token: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for real-time collaboration on journal entries.

    Query params:
        token: JWT access token for authentication

    Message types (client -> server):
        - HEARTBEAT: Keep connection alive
        - TYPING_START: User started typing
        - TYPING_STOP: User stopped typing
        - CURSOR_MOVE: User moved cursor (for highlight preview)

    Message types (server -> client):
        - CONNECTION_CONFIRMED: Connection established with history
        - NEW_HIGHLIGHT: New highlight created
        - UPDATE_HIGHLIGHT: Highlight updated (text selection changed)
        - DELETE_HIGHLIGHT: Highlight deleted
        - NEW_COMMENT: New comment added
        - UPDATE_COMMENT: Comment updated
        - DELETE_COMMENT: Comment deleted
        - USER_PRESENCE: User presence update
    """
    manager = get_websocket_manager()

    # Authenticate user from token
    # TODO: Implement proper JWT validation for WebSocket
    # For now, extract user info from token or use a placeholder
    user_id = token or "anonymous"
    user_name = f"User {user_id[:8]}"

    # TODO: Verify user has access to this space/journal

    conn_info = None
    try:
        # Connect to WebSocket
        conn_info = await manager.connect(
            websocket=websocket,
            journal_entry_id=journal_entry_id,
            user_id=user_id,
            user_name=user_name
        )

        # Main message loop
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                message = json.loads(data)

                message_type = message.get("type")

                # Handle different message types
                if message_type == "HEARTBEAT":
                    await manager.handle_heartbeat(journal_entry_id, user_id)

                elif message_type == "TYPING_START":
                    await manager.update_user_state(
                        journal_entry_id,
                        user_id,
                        is_typing=True
                    )
                    await manager.broadcast_presence_update(
                        journal_entry_id,
                        user_id,
                        user_name,
                        is_typing=True
                    )

                elif message_type == "TYPING_STOP":
                    await manager.update_user_state(
                        journal_entry_id,
                        user_id,
                        is_typing=False
                    )
                    await manager.broadcast_presence_update(
                        journal_entry_id,
                        user_id,
                        user_name,
                        is_typing=False
                    )

                elif message_type == "CURSOR_MOVE":
                    cursor_position = message.get("payload", {}).get("position")
                    await manager.update_user_state(
                        journal_entry_id,
                        user_id,
                        cursor_position=cursor_position
                    )

                else:
                    logger.warning(f"Unknown message type: {message_type}")

            except json.JSONDecodeError:
                logger.error("Invalid JSON received")
            except Exception as e:
                logger.error(f"Error processing message: {e}")

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        # Clean up connection
        if conn_info:
            manager.disconnect(journal_entry_id, conn_info)
            await manager.broadcast_presence_update(
                journal_entry_id,
                user_id,
                user_name,
                left=True
            )


@router.get("/health")
async def websocket_health():
    """Health check for WebSocket service."""
    manager = get_websocket_manager()

    # Count total active connections
    total_connections = sum(
        len(connections)
        for connections in manager.active_connections.values()
    )

    return JSONResponse({
        "status": "healthy",
        "activeRooms": len(manager.active_connections),
        "totalConnections": total_connections
    })
