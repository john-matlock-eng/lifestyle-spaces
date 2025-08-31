"""
Unit tests for security module.
"""
import pytest
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError


class TestSecurity:
    """Test cases for security utilities."""
    
    def test_create_access_token(self):
        """Test creating an access token."""
        from app.core.security import create_access_token
        
        data = {"sub": "user123", "email": "test@example.com"}
        token = create_access_token(data)
        
        assert token is not None
        assert isinstance(token, str)
    
    def test_decode_access_token(self):
        """Test decoding an access token."""
        from app.core.security import create_access_token, decode_token
        from app.core.config import settings
        
        data = {"sub": "user123", "email": "test@example.com"}
        token = create_access_token(data)
        
        decoded = decode_token(token)
        assert decoded["sub"] == "user123"
        assert decoded["email"] == "test@example.com"
        assert "exp" in decoded
    
    def test_expired_token_raises_error(self):
        """Test that expired token raises an error."""
        from app.core.security import decode_token
        from app.core.config import settings
        
        # Create an expired token
        data = {"sub": "user123", "exp": datetime.now(timezone.utc) - timedelta(hours=1)}
        expired_token = jwt.encode(data, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
        
        with pytest.raises(JWTError):
            decode_token(expired_token)
    
    def test_invalid_token_raises_error(self):
        """Test that invalid token raises an error."""
        from app.core.security import decode_token
        
        with pytest.raises(JWTError):
            decode_token("invalid.token.here")
    
    def test_get_current_user_dependency(self):
        """Test the get_current_user dependency."""
        from app.core.cognito_auth import get_current_user_cognito
        from app.core.security import create_access_token, get_current_user
        from fastapi import HTTPException
        
        # Test with valid token
        token = create_access_token({"sub": "user123", "email": "test@example.com"})
        user = get_current_user(f"Bearer {token}")
        assert user["sub"] == "user123"
        
        # Test with invalid token format
        with pytest.raises(HTTPException) as exc_info:
            get_current_user("InvalidFormat")
        assert exc_info.value.status_code == 401
        
        # Test with invalid token
        with pytest.raises(HTTPException) as exc_info:
            get_current_user("Bearer invalid.token")
        assert exc_info.value.status_code == 401