"""
Tests for dependency injection functions.
"""

import pytest
from app.core.dependencies import get_current_user_ws


class TestWebSocketDependencies:
    """Tests for WebSocket authentication dependencies."""

    @pytest.mark.asyncio
    async def test_get_current_user_ws_no_token(self):
        """Test WebSocket auth with no token."""
        user = await get_current_user_ws(token=None)

        assert user["userId"] == "anonymous"
        assert user["displayName"] == "Anonymous User"

    @pytest.mark.asyncio
    async def test_get_current_user_ws_with_token(self):
        """Test WebSocket auth with token."""
        token = "test-token-12345"
        user = await get_current_user_ws(token=token)

        assert user["userId"] == "test-tok"
        assert "User test-tok" in user["displayName"]

    @pytest.mark.asyncio
    async def test_get_current_user_ws_short_token(self):
        """Test WebSocket auth with short token."""
        token = "abc"
        user = await get_current_user_ws(token=token)

        assert user["userId"] == "abc"
        assert "User abc" in user["displayName"]
