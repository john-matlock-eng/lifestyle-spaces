"""
Comprehensive tests for WebSocket highlight manager.
"""

import asyncio
import json
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch

from app.websocket.highlight_manager import (
    HighlightWebSocketManager,
    ConnectionInfo,
    WebSocketMessage,
    PresenceData,
    get_websocket_manager,
)


class TestConnectionInfo:
    """Test ConnectionInfo class."""

    def test_init(self):
        """Test ConnectionInfo initialization."""
        websocket = Mock()
        conn = ConnectionInfo(websocket, "user-123", "John Doe")

        assert conn.websocket == websocket
        assert conn.user_id == "user-123"
        assert conn.user_name == "John Doe"
        assert conn.color in ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6"]
        assert conn.last_heartbeat is not None
        assert conn.is_typing is False
        assert conn.cursor_position is None

    def test_generate_color_consistency(self):
        """Test that same user_id generates same color."""
        websocket = Mock()
        conn1 = ConnectionInfo(websocket, "user-123", "John Doe")
        conn2 = ConnectionInfo(websocket, "user-123", "John Doe")

        assert conn1.color == conn2.color

    def test_generate_color_variety(self):
        """Test that different users get different colors."""
        websocket = Mock()
        colors = set()

        for i in range(10):
            conn = ConnectionInfo(websocket, f"user-{i}", f"User {i}")
            colors.add(conn.color)

        # Should have at least 2 different colors with 10 users
        assert len(colors) >= 2


class TestWebSocketMessage:
    """Test WebSocketMessage model."""

    def test_websocket_message_creation(self):
        """Test creating a WebSocket message."""
        message = WebSocketMessage(
            type="NEW_HIGHLIGHT",
            payload={"id": "123", "text": "test"},
            timestamp="2025-01-01T00:00:00",
            user_id="user-123",
            correlation_id="corr-456"
        )

        assert message.type == "NEW_HIGHLIGHT"
        assert message.payload == {"id": "123", "text": "test"}
        assert message.user_id == "user-123"
        assert message.correlation_id == "corr-456"

    def test_websocket_message_defaults(self):
        """Test WebSocket message with default values."""
        message = WebSocketMessage(
            type="NEW_COMMENT",
            payload={"comment": "test"},
            timestamp="2025-01-01T00:00:00"
        )

        assert message.user_id == ""
        assert message.correlation_id == ""


class TestPresenceData:
    """Test PresenceData model."""

    def test_presence_data_creation(self):
        """Test creating presence data."""
        presence = PresenceData(
            user_id="user-123",
            user_name="John Doe",
            color="#3B82F6",
            cursor_position=100,
            is_typing=True,
            last_activity="2025-01-01T00:00:00"
        )

        assert presence.user_id == "user-123"
        assert presence.user_name == "John Doe"
        assert presence.color == "#3B82F6"
        assert presence.cursor_position == 100
        assert presence.is_typing is True

    def test_presence_data_defaults(self):
        """Test presence data with default values."""
        presence = PresenceData(
            user_id="user-123",
            user_name="John Doe",
            color="#3B82F6",
            last_activity="2025-01-01T00:00:00"
        )

        assert presence.cursor_position is None
        assert presence.is_typing is False


class TestHighlightWebSocketManager:
    """Test HighlightWebSocketManager class."""

    @pytest.fixture
    def manager(self):
        """Create a fresh manager instance for each test."""
        return HighlightWebSocketManager()

    @pytest.fixture
    def mock_websocket(self):
        """Create a mock WebSocket."""
        ws = AsyncMock()
        ws.accept = AsyncMock()
        ws.send_text = AsyncMock()
        return ws

    @pytest.mark.asyncio
    async def test_connect(self, manager, mock_websocket):
        """Test connecting a WebSocket."""
        conn_info = await manager.connect(
            mock_websocket,
            "journal-123",
            "user-456",
            "John Doe"
        )

        assert conn_info.user_id == "user-456"
        assert conn_info.user_name == "John Doe"
        assert "journal-123" in manager.active_connections
        assert len(manager.active_connections["journal-123"]) == 1
        mock_websocket.accept.assert_called_once()

    @pytest.mark.asyncio
    async def test_connect_multiple_users(self, manager, mock_websocket):
        """Test multiple users connecting to same journal."""
        ws1 = AsyncMock()
        ws1.accept = AsyncMock()
        ws1.send_text = AsyncMock()

        ws2 = AsyncMock()
        ws2.accept = AsyncMock()
        ws2.send_text = AsyncMock()

        await manager.connect(ws1, "journal-123", "user-1", "User 1")
        await manager.connect(ws2, "journal-123", "user-2", "User 2")

        assert len(manager.active_connections["journal-123"]) == 2

    def test_disconnect(self, manager):
        """Test disconnecting a WebSocket."""
        # Manually create a connection
        websocket = Mock()
        conn_info = ConnectionInfo(websocket, "user-123", "John Doe")
        manager.active_connections["journal-123"].add(conn_info)
        manager.message_history["journal-123"] = ["msg1", "msg2"]

        # Disconnect
        manager.disconnect("journal-123", conn_info)

        assert "journal-123" not in manager.active_connections
        assert "journal-123" not in manager.message_history

    def test_disconnect_with_multiple_users(self, manager):
        """Test disconnecting one user when multiple are connected."""
        ws1 = Mock()
        ws2 = Mock()
        conn1 = ConnectionInfo(ws1, "user-1", "User 1")
        conn2 = ConnectionInfo(ws2, "user-2", "User 2")

        manager.active_connections["journal-123"].add(conn1)
        manager.active_connections["journal-123"].add(conn2)

        # Disconnect one user
        manager.disconnect("journal-123", conn1)

        assert "journal-123" in manager.active_connections
        assert len(manager.active_connections["journal-123"]) == 1

    @pytest.mark.asyncio
    async def test_broadcast_message(self, manager):
        """Test broadcasting a message."""
        ws1 = AsyncMock()
        ws2 = AsyncMock()
        conn1 = ConnectionInfo(ws1, "user-1", "User 1")
        conn2 = ConnectionInfo(ws2, "user-2", "User 2")

        manager.active_connections["journal-123"].add(conn1)
        manager.active_connections["journal-123"].add(conn2)

        await manager.broadcast_message(
            "journal-123",
            "NEW_HIGHLIGHT",
            {"id": "highlight-1", "text": "test"},
            sender_id="user-1"
        )

        # Both users should receive the message
        assert ws1.send_text.call_count == 1
        assert ws2.send_text.call_count == 1

        # Check message history
        assert len(manager.message_history["journal-123"]) == 1

    @pytest.mark.asyncio
    async def test_broadcast_message_no_connections(self, manager):
        """Test broadcasting when no connections exist."""
        # Should not raise an error
        await manager.broadcast_message(
            "journal-nonexistent",
            "NEW_HIGHLIGHT",
            {"id": "highlight-1"}
        )

    @pytest.mark.asyncio
    async def test_broadcast_message_handles_disconnected_client(self, manager):
        """Test broadcasting handles disconnected clients."""
        ws1 = AsyncMock()
        ws2 = AsyncMock()
        ws2.send_text = AsyncMock(side_effect=Exception("Connection closed"))

        conn1 = ConnectionInfo(ws1, "user-1", "User 1")
        conn2 = ConnectionInfo(ws2, "user-2", "User 2")

        manager.active_connections["journal-123"].add(conn1)
        manager.active_connections["journal-123"].add(conn2)

        await manager.broadcast_message(
            "journal-123",
            "NEW_HIGHLIGHT",
            {"id": "highlight-1"}
        )

        # user-2 should be disconnected due to error
        assert len(manager.active_connections["journal-123"]) == 1
        assert conn1 in manager.active_connections["journal-123"]
        assert conn2 not in manager.active_connections["journal-123"]

    @pytest.mark.asyncio
    async def test_broadcast_presence_update(self, manager):
        """Test broadcasting presence update."""
        ws = AsyncMock()
        conn = ConnectionInfo(ws, "user-1", "User 1")
        manager.active_connections["journal-123"].add(conn)

        await manager.broadcast_presence_update(
            "journal-123",
            "user-1",
            "User 1",
            joined=True
        )

        ws.send_text.assert_called_once()
        call_args = ws.send_text.call_args[0][0]
        message = json.loads(call_args)

        assert message["type"] == "USER_PRESENCE"
        assert message["payload"]["event"] == "joined"
        assert message["payload"]["totalCount"] == 1
        assert len(message["payload"]["activeUsers"]) == 1

    @pytest.mark.asyncio
    async def test_broadcast_presence_update_no_connections(self, manager):
        """Test presence update when no connections exist."""
        # Should not raise an error
        await manager.broadcast_presence_update(
            "journal-nonexistent",
            "user-1",
            "User 1",
            joined=True
        )

    @pytest.mark.asyncio
    async def test_update_user_state_typing(self, manager):
        """Test updating user typing state."""
        ws = Mock()
        conn = ConnectionInfo(ws, "user-1", "User 1")
        manager.active_connections["journal-123"].add(conn)

        old_heartbeat = conn.last_heartbeat

        # Small delay to ensure timestamp changes
        await asyncio.sleep(0.01)

        await manager.update_user_state(
            "journal-123",
            "user-1",
            is_typing=True
        )

        assert conn.is_typing is True
        assert conn.last_heartbeat > old_heartbeat

    @pytest.mark.asyncio
    async def test_update_user_state_cursor(self, manager):
        """Test updating user cursor position."""
        ws = Mock()
        conn = ConnectionInfo(ws, "user-1", "User 1")
        manager.active_connections["journal-123"].add(conn)

        await manager.update_user_state(
            "journal-123",
            "user-1",
            cursor_position=100
        )

        assert conn.cursor_position == 100

    @pytest.mark.asyncio
    async def test_update_user_state_no_connection(self, manager):
        """Test updating state for non-existent connection."""
        # Should not raise an error
        await manager.update_user_state(
            "journal-nonexistent",
            "user-1",
            is_typing=True
        )

    @pytest.mark.asyncio
    async def test_handle_heartbeat(self, manager):
        """Test handling heartbeat."""
        ws = Mock()
        conn = ConnectionInfo(ws, "user-1", "User 1")
        manager.active_connections["journal-123"].add(conn)

        old_heartbeat = conn.last_heartbeat

        # Small delay to ensure timestamp changes
        await asyncio.sleep(0.01)

        await manager.handle_heartbeat("journal-123", "user-1")

        assert conn.last_heartbeat > old_heartbeat

    @pytest.mark.asyncio
    async def test_handle_heartbeat_no_connection(self, manager):
        """Test heartbeat for non-existent connection."""
        # Should not raise an error
        await manager.handle_heartbeat("journal-nonexistent", "user-1")

    @pytest.mark.asyncio
    async def test_cleanup_stale_connections(self, manager):
        """Test cleaning up stale connections."""
        ws = Mock()
        conn = ConnectionInfo(ws, "user-1", "User 1")

        # Set last_heartbeat to be very old
        conn.last_heartbeat = datetime.utcnow() - timedelta(minutes=10)

        manager.active_connections["journal-123"].add(conn)

        await manager.cleanup_stale_connections()

        # Connection should be removed
        assert "journal-123" not in manager.active_connections

    @pytest.mark.asyncio
    async def test_cleanup_stale_connections_keeps_active(self, manager):
        """Test cleanup keeps active connections."""
        ws = Mock()
        conn = ConnectionInfo(ws, "user-1", "User 1")

        # Recent heartbeat
        conn.last_heartbeat = datetime.utcnow()

        manager.active_connections["journal-123"].add(conn)

        await manager.cleanup_stale_connections()

        # Connection should still exist
        assert "journal-123" in manager.active_connections
        assert len(manager.active_connections["journal-123"]) == 1

    def test_add_to_history(self, manager):
        """Test adding messages to history."""
        manager._add_to_history("journal-123", '{"type": "TEST"}')

        assert len(manager.message_history["journal-123"]) == 1
        assert manager.message_history["journal-123"][0] == '{"type": "TEST"}'

    def test_add_to_history_trimming(self, manager):
        """Test history trimming when it exceeds max size."""
        manager.max_history_size = 10

        # Add more than max size
        for i in range(15):
            manager._add_to_history("journal-123", f'{{"msg": {i}}}')

        # Should only keep last 10
        assert len(manager.message_history["journal-123"]) == 10
        # First message should be msg 5 (0-4 trimmed)
        assert '"msg": 5' in manager.message_history["journal-123"][0]

    @pytest.mark.asyncio
    async def test_send_connection_confirmation(self, manager, mock_websocket):
        """Test sending connection confirmation."""
        # Add some history
        manager.message_history["journal-123"] = [
            '{"type": "MSG1"}',
            '{"type": "MSG2"}'
        ]

        await manager._send_connection_confirmation(mock_websocket, "journal-123")

        mock_websocket.send_text.assert_called_once()
        call_args = mock_websocket.send_text.call_args[0][0]
        message = json.loads(call_args)

        assert message["type"] == "CONNECTION_CONFIRMED"
        assert "messageHistory" in message["payload"]
        assert len(message["payload"]["messageHistory"]) == 2

    @pytest.mark.asyncio
    async def test_send_connection_confirmation_no_history(self, manager, mock_websocket):
        """Test connection confirmation with no message history."""
        await manager._send_connection_confirmation(mock_websocket, "journal-123")

        mock_websocket.send_text.assert_called_once()
        call_args = mock_websocket.send_text.call_args[0][0]
        message = json.loads(call_args)

        assert message["type"] == "CONNECTION_CONFIRMED"
        assert message["payload"]["messageHistory"] == []

    def test_get_active_user_count(self, manager):
        """Test getting active user count."""
        ws1 = Mock()
        ws2 = Mock()
        conn1 = ConnectionInfo(ws1, "user-1", "User 1")
        conn2 = ConnectionInfo(ws2, "user-2", "User 2")

        manager.active_connections["journal-123"].add(conn1)
        manager.active_connections["journal-123"].add(conn2)

        count = manager.get_active_user_count("journal-123")
        assert count == 2

    def test_get_active_user_count_no_connections(self, manager):
        """Test getting count for journal with no connections."""
        count = manager.get_active_user_count("journal-nonexistent")
        assert count == 0


class TestWebSocketManagerSingleton:
    """Test WebSocket manager singleton pattern."""

    def test_get_websocket_manager_creates_instance(self):
        """Test that get_websocket_manager creates an instance."""
        # Clear the global manager
        import app.websocket.highlight_manager as manager_module
        manager_module._manager = None

        manager = get_websocket_manager()
        assert isinstance(manager, HighlightWebSocketManager)

    def test_get_websocket_manager_returns_same_instance(self):
        """Test that get_websocket_manager returns the same instance."""
        manager1 = get_websocket_manager()
        manager2 = get_websocket_manager()

        assert manager1 is manager2
