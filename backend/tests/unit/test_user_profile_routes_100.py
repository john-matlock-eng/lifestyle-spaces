"""Comprehensive tests for achieving 100% coverage of app/api/routes/user_profile.py."""

import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi import HTTPException, status
from fastapi.testclient import TestClient
from botocore.exceptions import ClientError

from app.main import app


class TestUserProfileRoutes100Coverage:
    """Test class for 100% coverage of user_profile routes."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)
    
    @pytest.fixture
    def mock_current_user(self):
        """Mock current user for authentication."""
        return {
            "user_id": "test-user-123",
            "email": "test@example.com",
            "username": "testuser"
        }
    
    def test_get_profile_cognito_sync_exception(self, client, mock_current_user):
        """Test GET /profile handles Cognito sync exceptions - Lines 63-65."""
        with patch('app.api.routes.user_profile.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
                # Mock profile service to return profile
                mock_profile = {
                    "user_id": "test-user-123",
                    "email": "old@example.com",
                    "username": "olduser",
                    "display_name": "Test User",
                    "bio": "Test bio",
                    "avatar_url": None,
                    "phone_number": None,
                    "location": None,
                    "is_verified": False,
                    "is_onboarded": True,
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z"
                }
                mock_service.return_value.get_user_profile.return_value = mock_profile
                
                # Mock Cognito service to raise exception
                with patch('app.api.routes.user_profile.CognitoService') as mock_cognito:
                    mock_cognito.return_value.get_user_attributes.side_effect = Exception("Cognito error")
                    
                    response = client.get("/api/profile")
                    assert response.status_code == 200
                    # Should still return profile even if Cognito sync fails
                    data = response.json()
                    assert data["user_id"] == "test-user-123"
    
    def test_get_profile_resource_not_found_error(self, client, mock_current_user):
        """Test GET /profile handles ResourceNotFoundException - Lines 70-74."""
        with patch('app.api.routes.user_profile.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
                # Mock service to raise ClientError with ResourceNotFoundException
                error = ClientError(
                    error_response={'Error': {'Code': 'ResourceNotFoundException'}},
                    operation_name='GetItem'
                )
                mock_service.return_value.get_user_profile.side_effect = error
                
                response = client.get("/api/profile")
                assert response.status_code == 500
                assert "Failed to retrieve user profile" in response.json()["detail"]
    
    def test_get_profile_generic_client_error(self, client, mock_current_user):
        """Test GET /profile handles generic ClientError - Lines 75-78."""
        with patch('app.api.routes.user_profile.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
                # Mock service to raise generic ClientError
                error = ClientError(
                    error_response={'Error': {'Code': 'InternalServerError'}},
                    operation_name='GetItem'
                )
                mock_service.return_value.get_user_profile.side_effect = error
                
                response = client.get("/api/profile")
                assert response.status_code == 500
                assert "Failed to retrieve user profile" in response.json()["detail"]
    
    def test_get_profile_generic_exception(self, client, mock_current_user):
        """Test GET /profile handles generic Exception - Lines 81-86."""
        with patch('app.api.routes.user_profile.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
                # Mock service to raise generic exception
                mock_service.return_value.get_user_profile.side_effect = Exception("Database error")
                
                response = client.get("/api/profile")
                assert response.status_code == 500
                assert "Failed to retrieve user profile" in response.json()["detail"]
    
    def test_update_profile_cognito_sync_failure(self, client, mock_current_user):
        """Test PUT /profile handles Cognito sync failure - Lines 128-132."""
        update_data = {
            "display_name": "New Name",
            "email": "newemail@example.com"
        }
        
        with patch('app.api.routes.user_profile.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.user_profile.CognitoService') as mock_cognito:
                # Mock Cognito update to raise exception
                mock_cognito.return_value.update_user_attributes.side_effect = Exception("Cognito update failed")
                
                response = client.put("/api/profile", json=update_data)
                assert response.status_code == 500
                assert "Failed to sync with authentication provider" in response.json()["detail"]
    
    def test_update_profile_fallback_after_cognito_failure(self, client, mock_current_user):
        """Test PUT /profile fallback logic after Cognito failure - Lines 171-173."""
        update_data = {
            "display_name": "New Name",
            "bio": "New bio"
        }
        
        with patch('app.api.routes.user_profile.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.user_profile.CognitoService') as mock_cognito:
                # First Cognito update fails
                mock_cognito.return_value.update_user_attributes.side_effect = Exception("Cognito error")
                
                with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
                    # But profile service update also fails
                    mock_service.return_value.update_user_profile.side_effect = Exception("DB error")
                    
                    response = client.put("/api/profile", json=update_data)
                    assert response.status_code == 500
                    assert "Failed to update user profile" in response.json()["detail"]
    
    def test_update_profile_generic_exception(self, client, mock_current_user):
        """Test PUT /profile handles generic Exception - Lines 179-184."""
        update_data = {
            "display_name": "New Name"
        }
        
        with patch('app.api.routes.user_profile.get_current_user', return_value=mock_current_user):
            # Raise exception before any service calls
            with patch('app.api.routes.user_profile.UserProfileUpdate') as mock_model:
                mock_model.side_effect = Exception("Unexpected error")
                
                response = client.put("/api/profile", json=update_data)
                assert response.status_code == 500
                assert "Failed to update user profile" in response.json()["detail"]
    
    def test_complete_onboarding_cognito_update_failure(self, client, mock_current_user):
        """Test POST /onboarding/complete handles Cognito update failure - Line 246."""
        onboarding_data = {
            "display_name": "Test User",
            "bio": "My bio",
            "location": "Test City"
        }
        
        with patch('app.api.routes.user_profile.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.user_profile.CognitoService') as mock_cognito:
                # Mock Cognito update to fail
                mock_cognito.return_value.update_user_attributes.side_effect = Exception("Cognito error")
                
                with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
                    # Profile service also fails
                    mock_service.return_value.complete_onboarding.side_effect = Exception("DB error")
                    
                    response = client.post("/api/onboarding/complete", json=onboarding_data)
                    assert response.status_code == 500
                    assert "Failed to complete onboarding" in response.json()["detail"]
    
    def test_complete_onboarding_generic_exception(self, client, mock_current_user):
        """Test POST /onboarding/complete handles generic Exception - Lines 252-257."""
        onboarding_data = {
            "display_name": "Test User",
            "bio": "My bio"
        }
        
        with patch('app.api.routes.user_profile.get_current_user', return_value=mock_current_user):
            # Raise exception early in the handler
            with patch('app.api.routes.user_profile.OnboardingData') as mock_model:
                mock_model.side_effect = Exception("Unexpected error")
                
                response = client.post("/api/onboarding/complete", json=onboarding_data)
                assert response.status_code == 500
                assert "Failed to complete onboarding" in response.json()["detail"]
    
    def test_update_profile_successful_cognito_sync(self, client, mock_current_user):
        """Test PUT /profile with successful Cognito sync for email/username."""
        update_data = {
            "display_name": "New Name",
            "email": "newemail@example.com",
            "username": "newusername"
        }
        
        with patch('app.api.routes.user_profile.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.user_profile.CognitoService') as mock_cognito:
                # Mock successful Cognito update
                mock_cognito.return_value.update_user_attributes.return_value = True
                
                with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
                    # Mock successful profile update
                    updated_profile = {
                        **mock_current_user,
                        **update_data,
                        "is_verified": False,
                        "is_onboarded": True,
                        "created_at": "2024-01-01T00:00:00Z",
                        "updated_at": "2024-01-01T00:00:00Z"
                    }
                    mock_service.return_value.update_user_profile.return_value = updated_profile
                    
                    response = client.put("/api/profile", json=update_data)
                    assert response.status_code == 200
                    data = response.json()
                    assert data["display_name"] == "New Name"
                    assert data["email"] == "newemail@example.com"
                    
                    # Verify Cognito was called with correct attributes
                    mock_cognito.return_value.update_user_attributes.assert_called_once()
                    call_args = mock_cognito.return_value.update_user_attributes.call_args
                    assert call_args[0][0] == "test-user-123"
                    assert "email" in call_args[0][1]
                    assert "preferred_username" in call_args[0][1]