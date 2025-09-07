"""
Additional tests to achieve 100% coverage for spaces routes.
"""
import pytest
from unittest.mock import Mock, patch
from fastapi import status
from fastapi.testclient import TestClient
from botocore.exceptions import ClientError
from app.services.exceptions import ValidationError


class TestSpacesRoutesFullCoverage:
    """Additional tests for 100% coverage."""
    
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
    
    def test_create_space_validation_error(self):
        """Test space creation with validation error from service."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            
            # Mock ValidationError from service (after pydantic validation)
            mock_service_instance.create_space.side_effect = ValidationError("Space limit exceeded")
            
            response = self.client.post(
                "/api/spaces",
                json={
                    "name": "Valid Name",
                    "description": "Test space"
                }
            )
            
            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
            assert "Space limit exceeded" in response.json()["detail"]
    
    def test_create_space_service_unavailable(self):
        """Test space creation when database is unavailable."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            
            # Mock ClientError with ServiceUnavailable
            error = ClientError(
                {'Error': {'Code': 'ServiceUnavailable', 'Message': 'Service down'}},
                'operation_name'
            )
            mock_service_instance.create_space.side_effect = error
            
            response = self.client.post(
                "/api/spaces",
                json={
                    "name": "Test Space",
                    "description": "Test space"
                }
            )
            
            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            assert "Database service unavailable" in response.json()["detail"]
    
    def test_create_space_other_client_error(self):
        """Test space creation with other client errors."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            
            # Mock ClientError with different error code
            error = ClientError(
                {'Error': {'Code': 'ValidationException', 'Message': 'Invalid input'}},
                'operation_name'
            )
            mock_service_instance.create_space.side_effect = error
            
            response = self.client.post(
                "/api/spaces",
                json={
                    "name": "Test Space",
                    "description": "Test space"
                }
            )
            
            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            assert "Failed to create space" in response.json()["detail"]
    
    def test_get_space_generic_exception(self):
        """Test getting space with generic exception."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            
            # Mock generic exception
            mock_service_instance.get_space.side_effect = Exception("Database error")
            
            response = self.client.get("/api/spaces/space123")
            
            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            assert "Failed to get space" in response.json()["detail"]
    
    def test_get_space_unauthorized_error(self):
        """Test getting space with unauthorized error."""
        from app.services.exceptions import UnauthorizedError
        
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            
            # Mock UnauthorizedError
            mock_service_instance.get_space.side_effect = UnauthorizedError("Not a member")
            
            response = self.client.get("/api/spaces/space123")
            
            assert response.status_code == status.HTTP_403_FORBIDDEN
            assert "Not a member" in response.json()["detail"]
    
    def test_get_members_generic_exception(self):
        """Test getting members with generic exception."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            
            # Mock generic exception
            mock_service_instance.get_space_members.side_effect = Exception("Database error")
            
            response = self.client.get("/api/spaces/space123/members")
            
            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            assert "Failed to get space members" in response.json()["detail"]
    
    def test_get_members_unauthorized_error(self):
        """Test getting members with unauthorized error."""
        from app.services.exceptions import UnauthorizedError
        
        with patch('app.api.routes.spaces.SpaceService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            
            # Mock UnauthorizedError
            mock_service_instance.get_space_members.side_effect = UnauthorizedError("Not a member")
            
            response = self.client.get("/api/spaces/space123/members")
            
            assert response.status_code == status.HTTP_403_FORBIDDEN
            assert "Not a member" in response.json()["detail"]