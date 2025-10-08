"""
AWS Cognito JWT token validation for FastAPI.
"""
import json
import time
from typing import Dict, Any, Optional
from jose import jwt, JWTError
from jose.utils import base64url_decode
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import requests
from functools import lru_cache
import os

# Bearer token scheme
bearer_scheme = HTTPBearer(auto_error=False)

# Cache for JWKS keys
_jwks_cache: Optional[Dict[str, Any]] = None
_jwks_cache_time: float = 0
JWKS_CACHE_TTL = 3600  # 1 hour


@lru_cache(maxsize=1)
def get_cognito_settings() -> Dict[str, str]:
    """Get Cognito settings from environment."""
    region = os.getenv('AWS_REGION', 'us-east-1')
    user_pool_id = os.getenv('COGNITO_USER_POOL_ID', '')
    client_id = os.getenv('COGNITO_USER_POOL_CLIENT_ID', '')
    
    if not user_pool_id:
        raise ValueError("COGNITO_USER_POOL_ID environment variable is not set")
    
    return {
        'region': region,
        'user_pool_id': user_pool_id,
        'client_id': client_id,
        'issuer': f'https://cognito-idp.{region}.amazonaws.com/{user_pool_id}',
        'jwks_uri': f'https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json'
    }


def get_jwks() -> Dict[str, Any]:
    """Get JWKS from Cognito."""
    global _jwks_cache, _jwks_cache_time
    
    current_time = time.time()
    
    # Return cached JWKS if still valid
    if _jwks_cache and (current_time - _jwks_cache_time) < JWKS_CACHE_TTL:
        return _jwks_cache
    
    settings = get_cognito_settings()
    
    try:
        response = requests.get(settings['jwks_uri'], timeout=5)
        response.raise_for_status()
        _jwks_cache = response.json()
        _jwks_cache_time = current_time
        return _jwks_cache
    except Exception as e:
        # If we have a cache, return it even if expired
        if _jwks_cache:
            return _jwks_cache
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to fetch JWKS: {str(e)}"
        )


def get_rsa_key(token: str) -> Optional[Dict[str, Any]]:
    """Get RSA key for token verification."""
    try:
        # Get the kid from token header
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get('kid')
        
        if not kid:
            return None
        
        # Get JWKS
        jwks = get_jwks()
        
        # Find the key with matching kid
        for key in jwks.get('keys', []):
            if key.get('kid') == kid:
                return key
        
        return None
    except Exception:
        return None


def verify_cognito_token(token: str) -> Dict[str, Any]:
    """
    Verify a Cognito JWT token.
    
    Args:
        token: JWT token from Cognito
    
    Returns:
        Dict: Decoded token claims
    
    Raises:
        HTTPException: If token is invalid
    """
    settings = get_cognito_settings()
    
    # Get the RSA key
    rsa_key = get_rsa_key(token)
    if not rsa_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to find appropriate key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Decode and verify the token
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=['RS256'],
            audience=settings.get('client_id'),  # May be None for some token types
            issuer=settings['issuer'],
            options={
                "verify_aud": bool(settings.get('client_id')),  # Only verify if client_id is set
                "verify_signature": True,
                "verify_exp": True,
                "verify_nbf": False,
                "verify_iat": True,
                "verify_iss": True,
            }
        )
        
        # Additional validation for token use
        token_use = payload.get('token_use')
        if token_use not in ['id', 'access']:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token use",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return payload
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def extract_user_attributes_from_id_token(id_token: str) -> Dict[str, Any]:
    """
    Extract user attributes from Cognito ID token.
    ID tokens contain custom attributes, unlike access tokens.

    Args:
        id_token: Cognito ID token

    Returns:
        Dict: User attributes including custom attributes
    """
    settings = get_cognito_settings()

    try:
        # Decode ID token (similar to access token but different validation)
        rsa_key = get_rsa_key(id_token)
        if not rsa_key:
            return {}

        # Decode ID token - it has different claims than access token
        payload = jwt.decode(
            id_token,
            rsa_key,
            algorithms=['RS256'],
            audience=settings.get('client_id'),
            issuer=settings['issuer'],
            options={
                "verify_aud": True,
                "verify_signature": True,
                "verify_exp": True,
                "verify_nbf": False,
                "verify_iat": True,
                "verify_iss": True,
            }
        )

        # Extract attributes from ID token
        return {
            'sub': payload.get('sub'),
            'email': payload.get('email'),
            'email_verified': payload.get('email_verified', False),
            'name': payload.get('name', ''),
            'username': payload.get('custom:username') or payload.get('cognito:username') or payload.get('email', ''),
            'display_name': payload.get('custom:displayName') or payload.get('custom:display_name') or payload.get('name', ''),
            'full_name': payload.get('name', ''),
            # Include all custom attributes
            'custom:username': payload.get('custom:username'),
            'custom:displayName': payload.get('custom:displayName'),
            'custom:userId': payload.get('custom:userId'),
        }

    except Exception as e:
        # Log error but don't fail - we'll fall back to access token or defaults
        import logging
        logging.warning(f"Failed to extract attributes from ID token: {e}")
        return {}


def get_current_user_cognito(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Dict[str, Any]:
    """
    Get current user from Cognito JWT token.
    
    Args:
        credentials: HTTP Bearer credentials
    
    Returns:
        Dict: User information from token
    
    Raises:
        HTTPException: If credentials are invalid
    """
    # In test environment, bypass Cognito validation
    if os.getenv('PYTEST_CURRENT_TEST'):
        # Use the existing mock validation for tests
        from app.core.security import get_current_user as mock_get_current_user
        return mock_get_current_user(credentials)
    
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    
    try:
        # Verify the Cognito token
        payload = verify_cognito_token(token)
        
        # Return user information from token
        # Map Cognito claims to our expected format
        # Handle custom attributes (they come with 'custom:' prefix)
        username = (payload.get('custom:username') or 
                   payload.get('cognito:username') or 
                   payload.get('preferred_username') or
                   payload.get('email'))
        
        display_name = (payload.get('custom:displayName') or
                       payload.get('custom:display_name') or
                       payload.get('preferred_username') or
                       payload.get('name') or
                       username)
        
        return {
            'sub': payload.get('sub'),  # User ID
            'email': payload.get('email'),
            'username': username,
            'display_name': display_name,
            'full_name': payload.get('name', ''),
            'token_use': payload.get('token_use'),
            'exp': payload.get('exp'),
            'iat': payload.get('iat'),
            # Include raw custom attributes for debugging
            'custom:username': payload.get('custom:username'),
            'custom:displayName': payload.get('custom:displayName'),
            'custom:userId': payload.get('custom:userId'),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation error: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )