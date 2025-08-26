"""
Comprehensive unit tests for spaces endpoints.
"""
import pytest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from app.services.exceptions import SpaceNotFoundError, UnauthorizedError


class TestSpacesRoutes:
    """Test spaces endpoints with full coverage."""
    
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
    
    def test_create_space_success(self):
        """Test successful space creation."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.create_space.return_value = {
                "id": "space123",
                "name": "Test Space",
                "description": "A test space",
                "type": "lifestyle",
                "is_public": True,
                "owner_id": "user123",
                "created_at": "2024-01-01T00:00:00.000000+00:00",
                "updated_at": "2024-01-01T00:00:00.000000+00:00"
            }
            mock_service.return_value = mock_service_instance
            
            response = self.client.post(
                "/api/spaces",
                json={
                    "name": "Test Space",
                    "description": "A test space",
                    "type": "lifestyle", 
                    "is_public": True
                }
            )
            
            assert response.status_code == 201
            data = response.json()
            assert data["id"] == "space123"
            assert data["name"] == "Test Space"
            assert data["member_count"] == 1
            assert data["is_owner"] == True
    
    def test_create_space_generic_error(self):
        """Test space creation with generic error."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.create_space.side_effect = Exception("Database error")
            mock_service.return_value = mock_service_instance
            
            response = self.client.post(
                "/api/spaces",
                json={
                    "name": "Test Space",
                    "description": "A test space",
                    "type": "lifestyle",
                    "is_public": True
                }
            )
            
            assert response.status_code == 500
            assert "Failed to create space" in response.json()["detail"]
    
    def test_get_space_success(self):
        """Test successful space retrieval."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.get_space.return_value = {
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
            mock_service.return_value = mock_service_instance
            
            response = self.client.get("/api/spaces/space123")
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "space123"
            assert data["name"] == "Test Space"
            assert data["member_count"] == 5
    
    def test_get_space_not_found_error(self):
        """Test space retrieval when space is not found."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.get_space.side_effect = SpaceNotFoundError("Space not found")
            mock_service.return_value = mock_service_instance
            
            response = self.client.get("/api/spaces/space123")
            
            assert response.status_code == 404
            assert "Space not found" in response.json()["detail"]
    
    def test_get_space_generic_error(self):
        """Test space retrieval with generic error."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.get_space.side_effect = Exception("Database error")
            mock_service.return_value = mock_service_instance
            
            response = self.client.get("/api/spaces/space123")
            
            assert response.status_code == 500
            assert "Failed to get space" in response.json()["detail"]
    
    def test_update_space_success(self):
        """Test successful space update."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.update_space.return_value = {"updated": True}
            mock_service_instance.get_space.return_value = {
                "id": "space123",
                "name": "Updated Space",
                "description": "Updated description",
                "type": "lifestyle",
                "is_public": False,
                "owner_id": "user123",
                "member_count": 3,
                "is_owner": True,
                "created_at": "2024-01-01T00:00:00.000000+00:00",
                "updated_at": "2024-01-02T00:00:00.000000+00:00"
            }
            mock_service.return_value = mock_service_instance
            
            response = self.client.put(
                "/api/spaces/space123",
                json={
                    "name": "Updated Space",
                    "description": "Updated description",
                    "is_public": False
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "space123"
            assert data["name"] == "Updated Space"
            assert data["description"] == "Updated description"
            assert data["is_public"] == False
    
    def test_update_space_not_found_error(self):
        """Test space update when space is not found."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.update_space.side_effect = SpaceNotFoundError("Space not found")
            mock_service.return_value = mock_service_instance
            
            response = self.client.put(
                "/api/spaces/space123",
                json={
                    "name": "Updated Space"
                }
            )
            
            assert response.status_code == 404
            assert "Space not found" in response.json()["detail"]
    
    def test_update_space_unauthorized_error(self):
        """Test space update when user is unauthorized."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.update_space.side_effect = UnauthorizedError("Unauthorized to update space")
            mock_service.return_value = mock_service_instance
            
            response = self.client.put(
                "/api/spaces/space123",
                json={
                    "name": "Updated Space"
                }
            )
            
            assert response.status_code == 403
            assert "Unauthorized to update space" in response.json()["detail"]
    
    def test_update_space_generic_error(self):
        """Test space update with generic error."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.update_space.side_effect = Exception("Database error")
            mock_service.return_value = mock_service_instance
            
            response = self.client.put(
                "/api/spaces/space123",
                json={
                    "name": "Updated Space"
                }
            )
            
            assert response.status_code == 500
            assert "Failed to update space" in response.json()["detail"]
    
    def test_delete_space_success(self):
        """Test successful space deletion."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.delete_space.return_value = None
            mock_service.return_value = mock_service_instance
            
            response = self.client.delete("/api/spaces/space123")
            
            assert response.status_code == 200
            data = response.json()
            assert "Space space123 deleted successfully" in data["message"]
    
    def test_delete_space_not_found_error(self):
        """Test space deletion when space is not found."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.delete_space.side_effect = SpaceNotFoundError("Space not found")
            mock_service.return_value = mock_service_instance
            
            response = self.client.delete("/api/spaces/space123")
            
            assert response.status_code == 404
            assert "Space not found" in response.json()["detail"]
    
    def test_delete_space_unauthorized_error(self):
        """Test space deletion when user is unauthorized."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.delete_space.side_effect = UnauthorizedError("Unauthorized to delete space")
            mock_service.return_value = mock_service_instance
            
            response = self.client.delete("/api/spaces/space123")
            
            assert response.status_code == 403
            assert "Unauthorized to delete space" in response.json()["detail"]
    
    def test_delete_space_generic_error(self):
        """Test space deletion with generic error."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.delete_space.side_effect = Exception("Database error")
            mock_service.return_value = mock_service_instance
            
            response = self.client.delete("/api/spaces/space123")
            
            assert response.status_code == 500
            assert "Failed to delete space" in response.json()["detail"]
    
    def test_get_space_members_success(self):
        """Test successful space members retrieval."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.get_space_members.return_value = [
                {
                    "user_id": "user123",
                    "username": "testuser",
                    "email": "test@example.com",
                    "role": "owner",
                    "joined_at": "2024-01-01T00:00:00.000000+00:00"
                },
                {
                    "user_id": "user456",
                    "username": "member",
                    "email": "member@example.com", 
                    "role": "member",
                    "joined_at": "2024-01-02T00:00:00.000000+00:00"
                }
            ]
            mock_service.return_value = mock_service_instance
            
            response = self.client.get("/api/spaces/space123/members")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["user_id"] == "user123"
            assert data[0]["role"] == "owner"
            assert data[1]["user_id"] == "user456"
            assert data[1]["role"] == "member"
    
    def test_get_space_members_not_found_error(self):
        """Test space members retrieval when space is not found."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.get_space_members.side_effect = SpaceNotFoundError("Space not found")
            mock_service.return_value = mock_service_instance
            
            response = self.client.get("/api/spaces/space123/members")
            
            assert response.status_code == 404
            assert "Space not found" in response.json()["detail"]
    
    def test_get_space_members_generic_error(self):
        """Test space members retrieval with generic error."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            
            mock_service_instance = Mock()
            mock_service_instance.get_space_members.side_effect = Exception("Database error")
            mock_service.return_value = mock_service_instance
            
            response = self.client.get("/api/spaces/space123/members")
            
            assert response.status_code == 500
            assert "Failed to get space members" in response.json()["detail"]