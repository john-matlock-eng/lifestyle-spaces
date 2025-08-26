"""
Unit tests for authentication endpoints.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient


class TestAuthEndpoints:
    """Test authentication endpoints."""
    
    def test_signup_success(self):
        """Test successful user signup."""
        from app.main import app
        
        client = TestClient(app)
        
        with patch('app.api.routes.auth.CognitoService') as mock_cognito:
            mock_service = Mock()
            mock_service.sign_up.return_value = {
                'user_sub': 'sub123',
                'username': 'testuser',
                'email': 'test@example.com'
            }
            mock_cognito.return_value = mock_service
            
            response = client.post(
                "/api/auth/signup",
                json={
                    "email": "test@example.com",
                    "username": "testuser",
                    "password": "Test123!@#",
                    "full_name": "Test User"
                }
            )
            
            assert response.status_code == 201
            assert response.json()["email"] == "test@example.com"
            assert response.json()["username"] == "testuser"
    
    def test_signup_duplicate_user(self):
        """Test signup with existing user."""
        from app.main import app
        from app.services.exceptions import UserAlreadyExistsError
        
        client = TestClient(app)
        
        with patch('app.api.routes.auth.CognitoService') as mock_cognito:
            mock_service = Mock()
            mock_service.sign_up.side_effect = UserAlreadyExistsError("User exists")
            mock_cognito.return_value = mock_service
            
            response = client.post(
                "/api/auth/signup",
                json={
                    "email": "test@example.com",
                    "username": "testuser",
                    "password": "Test123!@#"
                }
            )
            
            assert response.status_code == 400
            assert "User exists" in response.json()["detail"]
    
    def test_signin_success(self):
        """Test successful signin."""
        from app.main import app
        
        client = TestClient(app)
        
        with patch('app.api.routes.auth.CognitoService') as mock_cognito:
            mock_service = Mock()
            mock_service.sign_in.return_value = {
                'access_token': 'access123',
                'id_token': 'id123',
                'refresh_token': 'refresh123',
                'expires_in': 3600
            }
            mock_cognito.return_value = mock_service
            
            response = client.post(
                "/api/auth/signin",
                json={
                    "email": "test@example.com",
                    "password": "Test123!@#"
                }
            )
            
            assert response.status_code == 200
            assert "access_token" in response.json()
            assert response.json()["token_type"] == "bearer"
    
    def test_signin_invalid_credentials(self):
        """Test signin with invalid credentials."""
        from app.main import app
        from app.services.exceptions import InvalidCredentialsError
        
        client = TestClient(app)
        
        with patch('app.api.routes.auth.CognitoService') as mock_cognito:
            mock_service = Mock()
            mock_service.sign_in.side_effect = InvalidCredentialsError("Invalid")
            mock_cognito.return_value = mock_service
            
            response = client.post(
                "/api/auth/signin",
                json={
                    "email": "test@example.com",
                    "password": "wrong"
                }
            )
            
            assert response.status_code == 401
            assert "Invalid" in response.json()["detail"]
    
    def test_refresh_token_success(self):
        """Test refreshing access token."""
        from app.main import app
        
        client = TestClient(app)
        
        with patch('app.api.routes.auth.CognitoService') as mock_cognito:
            mock_service = Mock()
            mock_service.refresh_token.return_value = {
                'access_token': 'new_access123',
                'id_token': 'new_id123',
                'expires_in': 3600
            }
            mock_cognito.return_value = mock_service
            
            response = client.post(
                "/api/auth/refresh",
                json={
                    "refresh_token": "refresh123"
                }
            )
            
            assert response.status_code == 200
            assert "access_token" in response.json()
    
    def test_refresh_token_invalid_credentials(self):
        """Test refresh token with invalid credentials."""
        from app.main import app
        from app.services.exceptions import InvalidCredentialsError
        
        client = TestClient(app)
        
        with patch('app.api.routes.auth.CognitoService') as mock_cognito:
            mock_service = Mock()
            mock_service.refresh_token.side_effect = InvalidCredentialsError("Invalid refresh token")
            mock_cognito.return_value = mock_service
            
            response = client.post(
                "/api/auth/refresh",
                json={
                    "refresh_token": "invalid_refresh_token"
                }
            )
            
            assert response.status_code == 401
            assert "Invalid refresh token" in response.json()["detail"]
    
    def test_signout_success(self):
        """Test user signout."""
        from app.main import app
        from app.core.security import get_current_user
        
        # Override the dependency
        def override_get_current_user():
            return {"user_id": "test123", "email": "test@example.com"}
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        client = TestClient(app)
        
        # Mock the CognitoService
        with patch('app.api.routes.auth.CognitoService') as mock_cognito:
            mock_service = Mock()
            mock_cognito.return_value = mock_service
            
            response = client.post(
                "/api/auth/signout",
                headers={"Authorization": "Bearer access123"}
            )
            
            assert response.status_code == 200
            assert response.json()["message"] == "Successfully signed out"
        
        # Clean up the override
        app.dependency_overrides.clear()
    
    def test_signout_without_token(self):
        """Test signout without token."""
        from app.main import app
        
        client = TestClient(app)
        
        response = client.post("/api/auth/signout")
        
        assert response.status_code == 401
    
    def test_signup_generic_error(self):
        """Test signup with generic error."""
        from app.main import app
        
        client = TestClient(app)
        
        with patch('app.api.routes.auth.CognitoService') as mock_cognito:
            mock_service = Mock()
            mock_service.sign_up.side_effect = Exception("Database error")
            mock_cognito.return_value = mock_service
            
            response = client.post(
                "/api/auth/signup",
                json={
                    "email": "test@example.com",
                    "username": "testuser",
                    "password": "Test123!@#",
                    "full_name": "Test User"
                }
            )
            
            assert response.status_code == 500
            assert "Failed to sign up user" in response.json()["detail"]
    
    def test_signin_generic_error(self):
        """Test signin with generic error."""
        from app.main import app
        
        client = TestClient(app)
        
        with patch('app.api.routes.auth.CognitoService') as mock_cognito:
            mock_service = Mock()
            mock_service.sign_in.side_effect = Exception("Database error")
            mock_cognito.return_value = mock_service
            
            response = client.post(
                "/api/auth/signin",
                json={
                    "email": "test@example.com",
                    "password": "Test123!@#"
                }
            )
            
            assert response.status_code == 500
            assert "Failed to sign in" in response.json()["detail"]
    
    def test_refresh_token_generic_error(self):
        """Test refresh token with generic error."""
        from app.main import app
        
        client = TestClient(app)
        
        with patch('app.api.routes.auth.CognitoService') as mock_cognito:
            mock_service = Mock()
            mock_service.refresh_token.side_effect = Exception("Database error")
            mock_cognito.return_value = mock_service
            
            response = client.post(
                "/api/auth/refresh",
                json={
                    "refresh_token": "refresh123"
                }
            )
            
            assert response.status_code == 500
            assert "Failed to refresh token" in response.json()["detail"]
    
    def test_signout_generic_error(self):
        """Test signout with generic error."""
        from app.main import app
        from app.core.security import get_current_user
        
        # Override the dependency to return a user
        def override_get_current_user():
            return {"sub": "user123", "email": "test@example.com"}
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        client = TestClient(app)
        
        # Mock CognitoService to raise an exception
        with patch('app.api.routes.auth.CognitoService') as mock_cognito:
            mock_service = Mock()
            # Make the entire class instantiation raise an error
            mock_cognito.side_effect = Exception("Database error")
            
            response = client.post(
                "/api/auth/signout",
                headers={"Authorization": "Bearer access123"}
            )
            
            assert response.status_code == 500
            assert "Failed to sign out" in response.json()["detail"]
        
        # Clean up the override
        app.dependency_overrides.clear()