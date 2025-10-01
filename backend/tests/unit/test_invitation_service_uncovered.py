"""
Tests for uncovered lines in invitation service.

This file targets specific uncovered lines in app/services/invitation.py to improve coverage.
Missing lines: 39-58, 83, 95, 108, 123, 153, 163, 214, 222, 225, 246, 276, 285-299,
324-328, 347-371, 408-431, 438-457, 470, 475, 480-487, 509-517, 546
"""
import os
import pytest
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch, MagicMock
from botocore.exceptions import ClientError

from app.services.invitation import InvitationService
from app.models.invitation import InvitationCreate, InvitationStatus
from app.services.exceptions import (
    InvitationNotFoundException,
    UserNotFoundException,
    SpaceNotFoundException,
    InvalidInvitationError,
    InvitationExpiredError,
    InvitationAlreadyExistsError,
)


@pytest.fixture
def invitation_service():
    """Create InvitationService with mocked dependencies."""
    with patch('app.services.invitation.boto3.resource'):
        service = InvitationService()
        # Create fresh Mock instances for each test
        service.db_client = Mock()
        service.db_client.scan = Mock(return_value={"Items": []})
        service.db_client.put_item = Mock(return_value=None)
        service.db_client.query = Mock(return_value={"Items": []})
        service.space_service = Mock()
        service.user_service = Mock()
        return service


class TestMapItemToInvitation:
    """Test _map_item_to_invitation edge cases (lines 39-58)."""

    def test_map_item_with_string_dates(self, invitation_service):
        """Test mapping item with ISO format string dates."""
        item = {
            "invitation_id": "inv-123",
            "space_id": "space-456",
            "invitee_email": "test@example.com",
            "inviter_user_id": "user-789",
            "status": "pending",
            "created_at": "2024-01-01T12:00:00+00:00",
            "expires_at": "2024-01-08T12:00:00+00:00"
        }

        result = invitation_service._map_item_to_invitation(item)

        assert result.invitation_id == "inv-123"
        assert result.space_id == "space-456"
        assert result.invitee_email == "test@example.com"
        assert isinstance(result.created_at, datetime)
        assert isinstance(result.expires_at, datetime)

    def test_map_item_with_datetime_objects(self, invitation_service):
        """Test mapping item with datetime objects."""
        created = datetime.now(timezone.utc)
        expires = created + timedelta(days=7)

        item = {
            "invitation_id": "inv-456",
            "space_id": "space-789",
            "invitee_email": "user@example.com",
            "inviter_user_id": "user-123",
            "status": "pending",
            "created_at": created,
            "expires_at": expires
        }

        result = invitation_service._map_item_to_invitation(item)

        assert result.created_at == created
        assert result.expires_at == expires

    def test_map_item_without_expires_at(self, invitation_service):
        """Test mapping item without expires_at field."""
        item = {
            "invitation_id": "inv-789",
            "space_id": "space-123",
            "invitee_email": "noexpiry@example.com",
            "inviter_user_id": "user-456",
            "status": "pending",
            "created_at": "2024-01-01T12:00:00+00:00"
        }

        result = invitation_service._map_item_to_invitation(item)

        assert result.invitation_id == "inv-789"
        assert result.expires_at is None

    def test_map_item_with_none_expires_at(self, invitation_service):
        """Test mapping item with None expires_at."""
        item = {
            "invitation_id": "inv-999",
            "space_id": "space-999",
            "invitee_email": "none@example.com",
            "inviter_user_id": "user-999",
            "status": "pending",
            "created_at": "2024-01-01T12:00:00+00:00",
            "expires_at": None
        }

        result = invitation_service._map_item_to_invitation(item)

        assert result.expires_at is None


class TestGetPendingInvitationsSync:
    """Test _get_pending_invitations_sync edge cases (lines 72-84)."""

    def test_sync_with_list_result(self, invitation_service):
        """Test sync version with list result format."""
        invitation_service.user_service = None  # Force sync mode

        item = {
            "invitation_id": "inv-list",
            "space_id": "space-list",
            "invitee_email": "list@example.com",
            "inviter_user_id": "user-list",
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        }

        # Mock query to return a list directly (test format)
        invitation_service.db_client.query.return_value = [item]

        result = invitation_service._get_pending_invitations_sync("list@example.com")

        assert len(result) == 1
        assert result[0].invitation_id == "inv-list"

    def test_sync_with_dict_result(self, invitation_service):
        """Test sync version with dict result format (line 83)."""
        invitation_service.user_service = None

        item = {
            "invitation_id": "inv-dict",
            "space_id": "space-dict",
            "invitee_email": "dict@example.com",
            "inviter_user_id": "user-dict",
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        }

        # Mock query to return dict with Items key (production format)
        invitation_service.db_client.query.return_value = {"Items": [item]}

        result = invitation_service._get_pending_invitations_sync("dict@example.com")

        assert len(result) == 1
        assert result[0].invitation_id == "inv-dict"


class TestGetPendingInvitationsAsync:
    """Test _get_pending_invitations_async edge cases (lines 86-98)."""

    @pytest.mark.asyncio
    async def test_async_with_list_result(self, invitation_service):
        """Test async version with list result format (line 95)."""
        item = {
            "invitation_id": "inv-async-list",
            "space_id": "space-async",
            "invitee_email": "async@example.com",
            "inviter_user_id": "user-async",
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        }

        # Mock query to return list
        invitation_service.db_client.query.return_value = [item]

        result = await invitation_service._get_pending_invitations_async("async@example.com")

        assert len(result) == 1
        assert result[0].invitation_id == "inv-async-list"


class TestGetAllPendingInvitations:
    """Test get_all_pending_invitations edge cases (lines 100-111)."""

    @pytest.mark.asyncio
    async def test_get_all_with_list_result(self, invitation_service):
        """Test get_all_pending_invitations with list result (line 108)."""
        item = {
            "invitation_id": "inv-all",
            "space_id": "space-all",
            "invitee_email": "all@example.com",
            "inviter_user_id": "user-all",
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        }

        invitation_service.db_client.query.return_value = [item]

        result = await invitation_service.get_all_pending_invitations()

        assert len(result) == 1
        assert result[0].invitation_id == "inv-all"


class TestGetPendingInvitationsForAdmin:
    """Test get_pending_invitations_for_admin edge cases (lines 113-124)."""

    def test_get_pending_for_admin_with_list_result(self, invitation_service):
        """Test admin version with list result (line 123)."""
        item = {
            "invitation_id": "inv-admin",
            "space_id": "space-admin",
            "invitee_email": "admin@example.com",
            "inviter_user_id": "user-admin",
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        }

        invitation_service.db_client.scan.return_value = [item]

        result = invitation_service.get_pending_invitations_for_admin()

        assert len(result) == 1
        assert result[0].invitation_id == "inv-admin"


class TestAcceptInvitationRaisesValueError:
    """Test accept_invitation raises ValueError (line 153)."""

    def test_accept_without_code_or_id(self, invitation_service):
        """Test accept_invitation raises ValueError when neither code nor ID provided."""
        with pytest.raises(ValueError) as exc_info:
            invitation_service.accept_invitation()

        assert "Either invitation_code or invitation_id must be provided" in str(exc_info.value)


class TestAcceptByIdSync:
    """Test _accept_by_id_sync edge cases (lines 155-202)."""

    def test_accept_sync_with_item_wrapper(self, invitation_service):
        """Test accept sync with {"Item": {...}} wrapper (line 163)."""
        invitation_service.user_service = None  # Force sync mode

        item = {
            "invitation_id": "inv-sync",
            "space_id": "space-sync",
            "invitee_email": "sync@example.com",
            "inviter_user_id": "user-sync",
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        }

        # Return item wrapped in "Item" key
        invitation_service.db_client.get_item.return_value = {"Item": item}
        invitation_service.db_client.update_item.return_value = {"Attributes": item}

        result = invitation_service._accept_by_id_sync("inv-sync", "user-sync")

        assert result.invitation_id == "inv-sync"


class TestAcceptByIdAsync:
    """Test _accept_by_id_async exception paths (lines 204-264)."""

    @pytest.mark.asyncio
    async def test_accept_async_invitation_not_found(self, invitation_service):
        """Test async accept raises InvitationNotFoundException (line 214)."""
        invitation_service.db_client.get_item.return_value = None

        with pytest.raises(InvitationNotFoundException) as exc_info:
            await invitation_service._accept_by_id_async("missing-inv", "user-123")

        assert "Invitation not found" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_accept_async_email_mismatch(self, invitation_service):
        """Test async accept raises error for email mismatch (line 222)."""
        item = {
            "invitation_id": "inv-mismatch",
            "space_id": "space-123",
            "invitee_email": "correct@example.com",
            "inviter_user_id": "user-456",
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        }

        invitation_service.db_client.get_item.return_value = item

        with pytest.raises(InvitationNotFoundException) as exc_info:
            await invitation_service._accept_by_id_async("inv-mismatch", "user-123", "wrong@example.com")

        assert "not for this user" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_accept_async_expired_invitation(self, invitation_service):
        """Test async accept raises error for expired invitation (line 225)."""
        item = {
            "invitation_id": "inv-expired",
            "space_id": "space-123",
            "invitee_email": "expired@example.com",
            "inviter_user_id": "user-456",
            "status": "pending",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=14)).isoformat(),
            "expires_at": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        }

        invitation_service.db_client.get_item.return_value = item

        with pytest.raises(ValueError) as exc_info:
            await invitation_service._accept_by_id_async("inv-expired", "user-123")

        assert "expired" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_accept_async_with_production_mode(self, invitation_service):
        """Test async accept in production mode without user_service (line 246)."""
        item = {
            "invitation_id": "inv-prod",
            "space_id": "space-prod",
            "invitee_email": "prod@example.com",
            "inviter_user_id": "user-prod",
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        }

        invitation_service.db_client.get_item.return_value = item
        invitation_service.db_client.update_item.return_value = item
        invitation_service.user_service = None  # Production mode

        result = await invitation_service._accept_by_id_async("inv-prod", "user-prod")

        # Should call space_service.add_member in production mode
        invitation_service.space_service.add_member.assert_called_once()


class TestAcceptByCode:
    """Test _accept_by_code exception paths (lines 266-305)."""

    def test_accept_by_code_invalid_code(self, invitation_service):
        """Test accept by code with invalid code (line 276)."""
        invitation_service.db_client.scan.return_value = {"Items": []}

        with pytest.raises(InvalidInvitationError) as exc_info:
            invitation_service._accept_by_code("invalid-code", "user-123", "username", "email@test.com")

        assert "Invalid invitation code" in str(exc_info.value)

    def test_accept_by_code_expired(self, invitation_service):
        """Test accept by code with expired invitation (lines 285-286)."""
        item = {
            "PK": "INVITATION#inv-123",
            "SK": "INVITATION#inv-123",
            "invitation_id": "inv-123",
            "space_id": "space-456",
            "invitee_email": "test@example.com",
            "status": "pending",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=14)).isoformat(),
            "expires_at": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        }

        invitation_service.db_client.scan.return_value = {"Items": [item]}

        with pytest.raises(InvitationExpiredError) as exc_info:
            invitation_service._accept_by_code("expired-code", "user-123", "username", "email@test.com")

        assert "expired" in str(exc_info.value).lower()

    def test_accept_by_code_success(self, invitation_service):
        """Test successful accept by code (lines 288-305)."""
        item = {
            "PK": "INVITATION#inv-success",
            "SK": "INVITATION#inv-success",
            "invitation_id": "inv-success",
            "space_id": "space-789",
            "invitee_email": "success@example.com",
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        }

        invitation_service.db_client.scan.return_value = {"Items": [item]}
        invitation_service.db_client.update_item.return_value = item

        result = invitation_service._accept_by_code("valid-code", "user-123", "testuser", "test@example.com")

        assert result["invitation_id"] == "inv-success"
        assert result["status"] == InvitationStatus.ACCEPTED.value
        invitation_service.db_client.update_item.assert_called_once()


class TestCreateInvitationMultipleSignatures:
    """Test create_invitation with different signatures (lines 308-328)."""

    def test_create_with_old_signature(self, invitation_service):
        """Test create_invitation with old test signature (lines 314-315)."""
        invitation_data = InvitationCreate(
            invitee_email="old@example.com",
            space_id="space-123"
        )

        invitation_service.db_client.scan.return_value = {"Items": []}

        # Mock put_item to return success indication
        def mock_put_item(item):
            return {"ResponseMetadata": {"HTTPStatusCode": 200}}

        invitation_service.db_client.put_item = mock_put_item

        result = invitation_service.create_invitation(
            invitation=invitation_data,
            space_id="space-123",
            space_name="Test Space",
            inviter_id="user-456",
            inviter_name="Test User"
        )

        assert result["invitee_email"] == "old@example.com"
        assert "invitation_code" in result

    def test_create_with_new_positional_args(self, invitation_service):
        """Test create_invitation with new positional args signature (lines 319-321)."""
        invitation_data = InvitationCreate(
            invitee_email="new@example.com",
            space_id="space-789"
        )

        invitation_service.db_client.put_item.return_value = None

        # Call with positional args - space_id param becomes inviter_user_id
        result = invitation_service.create_invitation(invitation_data, "user-inviter")

        assert result.invitee_email == "new@example.com"

    def test_create_with_keyword_args(self, invitation_service):
        """Test create_invitation with keyword args (lines 324-326)."""
        invitation_data = InvitationCreate(
            invitee_email="keyword@example.com",
            space_id="space-999"
        )

        invitation_service.db_client.put_item.return_value = None

        result = invitation_service.create_invitation(
            invitation_data=invitation_data,
            inviter_user_id="user-keyword"
        )

        assert result.invitee_email == "keyword@example.com"

    def test_create_with_invalid_args(self, invitation_service):
        """Test create_invitation raises ValueError for invalid args (line 328)."""
        with pytest.raises(ValueError) as exc_info:
            invitation_service.create_invitation()

        assert "Invalid arguments" in str(exc_info.value)


class TestCreateInvitationOld:
    """Test _create_invitation_old method (lines 330-380)."""

    def test_create_old_duplicate_invitation(self, invitation_service):
        """Test _create_invitation_old raises error for duplicate (lines 334-345)."""
        invitation_data = InvitationCreate(
            invitee_email="duplicate@example.com",
            space_id="space-123"
        )

        # Mock existing invitation
        existing_item = {
            "invitation_id": "existing-inv",
            "invitee_email": "duplicate@example.com",
            "space_id": "space-123",
            "status": "pending"
        }

        invitation_service.db_client.scan.return_value = {"Items": [existing_item]}

        with pytest.raises(InvitationAlreadyExistsError) as exc_info:
            invitation_service._create_invitation_old(
                invitation_data,
                "space-123",
                "Test Space",
                "user-456",
                "Test User"
            )

        assert "already exists" in str(exc_info.value).lower()

    def test_create_old_with_email_attribute(self, invitation_service):
        """Test _create_invitation_old with email attribute (lines 347-380)."""
        # Create invitation with 'email' instead of 'invitee_email'
        class OldInvitation:
            email = "oldemail@example.com"
            role = "member"
            message = "Join us!"
            expires_at = None

        invitation_service.db_client.scan.return_value = {"Items": []}
        invitation_service.db_client.put_item.return_value = None

        result = invitation_service._create_invitation_old(
            OldInvitation(),
            "space-old",
            "Old Space",
            "user-old",
            "Old User"
        )

        assert result["invitee_email"] == "oldemail@example.com"
        assert "invitation_code" in result


class TestListUserInvitations:
    """Test list_user_invitations fallback logic (lines 405-434)."""

    def test_list_user_invitations_gsi_failure_fallback(self, invitation_service):
        """Test list_user_invitations falls back to scan on GSI error (lines 408-423)."""
        # First call (GSI query) raises exception
        invitation_service.db_client.query.side_effect = Exception("GSI not available")

        # Second call (scan fallback) succeeds
        item = {
            "invitation_id": "inv-fallback",
            "space_id": "space-fallback",
            "invitee_email": "fallback@example.com",
            "inviter_user_id": "user-fallback",
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        }

        invitation_service.db_client.scan.return_value = {"Items": [item]}

        result = invitation_service.list_user_invitations("fallback@example.com")

        assert len(result["invitations"]) == 1
        assert result["total"] == 1
        # Verify scan was called after query failed
        invitation_service.db_client.scan.assert_called_once()

    def test_list_user_invitations_with_list_result(self, invitation_service):
        """Test list_user_invitations with list result (lines 426-430)."""
        item = {
            "invitation_id": "inv-list",
            "space_id": "space-list",
            "invitee_email": "list@example.com",
            "inviter_user_id": "user-list",
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        }

        # Return list instead of dict
        invitation_service.db_client.query.return_value = [item]

        result = invitation_service.list_user_invitations("list@example.com")

        assert len(result["invitations"]) == 1


class TestCancelInvitation:
    """Test cancel_invitation edge cases (lines 462-490)."""

    def test_cancel_with_item_wrapper(self, invitation_service):
        """Test cancel_invitation with {"Item": {...}} wrapper (line 470)."""
        item = {
            "invitation_id": "inv-cancel",
            "space_id": "space-cancel",
            "invitee_email": "cancel@example.com",
            "inviter_user_id": "user-cancel",
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        }

        invitation_service.db_client.get_item.return_value = {"Item": item}
        invitation_service.db_client.update_item.return_value = item

        result = invitation_service.cancel_invitation("inv-cancel", "user-canceller")

        assert result["id"] == "inv-cancel"
        assert result["status"] == InvitationStatus.DECLINED.value

    def test_cancel_invitation_not_found(self, invitation_service):
        """Test cancel_invitation raises error when not found (line 475)."""
        invitation_service.db_client.get_item.return_value = None

        with pytest.raises(InvalidInvitationError) as exc_info:
            invitation_service.cancel_invitation("missing-inv", "user-123")

        assert "not found" in str(exc_info.value).lower()

    def test_cancel_non_pending_invitation(self, invitation_service):
        """Test cancel_invitation raises error for non-pending (lines 477-478)."""
        item = {
            "invitation_id": "inv-accepted",
            "status": "accepted"
        }

        invitation_service.db_client.get_item.return_value = item

        with pytest.raises(InvalidInvitationError) as exc_info:
            invitation_service.cancel_invitation("inv-accepted", "user-123")

        assert "Can only cancel pending" in str(exc_info.value)

    def test_cancel_success(self, invitation_service):
        """Test successful cancellation (lines 480-490)."""
        item = {
            "invitation_id": "inv-to-cancel",
            "status": "pending"
        }

        invitation_service.db_client.get_item.return_value = item
        invitation_service.db_client.update_item.return_value = item

        result = invitation_service.cancel_invitation("inv-to-cancel", "user-canceller")

        assert result["status"] == InvitationStatus.DECLINED.value
        invitation_service.db_client.update_item.assert_called_once()


class TestGetInvitationByCode:
    """Test _get_invitation_by_code edge cases (lines 507-517)."""

    def test_get_by_code_with_list_result(self, invitation_service):
        """Test _get_invitation_by_code with list result (lines 513-516)."""
        item = {
            "invitation_id": "inv-by-code",
            "invitation_code": "test-code-123"
        }

        # Return list instead of dict
        invitation_service.db_client.scan.return_value = [item]

        result = invitation_service._get_invitation_by_code("test-code-123")

        assert result["invitation_id"] == "inv-by-code"

    def test_get_by_code_not_found(self, invitation_service):
        """Test _get_invitation_by_code returns None when not found (line 517)."""
        invitation_service.db_client.scan.return_value = {"Items": []}

        result = invitation_service._get_invitation_by_code("missing-code")

        assert result is None


class TestCreateTable:
    """Test _create_table exception handling (lines 526-546)."""

    def test_create_table_resource_in_use(self):
        """Test _create_table handles ResourceInUseException (lines 544-546)."""
        with patch('app.services.invitation.boto3.resource') as mock_resource:
            mock_dynamodb = Mock()
            mock_resource.return_value = mock_dynamodb

            # Mock table that doesn't exist initially
            mock_table = Mock()
            mock_dynamodb.Table.return_value = mock_table

            # First call to create_table raises ResourceInUseException
            error_response = {'Error': {'Code': 'ResourceInUseException'}}
            mock_dynamodb.create_table.side_effect = ClientError(
                error_response=error_response,
                operation_name='CreateTable'
            )

            service = InvitationService()

            # Should handle the exception and return existing table
            result = service._create_table()

            # Verify it returned the table from Table() call
            assert result == mock_table

    def test_create_table_other_error(self):
        """Test _create_table re-raises other errors."""
        with patch('app.services.invitation.boto3.resource') as mock_resource:
            mock_dynamodb = Mock()
            mock_resource.return_value = mock_dynamodb

            mock_table = Mock()
            mock_dynamodb.Table.return_value = mock_table

            # Raise a different error
            error_response = {'Error': {'Code': 'AccessDenied'}}
            mock_dynamodb.create_table.side_effect = ClientError(
                error_response=error_response,
                operation_name='CreateTable'
            )

            service = InvitationService()

            # Should re-raise the error
            with pytest.raises(ClientError) as exc_info:
                service._create_table()

            assert exc_info.value.response['Error']['Code'] == 'AccessDenied'
