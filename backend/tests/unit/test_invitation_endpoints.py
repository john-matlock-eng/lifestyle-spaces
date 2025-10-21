"""
Unit tests for invitation management endpoints.
"""
import pytest
from unittest.mock import Mock, patch
from fastapi import status
from fastapi.testclient import TestClient
from app.services.exceptions import (
    InvalidInviteCodeError, 
    AlreadyMemberError,
    SpaceNotFoundError,
    UnauthorizedError
)


class TestInvitationEndpoints:
    """Test invitation management endpoints with full coverage."""
    
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
            "username": "testuser"
        }
        
        # Override auth dependency
        def override_get_current_user():
            return self.mock_user
            
        app.dependency_overrides[get_current_user] = override_get_current_user
    
    def teardown_method(self):
        """Clean up dependency overrides."""
        self.app.dependency_overrides.clear()
    
    def test_regenerate_invite_code_success_as_owner(self):
        """Test successful invite code regeneration by owner."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            
            # Mock get_member to return owner
            mock_service_instance.get_member.return_value = {
                "user_id": "user123",
                "role": "owner"
            }
            
            # Mock regenerate_invite_code
            mock_service_instance.regenerate_invite_code.return_value = "NEWCODE123"
            
            response = self.client.post("/api/spaces/space123/invite")
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["invite_code"] == "NEWCODE123"
            assert data["invite_url"] == "/join/NEWCODE123"
            
            # Verify service calls
            mock_service_instance.get_member.assert_called_once_with("space123", "user123")
            mock_service_instance.regenerate_invite_code.assert_called_once_with("space123")
    
    def test_regenerate_invite_code_success_as_admin(self):
        """Test successful invite code regeneration by admin."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            
            # Mock get_member to return admin
            mock_service_instance.get_member.return_value = {
                "user_id": "user123",
                "role": "admin"
            }
            
            mock_service_instance.regenerate_invite_code.return_value = "ADMIN456"
            
            response = self.client.post("/api/spaces/space456/invite")
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["invite_code"] == "ADMIN456"
    
    def test_regenerate_invite_code_forbidden_as_member(self):
        """Test invite code regeneration forbidden for regular members."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            
            # Mock get_member to return regular member
            mock_service_instance.get_member.return_value = {
                "user_id": "user123",
                "role": "member"
            }
            
            response = self.client.post("/api/spaces/space123/invite")
            
            assert response.status_code == status.HTTP_403_FORBIDDEN
            assert "Only owners and admins" in response.json()["detail"]
            mock_service_instance.regenerate_invite_code.assert_not_called()
    
    def test_regenerate_invite_code_not_member(self):
        """Test invite code regeneration when user is not a member."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            
            # Mock get_member to return None (not a member)
            mock_service_instance.get_member.return_value = None
            
            response = self.client.post("/api/spaces/space123/invite")
            
            assert response.status_code == status.HTTP_403_FORBIDDEN
            assert "Only owners and admins" in response.json()["detail"]
    
    def test_regenerate_invite_code_service_error(self):
        """Test handling of service errors during invite code regeneration."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            
            mock_service_instance.get_member.return_value = {"role": "owner"}
            mock_service_instance.regenerate_invite_code.side_effect = Exception("Database error")
            
            response = self.client.post("/api/spaces/space123/invite")
            
            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            assert "Failed to regenerate invite code" in response.json()["detail"]
    
    def test_join_space_with_code_success(self):
        """Test successfully joining a space with invite code."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            
            # Mock join_space_with_invite_code
            mock_service_instance.join_space_with_invite_code.return_value = {
                "space_id": "space123"
            }
            
            # Mock get_space for full details
            mock_service_instance.get_space.return_value = {
                "id": "space123",
                "name": "Test Space",
                "description": "A test space",
                "type": "workspace",
                "owner_id": "owner456",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
                "member_count": 5,
                "is_public": False,
                "is_owner": False
            }
            
            response = self.client.post(
                "/api/spaces/join",
                json={"invite_code": "TESTCODE"}
            )
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["spaceId"] == "space123"
            assert data["name"] == "Test Space"
            
            # Verify service calls
            mock_service_instance.join_space_with_invite_code.assert_called_once_with(
                invite_code="TESTCODE",
                user_id="user123"
            )
            mock_service_instance.get_space.assert_called_once_with(
                space_id="space123",
                user_id="user123"
            )
    
    def test_join_space_invalid_code(self):
        """Test joining space with invalid invite code."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            
            # Mock join_space_with_invite_code to raise InvalidInviteCodeError
            mock_service_instance.join_space_with_invite_code.side_effect = InvalidInviteCodeError("Invalid code")
            
            response = self.client.post(
                "/api/spaces/join",
                json={"invite_code": "BADCODE"}
            )
            
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "Invalid code" in response.json()["detail"]
    
    def test_join_space_already_member(self):
        """Test joining space when already a member."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            
            # Mock join_space_with_invite_code to raise AlreadyMemberError
            mock_service_instance.join_space_with_invite_code.side_effect = AlreadyMemberError("Already a member")
            
            response = self.client.post(
                "/api/spaces/join",
                json={"invite_code": "VALIDCODE"}
            )
            
            assert response.status_code == status.HTTP_409_CONFLICT
            assert "Already a member" in response.json()["detail"]
    
    def test_join_space_missing_invite_code(self):
        """Test joining space without providing invite code."""
        response = self.client.post(
            "/api/spaces/join",
            json={}
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_join_space_generic_exception(self):
        """Test handling of generic exceptions when joining space."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            
            # Mock generic exception in get_space after join
            mock_service_instance.join_space_with_invite_code.return_value = {"space_id": "space123"}
            mock_service_instance.get_space.side_effect = Exception("Database error")
            
            response = self.client.post(
                "/api/spaces/join",
                json={"invite_code": "TESTCODE"}
            )
            
            # Generic exceptions should result in 500 error
            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR