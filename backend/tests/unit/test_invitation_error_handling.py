"""
Tests for error handling and logging in invitation routes.

These tests cover exception handling paths in:
- app/api/routes/invitations.py (lines 108-111, 220-234, 295-301, 361-367)
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta


class TestInvitationErrorHandling:
    """Test error handling and logging in invitation routes."""

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

    # Test RuntimeError handling in create_invitation (lines 108-111)
    def test_create_invitation_database_configuration_error(self):
        """Test logging when database configuration error occurs in create_invitation."""
        with patch('app.api.routes.invitations.SpaceService') as mock_space_service, \
             patch('app.api.routes.invitations.InvitationService') as mock_invitation_service:

            # Mock space service
            mock_space_instance = Mock()
            mock_space_instance.get_space.return_value = {"id": "space123", "name": "Test Space"}
            mock_space_instance.can_edit_space.return_value = True
            mock_space_service.return_value = mock_space_instance

            # Mock invitation service to raise RuntimeError
            mock_invitation_instance = Mock()
            mock_invitation_instance.create_invitation.side_effect = RuntimeError(
                "DynamoDB table 'test-table' not found"
            )
            mock_invitation_service.return_value = mock_invitation_instance

            response = self.client.post(
                "/api/spaces/space123/invitations",
                json={
                    "email": "test@example.com",
                    "role": "member"
                }
            )

            # Should return 500 with database configuration error
            assert response.status_code == 500
            data = response.json()
            assert "detail" in data
            assert "Database configuration error" in data["detail"]

    def test_create_invitation_generic_exception_logging(self):
        """Test logging when generic exception occurs in create_invitation."""
        with patch('app.api.routes.invitations.SpaceService') as mock_space_service, \
             patch('app.api.routes.invitations.InvitationService') as mock_invitation_service:

            # Mock space service
            mock_space_instance = Mock()
            mock_space_instance.get_space.return_value = {"id": "space123", "name": "Test Space"}
            mock_space_instance.can_edit_space.return_value = True
            mock_space_service.return_value = mock_space_instance

            # Mock invitation service to raise generic exception
            mock_invitation_instance = Mock()
            mock_invitation_instance.create_invitation.side_effect = Exception(
                "Unexpected database error"
            )
            mock_invitation_service.return_value = mock_invitation_instance

            response = self.client.post(
                "/api/spaces/space123/invitations",
                json={
                    "email": "test@example.com",
                    "role": "member"
                }
            )

            # Should return 500 with generic error message
            assert response.status_code == 500
            data = response.json()
            assert "detail" in data
            assert "Failed to create invitation" in data["detail"]

    def test_create_invitation_debug_mode_shows_error(self):
        """Test that debug mode shows actual error in create_invitation."""
        with patch('app.api.routes.invitations.SpaceService') as mock_space_service, \
             patch('app.api.routes.invitations.InvitationService') as mock_invitation_service, \
             patch.dict('os.environ', {'DEBUG': 'true'}):

            # Mock space service
            mock_space_instance = Mock()
            mock_space_instance.get_space.return_value = {"id": "space123", "name": "Test Space"}
            mock_space_instance.can_edit_space.return_value = True
            mock_space_service.return_value = mock_space_instance

            # Mock invitation service to raise exception
            mock_invitation_instance = Mock()
            error_message = "Detailed error information"
            mock_invitation_instance.create_invitation.side_effect = Exception(error_message)
            mock_invitation_service.return_value = mock_invitation_instance

            response = self.client.post(
                "/api/spaces/space123/invitations",
                json={
                    "email": "test@example.com",
                    "role": "member"
                }
            )

            # In debug mode, should show actual error
            assert response.status_code == 500
            data = response.json()
            assert error_message in data["detail"]

    # Test exception logging in create_bulk_invitations (lines 220-234)
    def test_create_bulk_invitations_exception_logging(self):
        """Test logging when exception occurs in create_bulk_invitations."""
        with patch('app.api.routes.invitations.SpaceService') as mock_space_service, \
             patch('app.api.routes.invitations.InvitationService') as mock_invitation_service:

            # Mock space service
            mock_space_instance = Mock()
            mock_space_instance.get_space.side_effect = Exception("Database connection error")
            mock_space_service.return_value = mock_space_instance

            response = self.client.post(
                "/api/spaces/space123/invitations/bulk",
                json={
                    "emails": ["test@example.com"],
                    "role": "member"
                }
            )

            # Should return 500 with generic error
            assert response.status_code == 500
            data = response.json()
            assert "detail" in data
            assert "Failed to create bulk invitations" in data["detail"]

    def test_create_bulk_invitations_debug_mode(self):
        """Test that debug mode shows error details in create_bulk_invitations."""
        with patch('app.api.routes.invitations.SpaceService') as mock_space_service, \
             patch.dict('os.environ', {'DEBUG': 'true'}):

            # Mock space service to raise exception
            mock_space_instance = Mock()
            error_msg = "Specific database error"
            mock_space_instance.get_space.side_effect = Exception(error_msg)
            mock_space_service.return_value = mock_space_instance

            response = self.client.post(
                "/api/spaces/space123/invitations/bulk",
                json={
                    "emails": ["test@example.com"],
                    "role": "member"
                }
            )

            # In debug mode, should show actual error
            assert response.status_code == 500
            data = response.json()
            assert error_msg in data["detail"]

    def test_create_bulk_invitations_space_not_found_exception(self):
        """Test SpaceNotFoundError handling in bulk invitations."""
        from app.services.exceptions import SpaceNotFoundError

        with patch('app.api.routes.invitations.SpaceService') as mock_space_service:

            # Mock space service to raise SpaceNotFoundError
            mock_space_instance = Mock()
            mock_space_instance.get_space.side_effect = SpaceNotFoundError("Space does not exist")
            mock_space_service.return_value = mock_space_instance

            response = self.client.post(
                "/api/spaces/nonexistent/invitations/bulk",
                json={
                    "emails": ["test@example.com"],
                    "role": "member"
                }
            )

            # Should return 404
            assert response.status_code == 404
            data = response.json()
            assert "Space does not exist" in data["detail"]

    # Test exception logging in get_space_invitations (lines 295-301)
    def test_get_space_invitations_exception_logging(self):
        """Test logging when exception occurs in get_space_invitations."""
        with patch('app.api.routes.invitations.SpaceService') as mock_space_service:

            # Mock space service to raise unexpected exception
            mock_space_instance = Mock()
            mock_space_instance.get_space.side_effect = Exception("Unexpected error")
            mock_space_service.return_value = mock_space_instance

            response = self.client.get("/api/spaces/space123/invitations")

            # Should return 500 with generic error
            assert response.status_code == 500
            data = response.json()
            assert "detail" in data
            assert "Failed to get space invitations" in data["detail"]

    def test_get_space_invitations_database_error(self):
        """Test database error handling in get_space_invitations."""
        with patch('app.api.routes.invitations.SpaceService') as mock_space_service, \
             patch('app.api.routes.invitations.InvitationService') as mock_invitation_service:

            # Mock space service
            mock_space_instance = Mock()
            mock_space_instance.get_space.return_value = {"id": "space123", "name": "Test Space"}
            mock_space_instance.is_space_admin.return_value = True
            mock_space_service.return_value = mock_space_instance

            # Mock invitation service to raise exception
            mock_invitation_instance = Mock()
            mock_invitation_instance.list_space_invitations.side_effect = Exception("DB error")
            mock_invitation_service.return_value = mock_invitation_instance

            response = self.client.get("/api/spaces/space123/invitations")

            # Should return 500
            assert response.status_code == 500
            data = response.json()
            assert "Failed to get space invitations" in data["detail"]

    # Test exception logging in accept_invitation (lines 361-367)
    # Note: Lines 363 and 365 raise exceptions that are then caught by lines 355/357
    # These tests verify the full ValueError -> specific exception -> HTTPException flow
    def test_accept_invitation_invalid_invitation_error(self):
        """Test InvalidInvitationError handling in accept_invitation."""
        from app.services.exceptions import InvalidInvitationError

        with patch('app.api.routes.invitations.InvitationService') as mock_service, \
             patch('app.api.routes.invitations.SpaceService'):

            # Mock service to raise InvalidInvitationError directly
            mock_instance = MagicMock()
            mock_instance.accept_invitation.side_effect = InvalidInvitationError("Invalid invitation")
            mock_service.return_value = mock_instance

            response = self.client.post(
                "/api/invitations/inv123/accept",
                json={}
            )

            # Should return 400
            assert response.status_code == 400
            data = response.json()
            assert "Invalid invitation" in data["detail"]

    def test_accept_invitation_expired_error(self):
        """Test InvitationExpiredError handling in accept_invitation."""
        from app.services.exceptions import InvitationExpiredError

        with patch('app.api.routes.invitations.InvitationService') as mock_service, \
             patch('app.api.routes.invitations.SpaceService'):

            # Mock service to raise InvitationExpiredError directly
            mock_instance = MagicMock()
            mock_instance.accept_invitation.side_effect = InvitationExpiredError("Invitation has expired")
            mock_service.return_value = mock_instance

            response = self.client.post(
                "/api/invitations/inv123/accept",
                json={}
            )

            # Should return 400
            assert response.status_code == 400
            data = response.json()
            assert "expired" in data["detail"].lower()

    def test_accept_invitation_value_error_generic(self):
        """Test ValueError handling for generic errors in accept_invitation."""
        with patch('app.api.routes.invitations.InvitationService') as mock_service:

            # Mock service to raise generic ValueError
            mock_instance = Mock()
            mock_instance.accept_invitation.side_effect = ValueError("Generic validation error")
            mock_service.return_value = mock_instance

            response = self.client.post(
                "/api/invitations/inv123/accept",
                json={}
            )

            # Should return 400 with error message
            assert response.status_code == 400
            data = response.json()
            assert "Generic validation error" in data["detail"]

    def test_accept_invitation_generic_exception_logging(self):
        """Test logging when generic exception occurs in accept_invitation."""
        with patch('app.api.routes.invitations.InvitationService') as mock_service:

            # Mock service to raise generic exception
            mock_instance = Mock()
            mock_instance.accept_invitation.side_effect = Exception("Database error")
            mock_service.return_value = mock_instance

            response = self.client.post(
                "/api/invitations/inv123/accept",
                json={}
            )

            # Should return 500 with generic message
            assert response.status_code == 500
            data = response.json()
            assert "Failed to accept invitation" in data["detail"]

    # Test that hasattr checks work for dict vs object format (line 193, 333, 337, 343-344)
    def test_create_invitation_handles_dict_format(self):
        """Test that create_invitation handles dict response format correctly."""
        with patch('app.api.routes.invitations.SpaceService') as mock_space_service, \
             patch('app.api.routes.invitations.InvitationService') as mock_invitation_service:

            # Mock space service
            mock_space_instance = Mock()
            mock_space_instance.get_space.return_value = {"id": "space123", "name": "Test Space"}
            mock_space_instance.can_edit_space.return_value = True
            mock_space_service.return_value = mock_space_instance

            # Mock invitation service to return dict (not object)
            mock_invitation_instance = Mock()
            mock_invitation_instance.create_invitation.return_value = {
                "id": "inv123",
                "space_id": "space123",
                "invitee_email": "test@example.com",
                "status": "pending"
            }
            mock_invitation_service.return_value = mock_invitation_instance

            response = self.client.post(
                "/api/spaces/space123/invitations",
                json={
                    "email": "test@example.com",
                    "role": "member"
                }
            )

            # Should succeed with dict format
            assert response.status_code == 201
            data = response.json()
            assert data["id"] == "inv123"

    def test_accept_invitation_handles_dict_with_space_details(self):
        """Test that accept_invitation handles dict response with space details."""
        with patch('app.api.routes.invitations.InvitationService') as mock_service, \
             patch('app.api.routes.invitations.SpaceService') as mock_space_service:

            # Mock invitation service to return dict with space_name and role
            mock_instance = Mock()
            mock_instance.accept_invitation.return_value = {
                "space_id": "space123",
                "space_name": "My Space",
                "role": "member"
            }
            mock_service.return_value = mock_instance

            # Mock space service
            mock_space_instance = Mock()
            mock_space_service.return_value = mock_space_instance

            response = self.client.post(
                "/api/invitations/inv123/accept",
                json={}
            )

            # Should succeed and format response correctly
            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            assert "My Space" in data["message"]

    def test_accept_invitation_space_service_exception(self):
        """Test that accept_invitation handles exception getting space details."""
        from app.models.invitation import Invitation, InvitationStatus

        with patch('app.api.routes.invitations.InvitationService') as mock_service, \
             patch('app.api.routes.invitations.SpaceService') as mock_space_service:

            # Mock invitation service to return object
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

            # Mock space service to raise exception
            mock_space_instance = Mock()
            mock_space_instance.get_space.side_effect = Exception("Space service error")
            mock_space_service.return_value = mock_space_instance

            response = self.client.post(
                "/api/invitations/inv123/accept",
                json={}
            )

            # Should still succeed with default space name
            assert response.status_code == 200
            data = response.json()
            assert "Test Space" in data["message"]  # Fallback name

    def test_accept_invitation_without_space_id_fallback(self):
        """Test accept_invitation fallback when space_id cannot be determined."""
        with patch('app.api.routes.invitations.InvitationService') as mock_service, \
             patch('app.api.routes.invitations.SpaceService') as mock_space_service:

            # Mock invitation service to return empty dict
            mock_instance = MagicMock()
            mock_instance.accept_invitation.return_value = {}
            mock_service.return_value = mock_instance

            # Mock space service
            mock_space_instance = MagicMock()
            mock_space_service.return_value = mock_space_instance

            response = self.client.post(
                "/api/invitations/inv123/accept",
                json={}
            )

            # Should succeed with fallback values
            assert response.status_code == 200
            data = response.json()
            assert "space123" in data["data"]["space_id"]  # Fallback ID

    def test_create_bulk_invitations_individual_exception(self):
        """Test that individual invitation failures are caught in bulk creation."""
        with patch('app.api.routes.invitations.SpaceService') as mock_space_service, \
             patch('app.api.routes.invitations.InvitationService') as mock_invitation_service:

            # Mock space service
            mock_space_instance = Mock()
            mock_space_instance.get_space.return_value = {"id": "space123", "name": "Test Space"}
            mock_space_instance.can_edit_space.return_value = True
            mock_space_service.return_value = mock_space_instance

            # Mock invitation service to raise exception for some invitations
            mock_invitation_instance = Mock()

            def mock_create(invitation_data, inviter_id):
                email = invitation_data.invitee_email
                if email == "error@example.com":
                    raise Exception("Database write error")
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
                    "emails": ["good@example.com", "error@example.com"],
                    "role": "member"
                }
            )

            # Should succeed with partial results
            assert response.status_code == 200
            data = response.json()
            assert len(data["successful"]) == 1
            assert len(data["failed"]) == 1
            assert data["failed"][0]["email"] == "error@example.com"
            assert "Database write error" in data["failed"][0]["error"]

    def test_create_bulk_invitations_with_invitation_object_response(self):
        """Test bulk invitations when service returns Invitation objects."""
        from app.models.invitation import Invitation, InvitationStatus

        with patch('app.api.routes.invitations.SpaceService') as mock_space_service, \
             patch('app.api.routes.invitations.InvitationService') as mock_invitation_service:

            # Mock space service
            mock_space_instance = Mock()
            mock_space_instance.get_space.return_value = {"id": "space123", "name": "Test Space"}
            mock_space_instance.can_edit_space.return_value = True
            mock_space_service.return_value = mock_space_instance

            # Mock invitation service to return Invitation object
            mock_invitation_instance = Mock()

            def mock_create(invitation_data, inviter_id):
                return Invitation(
                    invitation_id="inv123",
                    space_id="space123",
                    invitee_email=invitation_data.invitee_email,
                    inviter_user_id=inviter_id,
                    status=InvitationStatus.PENDING,
                    created_at=datetime.now(timezone.utc),
                    expires_at=datetime.now(timezone.utc) + timedelta(days=7)
                )

            mock_invitation_instance.create_invitation.side_effect = mock_create
            mock_invitation_service.return_value = mock_invitation_instance

            response = self.client.post(
                "/api/spaces/space123/invitations/bulk",
                json={
                    "emails": ["test@example.com"],
                    "role": "member"
                }
            )

            # Should succeed and format Invitation object correctly
            assert response.status_code == 200
            data = response.json()
            assert len(data["successful"]) == 1
            assert data["successful"][0]["id"] == "inv123"
            assert data["successful"][0]["invitee_email"] == "test@example.com"
            assert data["successful"][0]["status"] == "pending"
