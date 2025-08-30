"""
Comprehensive unit tests for users endpoints.
"""
import pytest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient


class TestUsersRoutes:
    """Test users endpoints with full coverage."""
    
    def setup_method(self):
        """Set up test client and mocks."""
        from app.main import app
        from app.core.security import get_current_user
        
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
    
    def test_get_profile_success(self):
        """Test successful profile retrieval."""
        response = self.client.get("/api/users/profile")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "user123"
        assert data["email"] == "test@example.com"
        assert data["username"] == "testuser"
        assert data["full_name"] == "Test User"
        assert data["is_active"] == True
        assert "created_at" in data
        assert "updated_at" in data
    
    def test_get_profile_generic_error(self):
        """Test profile retrieval with generic error."""
        # Mock datetime to raise an exception inside the route handler
        with patch('app.api.routes.users.datetime') as mock_datetime:
            mock_datetime.now.side_effect = Exception("Database error")
            
            response = self.client.get("/api/users/profile")
            
            assert response.status_code == 500
            assert "Failed to get user profile" in response.json()["detail"]
    
    def test_update_profile_success(self):
        """Test successful profile update."""
        with patch('app.api.routes.users.CognitoService') as mock_cognito:
            
            mock_service_instance = Mock()
            mock_cognito.return_value = mock_service_instance
            
            response = self.client.put(
                "/api/users/profile",
                json={
                    "email": "updated@example.com",
                    "full_name": "Updated Name"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "user123"
            assert data["email"] == "updated@example.com"
            assert data["username"] == "testuser"
            assert data["full_name"] == "Updated Name"
            assert data["is_active"] == True
    
    def test_update_profile_partial_update(self):
        """Test profile update with partial data."""
        with patch('app.api.routes.users.CognitoService') as mock_cognito:
            
            mock_service_instance = Mock()
            mock_cognito.return_value = mock_service_instance
            
            # Update only full_name, keep original email
            response = self.client.put(
                "/api/users/profile",
                json={
                    "full_name": "Only Name Updated"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "user123"
            assert data["email"] == "test@example.com"  # Original email preserved
            assert data["full_name"] == "Only Name Updated"
    
    def test_update_profile_generic_error(self):
        """Test profile update with generic error."""
        with patch('app.api.routes.users.CognitoService') as mock_cognito, \
             patch('app.api.routes.users.datetime') as mock_datetime:
            
            mock_service_instance = Mock()
            mock_cognito.return_value = mock_service_instance
            
            # Make datetime.now raise an exception inside the route handler  
            mock_datetime.now.side_effect = Exception("Database error")
            
            response = self.client.put(
                "/api/users/profile",
                json={
                    "email": "updated@example.com"
                }
            )
            
            assert response.status_code == 500
            assert "Failed to update user profile" in response.json()["detail"]
    
    def test_get_user_spaces_success(self):
        """Test successful user spaces retrieval."""
        with patch('app.api.routes.users.SpaceService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.list_user_spaces.return_value = {
                "spaces": [
                    {
                        "id": "space123",
                        "name": "Test Space",
                        "description": "A test space",
                        "type": "lifestyle",
                        "is_public": True,
                        "owner_id": "user123",
                        "member_count": 5,
                        "is_owner": True,
                        "created_at": "2024-01-01T00:00:00.000000+00:00",
                        "updated_at": "2024-01-01T00:00:00.000000+00:00"
                    }
                ],
                "total": 1,
                "page": 1,
                "page_size": 20
            }
            mock_service.return_value = mock_service_instance
            
            response = self.client.get("/api/users/spaces")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data["spaces"]) == 1
            assert data["spaces"][0]["spaceId"] == "space123"  # Using alias from SpaceResponse model
            assert data["spaces"][0]["name"] == "Test Space"
            assert data["total"] == 1
            assert data["page"] == 1
            assert data["page_size"] == 20
    
    def test_get_user_spaces_with_pagination(self):
        """Test user spaces retrieval with pagination parameters."""
        with patch('app.api.routes.users.SpaceService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.list_user_spaces.return_value = {
                "spaces": [],
                "total": 0,
                "page": 2,
                "page_size": 10
            }
            mock_service.return_value = mock_service_instance
            
            # Use limit=10, offset=10 to get page=2 with page_size=10
            response = self.client.get("/api/users/spaces?limit=10&offset=10")
            
            assert response.status_code == 200
            data = response.json()
            assert data["page"] == 2
            assert data["page_size"] == 10
            assert data["total"] == 0
            
            # Verify the service was called with correct parameters
            mock_service_instance.list_user_spaces.assert_called_once_with(
                user_id="user123",
                page=2,
                page_size=10,
                search=None,
                is_public=None,
                role=None
            )
    
    def test_get_user_spaces_generic_error(self):
        """Test user spaces retrieval with generic error."""
        with patch('app.api.routes.users.SpaceService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.list_user_spaces.side_effect = Exception("Database error")
            mock_service.return_value = mock_service_instance
            
            response = self.client.get("/api/users/spaces")
            
            assert response.status_code == 500
            assert "Failed to get user spaces" in response.json()["detail"]