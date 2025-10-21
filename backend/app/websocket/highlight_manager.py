"""
WebSocket manager for real-time journal highlights and comments.
Handles connections, message broadcasting, and presence tracking.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Set, Optional, Any
from uuid import uuid4
from collections import defaultdict

from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel


logger = logging.getLogger(__name__)


class WebSocketMessage(BaseModel):
    """WebSocket message format."""
    type: str
    payload: Dict[str, Any]
    timestamp: str
    user_id: str = ""
    correlation_id: str = ""


class PresenceData(BaseModel):
    """User presence information."""
    user_id: str
    user_name: str
    color: str
    cursor_position: Optional[int] = None
    is_typing: bool = False
    last_activity: str


class ConnectionInfo:
    """Information about a WebSocket connection."""

    def __init__(self, websocket: WebSocket, user_id: str, user_name: str):
        self.websocket = websocket
        self.user_id = user_id
        self.user_name = user_name
        self.color = self._generate_color()
        self.last_heartbeat = datetime.utcnow()
        self.is_typing = False
        self.cursor_position: Optional[int] = None

    def _generate_color(self) -> str:
        """Generate a unique color for the user."""
        colors = [
            "#3B82F6",  # blue
            "#10B981",  # green
            "#F59E0B",  # orange
            "#8B5CF6",  # purple
            "#EC4899",  # pink
            "#14B8A6",  # teal
        ]
        # Use hash of user_id to get consistent color
        return colors[hash(self.user_id) % len(colors)]


class HighlightWebSocketManager:
    """
    Manages WebSocket connections for journal highlights.

    Handles:
    - Connection lifecycle (connect, disconnect, heartbeat)
    - Message broadcasting (highlights, comments, presence)
    - Presence tracking (active users, typing indicators)
    - Connection pooling per journal entry
    """

    def __init__(self):
        # Map of journal_entry_id -> set of ConnectionInfo
        self.active_connections: Dict[str, Set[ConnectionInfo]] = defaultdict(set)
        # Map of correlation_id -> set of user_ids (for deduplication)
        self.processed_messages: Dict[str, Set[str]] = defaultdict(set)
        # Message queue for reconnection
        self.message_history: Dict[str, list] = defaultdict(list)
        # Maximum history size per journal
        self.max_history_size = 1000
        # Heartbeat interval in seconds
        self.heartbeat_interval = 30
        # Presence update interval in seconds
        self.presence_interval = 5

    async def connect(
        self,
        websocket: WebSocket,
        journal_entry_id: str,
        user_id: str,
        user_name: str
    ) -> ConnectionInfo:
        """
        Accept a new WebSocket connection.

        Args:
            websocket: WebSocket connection
            journal_entry_id: Journal entry ID
            user_id: User ID
            user_name: User display name

        Returns:
            ConnectionInfo: Connection information
        """
        await websocket.accept()

        conn_info = ConnectionInfo(websocket, user_id, user_name)
        self.active_connections[journal_entry_id].add(conn_info)

        logger.info(
            f"WebSocket connected: user={user_id}, journal={journal_entry_id}, "
            f"total_connections={len(self.active_connections[journal_entry_id])}"
        )

        # Send connection confirmation with recent history
        await self._send_connection_confirmation(websocket, journal_entry_id)

        # Broadcast user joined presence
        await self.broadcast_presence_update(journal_entry_id, user_id, user_name, joined=True)

        return conn_info

    def disconnect(self, journal_entry_id: str, conn_info: ConnectionInfo):
        """
        Remove a WebSocket connection.

        Args:
            journal_entry_id: Journal entry ID
            conn_info: Connection information
        """
        if journal_entry_id in self.active_connections:
            self.active_connections[journal_entry_id].discard(conn_info)

            # Clean up empty journal rooms
            if not self.active_connections[journal_entry_id]:
                del self.active_connections[journal_entry_id]
                # Clean up message history for this journal
                if journal_entry_id in self.message_history:
                    del self.message_history[journal_entry_id]

        logger.info(
            f"WebSocket disconnected: user={conn_info.user_id}, journal={journal_entry_id}"
        )

    async def broadcast_message(
        self,
        journal_entry_id: str,
        message_type: str,
        payload: Dict[str, Any],
        sender_id: Optional[str] = None,
        correlation_id: Optional[str] = None
    ):
        """
        Broadcast a message to all connections for a journal entry.

        Args:
            journal_entry_id: Journal entry ID
            message_type: Message type (NEW_HIGHLIGHT, NEW_COMMENT, etc.)
            payload: Message payload
            sender_id: ID of the user sending the message (optional)
            correlation_id: Correlation ID for deduplication (optional)
        """
        if journal_entry_id not in self.active_connections:
            return

        correlation_id = correlation_id or str(uuid4())

        message = WebSocketMessage(
            type=message_type,
            payload=payload,
            timestamp=datetime.utcnow().isoformat(),
            user_id=sender_id or "",
            correlation_id=correlation_id
        )

        message_json = message.json()

        # Add to message history
        self._add_to_history(journal_entry_id, message_json)

        # Broadcast to all connected clients
        disconnected = []
        for conn_info in self.active_connections[journal_entry_id]:
            try:
                # Skip sender for echo prevention (optional - depends on use case)
                # if conn_info.user_id == sender_id:
                #     continue

                await conn_info.websocket.send_text(message_json)
            except Exception as e:
                logger.error(f"Error sending message to {conn_info.user_id}: {e}")
                disconnected.append(conn_info)

        # Clean up disconnected clients
        for conn_info in disconnected:
            self.disconnect(journal_entry_id, conn_info)

    async def broadcast_presence_update(
        self,
        journal_entry_id: str,
        user_id: str,
        user_name: str,
        joined: bool = False,
        left: bool = False,
        is_typing: bool = False,
        cursor_position: Optional[int] = None
    ):
        """
        Broadcast user presence update.

        Args:
            journal_entry_id: Journal entry ID
            user_id: User ID
            user_name: User display name
            joined: Whether user just joined
            left: Whether user just left
            is_typing: Whether user is typing
            cursor_position: Cursor position for highlight preview
        """
        if journal_entry_id not in self.active_connections:
            return

        # Get all active users
        active_users = []
        for conn_info in self.active_connections[journal_entry_id]:
            active_users.append({
                "userId": conn_info.user_id,
                "userName": conn_info.user_name,
                "color": conn_info.color,
                "isTyping": conn_info.is_typing,
                "cursorPosition": conn_info.cursor_position,
                "lastActivity": conn_info.last_heartbeat.isoformat()
            })

        payload = {
            "activeUsers": active_users,
            "totalCount": len(active_users),
            "event": "joined" if joined else ("left" if left else "update"),
            "userId": user_id,
            "userName": user_name
        }

        await self.broadcast_message(
            journal_entry_id,
            "USER_PRESENCE",
            payload,
            sender_id=user_id
        )

    async def update_user_state(
        self,
        journal_entry_id: str,
        user_id: str,
        is_typing: Optional[bool] = None,
        cursor_position: Optional[int] = None
    ):
        """
        Update user state (typing, cursor position).

        Args:
            journal_entry_id: Journal entry ID
            user_id: User ID
            is_typing: Typing status
            cursor_position: Cursor position
        """
        if journal_entry_id not in self.active_connections:
            return

        # Find user's connection
        for conn_info in self.active_connections[journal_entry_id]:
            if conn_info.user_id == user_id:
                if is_typing is not None:
                    conn_info.is_typing = is_typing
                if cursor_position is not None:
                    conn_info.cursor_position = cursor_position
                conn_info.last_heartbeat = datetime.utcnow()
                break

    async def handle_heartbeat(self, journal_entry_id: str, user_id: str):
        """
        Handle heartbeat from client.

        Args:
            journal_entry_id: Journal entry ID
            user_id: User ID
        """
        if journal_entry_id not in self.active_connections:
            return

        # Update last heartbeat time
        for conn_info in self.active_connections[journal_entry_id]:
            if conn_info.user_id == user_id:
                conn_info.last_heartbeat = datetime.utcnow()
                break

    async def cleanup_stale_connections(self):
        """Clean up connections that haven't sent heartbeat recently."""
        timeout = timedelta(seconds=self.heartbeat_interval * 3)
        now = datetime.utcnow()

        for journal_entry_id in list(self.active_connections.keys()):
            stale_connections = []
            for conn_info in self.active_connections[journal_entry_id]:
                if now - conn_info.last_heartbeat > timeout:
                    stale_connections.append(conn_info)

            for conn_info in stale_connections:
                logger.warning(f"Cleaning up stale connection: {conn_info.user_id}")
                self.disconnect(journal_entry_id, conn_info)

    async def _send_connection_confirmation(
        self,
        websocket: WebSocket,
        journal_entry_id: str
    ):
        """
        Send connection confirmation with recent message history.

        Args:
            websocket: WebSocket connection
            journal_entry_id: Journal entry ID
        """
        history = self.message_history.get(journal_entry_id, [])

        confirmation = {
            "type": "CONNECTION_CONFIRMED",
            "payload": {
                "journalEntryId": journal_entry_id,
                "messageHistory": history[-100:],  # Last 100 messages
                "serverTime": datetime.utcnow().isoformat()
            },
            "timestamp": datetime.utcnow().isoformat()
        }

        await websocket.send_text(json.dumps(confirmation))

    def _add_to_history(self, journal_entry_id: str, message: str):
        """
        Add message to history for reconnection.

        Args:
            journal_entry_id: Journal entry ID
            message: JSON message string
        """
        history = self.message_history[journal_entry_id]
        history.append(message)

        # Trim history if too large
        if len(history) > self.max_history_size:
            self.message_history[journal_entry_id] = history[-self.max_history_size:]

    def get_active_user_count(self, journal_entry_id: str) -> int:
        """
        Get count of active users for a journal entry.

        Args:
            journal_entry_id: Journal entry ID

        Returns:
            int: Number of active connections
        """
        return len(self.active_connections.get(journal_entry_id, set()))


# Global singleton instance
_manager: Optional[HighlightWebSocketManager] = None


def get_websocket_manager() -> HighlightWebSocketManager:
    """
    Get the global WebSocket manager instance.

    Returns:
        HighlightWebSocketManager: WebSocket manager
    """
    global _manager
    if _manager is None:
        _manager = HighlightWebSocketManager()
    return _manager
