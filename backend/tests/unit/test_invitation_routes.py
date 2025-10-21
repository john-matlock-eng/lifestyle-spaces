"""
Comprehensive unit tests for invitation endpoints.
"""
import pytest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from app.services.exceptions import (
    InvitationAlreadyExistsError, InvalidInvitationError,
    InvitationExpiredError, SpaceNotFoundError, UnauthorizedError
)


class TestInvitationRoutes:
    """Test invitation endpoints with full coverage."""
    
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
    
    def test_create_invitation_success(self):
        """Test successful invitation creation."""
        with patch('app.api.routes.invitations.SpaceService') as mock_space_service, \
             patch('app.api.routes.invitations.InvitationService') as mock_invitation_service:
            
            # Mock space service
            mock_space_instance = Mock()
            mock_space_instance.get_space.return_value = {"id": "space123", "name": "Test Space"}
            mock_space_instance.can_edit_space.return_value = True
            mock_space_service.return_value = mock_space_instance
            
            # Mock invitation service
            mock_invitation_instance = Mock()
            mock_invitation_instance.create_invitation.return_value = {
                "id": "inv123",
                "space_id": "space123", 
                "space_name": "Test Space",
                "inviter_id": "user123",
                "inviter_name": "Test User",
                "invitee_email": "invite@example.com",
                "role": "member",
                "status": "pending",
                "expires_at": "2024-12-31T23:59:59.000000+00:00",
                "created_at": "2024-01-01T00:00:00.000000+00:00"
            }
            mock_invitation_service.return_value = mock_invitation_instance
            
            response = self.client.post(
                "/api/spaces/space123/invitations",
                json={
                    "email": "invite@example.com",
                    "role": "member",
                    "message": "Join our space!"
                }
            )
            
            assert response.status_code == 201
            data = response.json()
            assert data["id"] == "inv123"
            assert data["invitee_email"] == "invite@example.com"
            assert data["space_name"] == "Test Space"
    
    def test_create_invitation_already_exists_error(self):
        """Test invitation creation when invitation already exists."""
        with patch('app.api.routes.invitations.SpaceService') as mock_space_service, \
             patch('app.api.routes.invitations.InvitationService') as mock_invitation_service:
            
            # Mock space service
            mock_space_instance = Mock()
            mock_space_instance.get_space.return_value = {"id": "space123", "name": "Test Space"}
            mock_space_instance.can_edit_space.return_value = True
            mock_space_service.return_value = mock_space_instance
            
            # Mock invitation service to raise error
            mock_invitation_instance = Mock()
            mock_invitation_instance.create_invitation.side_effect = InvitationAlreadyExistsError("Invitation already exists")
            mock_invitation_service.return_value = mock_invitation_instance
            
            response = self.client.post(
                "/api/spaces/space123/invitations",
                json={
                    "email": "invite@example.com",
                    "role": "member"
                }
            )
            
            assert response.status_code == 400
            assert "Invitation already exists" in response.json()["detail"]
    
    def test_create_invitation_space_not_found_error(self):
        """Test invitation creation when space is not found."""
        with patch('app.api.routes.invitations.SpaceService') as mock_space_service:
            
            # Mock space service to raise error
            mock_space_instance = Mock()
            mock_space_instance.get_space.side_effect = SpaceNotFoundError("Space not found")
            mock_space_service.return_value = mock_space_instance
            
            response = self.client.post(
                "/api/spaces/space123/invitations",
                json={
                    "email": "invite@example.com",
                    "role": "member"
                }
            )
            
            assert response.status_code == 404
            assert "Space not found" in response.json()["detail"]
    
    def test_create_invitation_unauthorized_error(self):
        """Test invitation creation when user is not authorized."""
        with patch('app.api.routes.invitations.SpaceService') as mock_space_service:
            
            # Mock space service
            mock_space_instance = Mock()
            mock_space_instance.get_space.return_value = {"id": "space123", "name": "Test Space"}
            mock_space_instance.can_edit_space.return_value = False  # No permission
            mock_space_service.return_value = mock_space_instance
            
            response = self.client.post(
                "/api/spaces/space123/invitations",
                json={
                    "email": "invite@example.com",
                    "role": "member"
                }
            )
            
            assert response.status_code == 403
            assert "You don't have permission to invite members" in response.json()["detail"]
    
    def test_create_invitation_generic_error(self):
        """Test invitation creation with generic exception."""
        with patch('app.api.routes.invitations.SpaceService') as mock_space_service:
            
            # Mock space service to raise generic error
            mock_space_instance = Mock()
            mock_space_instance.get_space.side_effect = Exception("Database error")
            mock_space_service.return_value = mock_space_instance
            
            response = self.client.post(
                "/api/spaces/space123/invitations",
                json={
                    "email": "invite@example.com",
                    "role": "member"
                }
            )
            
            assert response.status_code == 500
            assert "Failed to create invitation" in response.json()["detail"]
    
    def test_get_invitations_success(self):
        """Test successful invitations retrieval."""
        with patch('app.api.routes.invitations.InvitationService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.list_user_invitations.return_value = {
                "invitations": [
                    {
                        "id": "inv123",
                        "space_id": "space123",
                        "space_name": "Test Space",
                        "inviter_id": "inviter123",
                        "inviter_name": "Inviter User",
                        "invitee_email": "test@example.com",
                        "role": "member",
                        "status": "pending",
                        "expires_at": "2024-12-31T23:59:59.000000+00:00",
                        "created_at": "2024-01-01T00:00:00.000000+00:00"
                    }
                ],
                "total": 1
            }
            mock_service.return_value = mock_service_instance
            
            response = self.client.get("/api/invitations")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data["invitations"]) == 1
            assert data["invitations"][0]["id"] == "inv123"
            assert data["total"] == 1
    
    def test_get_invitations_generic_error(self):
        """Test invitations retrieval with generic error."""
        with patch('app.api.routes.invitations.InvitationService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.list_user_invitations.side_effect = Exception("Database error")
            mock_service.return_value = mock_service_instance
            
            response = self.client.get("/api/invitations")
            
            assert response.status_code == 500
            assert "Failed to get invitations" in response.json()["detail"]
    
    def test_accept_invitation_success(self):
        """Test successful invitation acceptance."""
        with patch('app.api.routes.invitations.InvitationService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.accept_invitation.return_value = {
                "space_name": "Test Space",
                "role": "member",
                "space_id": "space123"
            }
            mock_service.return_value = mock_service_instance
            
            response = self.client.post(
                "/api/invitations/inv123/accept",
                json={
                    "invitation_code": "code123"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "Successfully joined Test Space as member" in data["message"]
            assert data["data"]["space_name"] == "Test Space"
            assert data["data"]["role"] == "member"
    
    def test_accept_invitation_invalid_invitation_error(self):
        """Test invitation acceptance with invalid invitation."""
        with patch('app.api.routes.invitations.InvitationService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.accept_invitation.side_effect = InvalidInvitationError("Invalid invitation code")
            mock_service.return_value = mock_service_instance
            
            response = self.client.post(
                "/api/invitations/inv123/accept",
                json={
                    "invitation_code": "invalid_code"
                }
            )
            
            assert response.status_code == 400
            assert "Invalid invitation code" in response.json()["detail"]
    
    def test_accept_invitation_expired_error(self):
        """Test invitation acceptance with expired invitation."""
        with patch('app.api.routes.invitations.InvitationService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.accept_invitation.side_effect = InvitationExpiredError("Invitation has expired")
            mock_service.return_value = mock_service_instance
            
            response = self.client.post(
                "/api/invitations/inv123/accept",
                json={
                    "invitation_code": "code123"
                }
            )
            
            assert response.status_code == 400
            assert "Invitation has expired" in response.json()["detail"]
    
    def test_accept_invitation_generic_error(self):
        """Test invitation acceptance with generic error."""
        with patch('app.api.routes.invitations.InvitationService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.accept_invitation.side_effect = Exception("Database error")
            mock_service.return_value = mock_service_instance
            
            response = self.client.post(
                "/api/invitations/inv123/accept",
                json={
                    "invitation_code": "code123"
                }
            )
            
            assert response.status_code == 500
            assert "Failed to accept invitation" in response.json()["detail"]