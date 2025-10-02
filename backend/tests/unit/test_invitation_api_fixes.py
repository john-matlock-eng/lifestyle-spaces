"""
Tests for critical API mismatch fixes in invitation system.

These tests verify:
1. GET /api/invitations/pending returns {invitations: [...]} not [...]
2. POST /api/invitations/{id}/accept accepts empty body {}
3. GET /api/spaces/{spaceId}/invitations works correctly
4. POST /api/spaces/{spaceId}/invitations/bulk creates multiple invitations
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta


class TestInvitationAPIFixes:
    """Test critical API fixes for frontend-backend alignment."""

    def setup_method(self):
        """Set up test client and mocks."""
        from app.main import app
        from app.core.dependencies import get_current_user

        self.app = app
        self.client = TestClient(app)

        # Mock user for authenticated requests
        self.mock_user = {
            "sub": "user123",
            "email": "test@example.com",
            "username": "testuser",
            "full_name": "Test User"
        }

        # Override auth dependency
        def override_get_current_user():
            return self.mock_user

        app.dependency_overrides[get_current_user] = override_get_current_user

    def teardown_method(self):
        """Clean up dependency overrides."""
        self.app.dependency_overrides.clear()

    # Issue 1: GET /api/invitations/pending response format
    def test_get_pending_invitations_returns_wrapped_format(self):
        """Test that GET /api/invitations/pending returns {invitations: [...]} format."""
        from app.models.invitation import Invitation, InvitationStatus

        with patch('app.api.routes.invitations.InvitationService') as mock_service:
            # Create mock invitations
            mock_invitation = Invitation(
                invitation_id="inv123",
                space_id="space123",
                invitee_email="test@example.com",
                inviter_user_id="user456",
                status=InvitationStatus.PENDING,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7)
            )

            # Mock service to return list of invitations
            mock_instance = Mock()
            mock_instance.get_pending_invitations_for_user.return_value = [mock_invitation]
            mock_service.return_value = mock_instance

            response = self.client.get("/api/invitations/pending")

            assert response.status_code == 200
            data = response.json()

            # CRITICAL: Response must be wrapped in {invitations: [...]}
            assert "invitations" in data, "Response must contain 'invitations' key"
            assert isinstance(data["invitations"], list), "invitations must be a list"
            assert len(data["invitations"]) == 1

    def test_get_pending_invitations_empty_list(self):
        """Test that empty results return {invitations: []} not []."""
        with patch('app.api.routes.invitations.InvitationService') as mock_service:
            # Mock service to return empty list
            mock_instance = Mock()
            mock_instance.get_pending_invitations_for_user.return_value = []
            mock_service.return_value = mock_instance

            response = self.client.get("/api/invitations/pending")

            assert response.status_code == 200
            data = response.json()

            # CRITICAL: Even empty results must be wrapped
            assert "invitations" in data
            assert data["invitations"] == []

    # Issue 2: POST /api/invitations/{id}/accept empty body
    def test_accept_invitation_with_empty_body(self):
        """Test that POST /api/invitations/{id}/accept accepts empty body {}."""
        from app.models.invitation import Invitation, InvitationStatus

        with patch('app.api.routes.invitations.InvitationService') as mock_service, \
             patch('app.api.routes.invitations.SpaceService') as mock_space_service:

            # Mock accepted invitation
            mock_invitation = Invitation(
                invitation_id="inv123",
                space_id="space123",
                invitee_email="test@example.com",
                inviter_user_id="user456",
                status=InvitationStatus.ACCEPTED,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7)
            )

            mock_instance = Mock()
            mock_instance.accept_invitation.return_value = mock_invitation
            mock_service.return_value = mock_instance

            # Mock space service
            mock_space_instance = Mock()
            mock_space_instance.get_space.return_value = {"name": "Test Space"}
            mock_space_service.return_value = mock_space_instance

            # CRITICAL: Send empty body {} not {invitation_code: "..."}
            response = self.client.post(
                "/api/invitations/inv123/accept",
                json={}
            )

            assert response.status_code == 200
            data = response.json()
            assert "message" in data

            # Verify the service was called with invitation_id from URL, not from body
            mock_instance.accept_invitation.assert_called_once()
            # Check if invitation_id was passed (either as positional or keyword arg)
            call_args, call_kwargs = mock_instance.accept_invitation.call_args
            assert call_kwargs.get("invitation_id") == "inv123" or (call_args and call_args[0] == "inv123")

    def test_accept_invitation_without_code_in_body(self):
        """Test that invitation_code is NOT required in request body."""
        from app.models.invitation import Invitation, InvitationStatus

        with patch('app.api.routes.invitations.InvitationService') as mock_service, \
             patch('app.api.routes.invitations.SpaceService') as mock_space_service:

            mock_invitation = Invitation(
                invitation_id="inv123",
                space_id="space123",
                invitee_email="test@example.com",
                inviter_user_id="user456",
                status=InvitationStatus.ACCEPTED,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7)
            )

            mock_instance = Mock()
            mock_instance.accept_invitation.return_value = mock_invitation
            mock_service.return_value = mock_instance

            mock_space_instance = Mock()
            mock_space_instance.get_space.return_value = {"name": "Test Space"}
            mock_space_service.return_value = mock_space_instance

            # Should work with completely empty body
            response = self.client.post(
                "/api/invitations/inv456/accept",
                json={}
            )

            # Should not return 422 (validation error)
            assert response.status_code != 422, "Empty body should be accepted"
            assert response.status_code == 200

    # Issue 3: GET /api/spaces/{spaceId}/invitations
    def test_get_space_invitations_admin_only(self):
        """Test GET /api/spaces/{spaceId}/invitations returns invitations for admins."""
        with patch('app.api.routes.invitations.SpaceService') as mock_space_service, \
             patch('app.api.routes.invitations.InvitationService') as mock_invitation_service:

            # Mock space service - user is admin
            mock_space_instance = Mock()
            mock_space_instance.get_space.return_value = {"id": "space123", "name": "Test Space"}
            mock_space_instance.is_space_admin.return_value = True
            mock_space_service.return_value = mock_space_instance

            # Mock invitation service
            mock_invitation_instance = Mock()
            mock_invitation_instance.list_space_invitations.return_value = {
                "invitations": [
                    {
                        "id": "inv1",
                        "invitee_email": "user1@example.com",
                        "status": "pending"
                    },
                    {
                        "id": "inv2",
                        "invitee_email": "user2@example.com",
                        "status": "pending"
                    }
                ],
                "total": 2
            }
            mock_invitation_service.return_value = mock_invitation_instance

            response = self.client.get("/api/spaces/space123/invitations")

            assert response.status_code == 200
            data = response.json()

            # CRITICAL: Must return {invitations: [...]} format
            assert "invitations" in data
            assert isinstance(data["invitations"], list)
            assert len(data["invitations"]) == 2

    def test_get_space_invitations_non_admin_forbidden(self):
        """Test that non-admins cannot access space invitations."""
        with patch('app.api.routes.invitations.SpaceService') as mock_space_service:

            # Mock space service - user is NOT admin
            mock_space_instance = Mock()
            mock_space_instance.get_space.return_value = {"id": "space123", "name": "Test Space"}
            mock_space_instance.is_space_admin.return_value = False
            mock_space_service.return_value = mock_space_instance

            response = self.client.get("/api/spaces/space123/invitations")

            # Should return 403 Forbidden for non-admins
            assert response.status_code == 403

    def test_get_space_invitations_space_not_found(self):
        """Test 404 when space doesn't exist."""
        with patch('app.api.routes.invitations.SpaceService') as mock_space_service:

            mock_space_instance = Mock()
            mock_space_instance.get_space.return_value = None
            mock_space_service.return_value = mock_space_instance

            response = self.client.get("/api/spaces/nonexistent/invitations")

            assert response.status_code == 404

    # Issue 4: POST /api/spaces/{spaceId}/invitations/bulk
    def test_create_bulk_invitations_success(self):
        """Test creating multiple invitations at once."""
        with patch('app.api.routes.invitations.SpaceService') as mock_space_service, \
             patch('app.api.routes.invitations.InvitationService') as mock_invitation_service:

            # Mock space service
            mock_space_instance = Mock()
            mock_space_instance.get_space.return_value = {"id": "space123", "name": "Test Space"}
            mock_space_instance.can_edit_space.return_value = True
            mock_space_service.return_value = mock_space_instance

            # Mock invitation service for bulk creation
            mock_invitation_instance = Mock()

            # Mock successful creation for 2 emails, 1 failure
            def mock_create(invitation_data, inviter_id):
                email = invitation_data.invitee_email
                if email == "existing@example.com":
                    from app.services.exceptions import InvitationAlreadyExistsError
                    raise InvitationAlreadyExistsError("Already invited")
                return {
                    "id": f"inv_{email}",
                    "invitee_email": email,
                    "status": "pending"
                }

            mock_invitation_instance.create_invitation.side_effect = mock_create
            mock_invitation_service.return_value = mock_invitation_instance

            response = self.client.post(
                "/api/spaces/space123/invitations/bulk",
                json={
                    "emails": [
                        "user1@example.com",
                        "user2@example.com",
                        "existing@example.com"
                    ],
                    "role": "member",
                    "message": "Join us!"
                }
            )

            assert response.status_code == 200
            data = response.json()

            # CRITICAL: Must return success and failed lists
            assert "successful" in data
            assert "failed" in data

            assert len(data["successful"]) == 2
            assert len(data["failed"]) == 1

            # Verify failed entry format
            failed_entry = data["failed"][0]
            assert "email" in failed_entry
            assert "error" in failed_entry
            assert failed_entry["email"] == "existing@example.com"

    def test_create_bulk_invitations_empty_list(self):
        """Test bulk invitation with empty email list."""
        with patch('app.api.routes.invitations.SpaceService') as mock_space_service:

            mock_space_instance = Mock()
            mock_space_instance.get_space.return_value = {"id": "space123", "name": "Test Space"}
            mock_space_instance.can_edit_space.return_value = True
            mock_space_service.return_value = mock_space_instance

            response = self.client.post(
                "/api/spaces/space123/invitations/bulk",
                json={
                    "emails": [],
                    "role": "member"
                }
            )

            # Should return 400 for empty email list
            assert response.status_code == 400

    def test_create_bulk_invitations_invalid_emails(self):
        """Test bulk invitation with invalid email formats."""
        with patch('app.api.routes.invitations.SpaceService') as mock_space_service:

            mock_space_instance = Mock()
            mock_space_instance.get_space.return_value = {"id": "space123", "name": "Test Space"}
            mock_space_instance.can_edit_space.return_value = True
            mock_space_service.return_value = mock_space_instance

            response = self.client.post(
                "/api/spaces/space123/invitations/bulk",
                json={
                    "emails": ["invalid-email", "notanemail"],
                    "role": "member"
                }
            )

            # Invalid emails should be caught and returned in failed list
            assert response.status_code == 200
            data = response.json()
            assert "failed" in data
            assert len(data["failed"]) == 2  # Both emails should fail
            assert len(data["successful"]) == 0

    def test_create_bulk_invitations_unauthorized(self):
        """Test bulk invitation by non-admin user."""
        with patch('app.api.routes.invitations.SpaceService') as mock_space_service:

            # User does not have edit permission
            mock_space_instance = Mock()
            mock_space_instance.get_space.return_value = {"id": "space123", "name": "Test Space"}
            mock_space_instance.can_edit_space.return_value = False
            mock_space_service.return_value = mock_space_instance

            response = self.client.post(
                "/api/spaces/space123/invitations/bulk",
                json={
                    "emails": ["user@example.com"],
                    "role": "member"
                }
            )

            # Should return 403 Forbidden
            assert response.status_code == 403
