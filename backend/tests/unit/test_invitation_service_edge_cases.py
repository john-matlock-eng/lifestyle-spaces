"""
Tests for edge cases in invitation service.

These tests cover edge cases in:
- app/services/invitation.py (lines 282-283, 287, 443-462)
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone, timedelta
import uuid


class TestInvitationServiceEdgeCases:
    """Test edge cases in invitation service."""

    def setup_method(self):
        """Set up test environment."""
        # Import here to avoid circular imports
        from app.services.invitation import InvitationService
        from app.core.database import DynamoDBClient

        # Mock DynamoDB client
        self.mock_db_client = Mock(spec=DynamoDBClient)
        self.service = InvitationService(db_client=self.mock_db_client)

    # Test error handling in _accept_by_code (lines 282-283, 287)
    def test_accept_by_code_empty_items_list(self):
        """Test _accept_by_code when scan returns empty list."""
        from app.services.exceptions import InvalidInvitationError

        # Mock scan to return empty list
        self.mock_db_client.scan.return_value = []

        # Should raise InvalidInvitationError
        with pytest.raises(InvalidInvitationError) as exc_info:
            self.service._accept_by_code("invalid_code", "user123", "testuser", "test@example.com")

        assert "Invalid invitation code" in str(exc_info.value)

    def test_accept_by_code_empty_dict_response(self):
        """Test _accept_by_code when scan returns dict with empty Items."""
        from app.services.exceptions import InvalidInvitationError

        # Mock scan to return dict with empty Items
        self.mock_db_client.scan.return_value = {"Items": []}

        # Should raise InvalidInvitationError
        with pytest.raises(InvalidInvitationError) as exc_info:
            self.service._accept_by_code("invalid_code", "user123", "testuser", "test@example.com")

        assert "Invalid invitation code" in str(exc_info.value)

    def test_accept_by_code_mock_object_with_zero_length(self):
        """Test _accept_by_code when items has __len__ returning 0."""
        from app.services.exceptions import InvalidInvitationError

        # Mock scan to return Mock object with length 0
        mock_items = Mock()
        mock_items.__len__ = Mock(return_value=0)
        self.mock_db_client.scan.return_value = mock_items

        # Should raise InvalidInvitationError
        with pytest.raises(InvalidInvitationError) as exc_info:
            self.service._accept_by_code("invalid_code", "user123", "testuser", "test@example.com")

        assert "Invalid invitation code" in str(exc_info.value)

    def test_accept_by_code_items_index_error(self):
        """Test _accept_by_code handles IndexError when accessing first item."""
        from app.services.exceptions import InvalidInvitationError

        # Mock scan to return list-like object that raises IndexError
        mock_items = Mock()
        mock_items.__getitem__ = Mock(side_effect=IndexError("list index out of range"))
        # Make it look like a non-list that needs list() conversion
        mock_items.__iter__ = Mock(return_value=iter([]))

        self.mock_db_client.scan.return_value = mock_items

        # Should raise InvalidInvitationError
        with pytest.raises(InvalidInvitationError) as exc_info:
            self.service._accept_by_code("invalid_code", "user123", "testuser", "test@example.com")

        assert "Invalid invitation code" in str(exc_info.value)

    def test_accept_by_code_items_type_error(self):
        """Test _accept_by_code handles TypeError when converting to list."""
        from app.services.exceptions import InvalidInvitationError

        # Mock scan to return object that can't be converted to list
        mock_items = Mock()
        mock_items.__getitem__ = Mock(side_effect=TypeError("not subscriptable"))
        mock_items.__iter__ = Mock(side_effect=TypeError("not iterable"))

        self.mock_db_client.scan.return_value = mock_items

        # Should raise InvalidInvitationError
        with pytest.raises(InvalidInvitationError) as exc_info:
            self.service._accept_by_code("invalid_code", "user123", "testuser", "test@example.com")

        assert "Invalid invitation code" in str(exc_info.value)

    def test_accept_by_code_not_pending_status(self):
        """Test _accept_by_code when invitation is not pending (line 287)."""
        from app.services.exceptions import InvalidInvitationError
        from app.models.invitation import InvitationStatus

        # Mock scan to return accepted invitation
        invitation_item = {
            "PK": "INVITATION#inv123",
            "SK": "INVITATION#inv123",
            "invitation_id": "inv123",
            "invitation_code": "code123",
            "space_id": "space123",
            "invitee_email": "test@example.com",
            "inviter_user_id": "user456",
            "status": InvitationStatus.ACCEPTED.value,  # Already accepted
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        }

        self.mock_db_client.scan.return_value = [invitation_item]

        # Should raise InvalidInvitationError
        with pytest.raises(InvalidInvitationError) as exc_info:
            self.service._accept_by_code("code123", "user123", "testuser", "test@example.com")

        assert "not pending" in str(exc_info.value).lower()

    def test_accept_by_code_declined_status(self):
        """Test _accept_by_code when invitation is declined."""
        from app.services.exceptions import InvalidInvitationError
        from app.models.invitation import InvitationStatus

        # Mock scan to return declined invitation
        invitation_item = {
            "PK": "INVITATION#inv123",
            "SK": "INVITATION#inv123",
            "invitation_id": "inv123",
            "invitation_code": "code123",
            "space_id": "space123",
            "invitee_email": "test@example.com",
            "inviter_user_id": "user456",
            "status": InvitationStatus.DECLINED.value,  # Declined
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        }

        self.mock_db_client.scan.return_value = [invitation_item]

        # Should raise InvalidInvitationError
        with pytest.raises(InvalidInvitationError) as exc_info:
            self.service._accept_by_code("code123", "user123", "testuser", "test@example.com")

        assert "not pending" in str(exc_info.value).lower()

    def test_accept_by_code_success(self):
        """Test successful _accept_by_code flow."""
        from app.models.invitation import InvitationStatus

        # Mock scan to return valid pending invitation
        invitation_item = {
            "PK": "INVITATION#inv123",
            "SK": "INVITATION#inv123",
            "invitation_id": "inv123",
            "invitation_code": "code123",
            "space_id": "space123",
            "invitee_email": "test@example.com",
            "inviter_user_id": "user456",
            "status": InvitationStatus.PENDING.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        }

        self.mock_db_client.scan.return_value = [invitation_item]
        self.mock_db_client.update_item.return_value = {"Attributes": invitation_item}

        # Should succeed
        result = self.service._accept_by_code("code123", "user123", "testuser", "test@example.com")

        # Verify result format
        assert result["invitation_id"] == "inv123"
        assert result["status"] == InvitationStatus.ACCEPTED.value

    # Test old invitation creation format (lines 443-462 in list_space_invitations)
    def test_list_space_invitations_formats_response(self):
        """Test list_space_invitations formats response correctly."""
        from app.models.invitation import InvitationStatus

        # Mock scan to return invitations
        invitation1 = {
            "invitation_id": "inv123",
            "space_id": "space123",
            "invitee_email": "user1@example.com",
            "inviter_user_id": "user456",
            "status": InvitationStatus.PENDING.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        }

        invitation2 = {
            "invitation_id": "inv456",
            "space_id": "space123",
            "invitee_email": "user2@example.com",
            "inviter_user_id": "user456",
            "status": InvitationStatus.PENDING.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        }

        self.mock_db_client.scan.return_value = [invitation1, invitation2]

        # Call method
        result = self.service.list_space_invitations("space123")

        # Verify response format (lines 452-465)
        assert "invitations" in result
        assert "total" in result
        assert len(result["invitations"]) == 2

        # Verify each invitation has correct fields
        for inv in result["invitations"]:
            assert "id" in inv
            assert "invitation_id" in inv
            assert "invitee_email" in inv
            assert "status" in inv
            assert "created_at" in inv

    def test_list_space_invitations_filters_expired(self):
        """Test list_space_invitations filters out expired invitations."""
        from app.models.invitation import InvitationStatus

        # Mock scan to return expired and active invitations
        active_invitation = {
            "invitation_id": "inv123",
            "space_id": "space123",
            "invitee_email": "user1@example.com",
            "inviter_user_id": "user456",
            "status": InvitationStatus.PENDING.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        }

        expired_invitation = {
            "invitation_id": "inv456",
            "space_id": "space123",
            "invitee_email": "user2@example.com",
            "inviter_user_id": "user456",
            "status": InvitationStatus.PENDING.value,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(),
            "expires_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()  # Expired
        }

        self.mock_db_client.scan.return_value = [active_invitation, expired_invitation]

        # Call method
        result = self.service.list_space_invitations("space123")

        # Should only return active invitation
        assert len(result["invitations"]) == 1
        assert result["invitations"][0]["invitation_id"] == "inv123"

    def test_list_space_invitations_empty_result(self):
        """Test list_space_invitations with no invitations."""
        # Mock scan to return empty list
        self.mock_db_client.scan.return_value = []

        # Call method
        result = self.service.list_space_invitations("space123")

        # Verify empty result
        assert result["invitations"] == []
        assert result["total"] == 0

    def test_list_space_invitations_dict_response(self):
        """Test list_space_invitations handles dict response from scan."""
        from app.models.invitation import InvitationStatus

        invitation = {
            "invitation_id": "inv123",
            "space_id": "space123",
            "invitee_email": "user1@example.com",
            "inviter_user_id": "user456",
            "status": InvitationStatus.PENDING.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        }

        # Mock scan to return dict with Items key
        self.mock_db_client.scan.return_value = {"Items": [invitation]}

        # Call method
        result = self.service.list_space_invitations("space123")

        # Verify it handles dict format
        assert len(result["invitations"]) == 1

    # Test _create_invitation_old format (lines 335-385)
    def test_create_invitation_old_format_with_role_and_message(self):
        """Test _create_invitation_old includes role and message."""
        from app.models.invitation import InvitationCreate

        # Mock scan to return no existing invitations
        self.mock_db_client.scan.return_value = []
        self.mock_db_client.put_item.return_value = {"ResponseMetadata": {"HTTPStatusCode": 200}}

        # Create invitation data with role and message
        invitation_data = InvitationCreate(
            invitee_email="test@example.com",
            space_id="space123"
        )
        invitation_data.role = "admin"
        invitation_data.message = "Welcome to the team!"

        # Call old format method
        result = self.service._create_invitation_old(
            invitation_data,
            "space123",
            "Test Space",
            "user456",
            "Test User"
        )

        # Verify result includes all fields
        assert result["invitation_id"] is not None
        assert result["invitation_code"] is not None
        assert result["space_id"] == "space123"
        assert result["invitee_email"] == "test@example.com"
        assert result["status"] == "pending"

    def test_create_invitation_old_format_with_email_field(self):
        """Test _create_invitation_old handles 'email' field."""
        from app.models.invitation import InvitationCreate

        # Mock scan to return no existing invitations
        self.mock_db_client.scan.return_value = []
        self.mock_db_client.put_item.return_value = {"ResponseMetadata": {"HTTPStatusCode": 200}}

        # Create invitation data with 'email' instead of 'invitee_email'
        invitation_data = Mock()
        invitation_data.email = "test@example.com"
        invitation_data.invitee_email = None
        invitation_data.expires_at = None

        # Call old format method
        result = self.service._create_invitation_old(
            invitation_data,
            "space123",
            "Test Space",
            "user456",
            "Test User"
        )

        # Verify email was handled correctly
        assert result["invitee_email"] == "test@example.com"

    def test_create_invitation_old_format_duplicate_check(self):
        """Test _create_invitation_old checks for duplicates."""
        from app.models.invitation import InvitationCreate, InvitationStatus
        from app.services.exceptions import InvitationAlreadyExistsError

        # Mock scan to return existing invitation
        existing_invitation = {
            "invitation_id": "existing123",
            "space_id": "space123",
            "invitee_email": "test@example.com",
            "status": InvitationStatus.PENDING.value
        }
        self.mock_db_client.scan.return_value = [existing_invitation]

        invitation_data = InvitationCreate(
            invitee_email="test@example.com",
            space_id="space123"
        )

        # Should raise InvitationAlreadyExistsError
        with pytest.raises(InvitationAlreadyExistsError) as exc_info:
            self.service._create_invitation_old(
                invitation_data,
                "space123",
                "Test Space",
                "user456",
                "Test User"
            )

        assert "already exists" in str(exc_info.value).lower()

    def test_create_invitation_old_format_with_custom_expiration(self):
        """Test _create_invitation_old respects custom expiration."""
        from app.models.invitation import InvitationCreate

        # Mock scan to return no existing invitations
        self.mock_db_client.scan.return_value = []
        self.mock_db_client.put_item.return_value = {"ResponseMetadata": {"HTTPStatusCode": 200}}

        # Create invitation data with custom expiration
        custom_expiry = datetime.now(timezone.utc) + timedelta(days=30)
        invitation_data = InvitationCreate(
            invitee_email="test@example.com",
            space_id="space123",
            expires_at=custom_expiry
        )

        # Call old format method
        result = self.service._create_invitation_old(
            invitation_data,
            "space123",
            "Test Space",
            "user456",
            "Test User"
        )

        # Verify custom expiration was used
        assert result["expires_at"] == custom_expiry.isoformat()

    def test_create_invitation_old_format_default_expiration(self):
        """Test _create_invitation_old uses 7-day default expiration."""
        from app.models.invitation import InvitationCreate

        # Mock scan to return no existing invitations
        self.mock_db_client.scan.return_value = []
        self.mock_db_client.put_item.return_value = {"ResponseMetadata": {"HTTPStatusCode": 200}}

        # Create invitation data without expiration
        invitation_data = InvitationCreate(
            invitee_email="test@example.com",
            space_id="space123"
        )

        # Call old format method
        result = self.service._create_invitation_old(
            invitation_data,
            "space123",
            "Test Space",
            "user456",
            "Test User"
        )

        # Verify expiration was set (should be ~7 days from now)
        expires_at = datetime.fromisoformat(result["expires_at"])
        created_at = datetime.fromisoformat(result["created_at"])
        expiry_delta = expires_at - created_at

        # Should be approximately 7 days
        assert 6 <= expiry_delta.days <= 8

    def test_create_invitation_old_format_includes_invitation_code(self):
        """Test _create_invitation_old generates secure invitation code."""
        from app.models.invitation import InvitationCreate

        # Mock scan to return no existing invitations
        self.mock_db_client.scan.return_value = []

        # Track what was put into DB
        put_item_calls = []
        def capture_put_item(item):
            put_item_calls.append(item)
            return {"ResponseMetadata": {"HTTPStatusCode": 200}}

        self.mock_db_client.put_item.side_effect = capture_put_item

        invitation_data = InvitationCreate(
            invitee_email="test@example.com",
            space_id="space123"
        )

        # Call old format method
        result = self.service._create_invitation_old(
            invitation_data,
            "space123",
            "Test Space",
            "user456",
            "Test User"
        )

        # Verify invitation_code was generated and stored
        assert "invitation_code" in result
        assert len(result["invitation_code"]) > 20  # Should be a secure token

        # Verify it was stored in DB
        assert len(put_item_calls) == 1
        assert "invitation_code" in put_item_calls[0]
        assert put_item_calls[0]["invitation_code"] == result["invitation_code"]
