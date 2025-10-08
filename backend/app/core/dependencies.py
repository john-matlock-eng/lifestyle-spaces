"""
Common dependencies for FastAPI routes.
"""
from typing import Dict, Any
from fastapi import Depends, HTTPException, status, Request
from app.core.cognito_auth import get_current_user_cognito, extract_user_attributes_from_id_token
from app.services.cognito import CognitoService
from app.services.user_profile import UserProfileService


def get_current_user(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user_cognito)
) -> Dict[str, Any]:
    """
    Get the current authenticated user and ensure profile exists with complete data.

    Args:
        request: FastAPI request object (to access headers for ID token)
        current_user: User data from JWT access token

    Returns:
        Dict: User information with complete profile

    Raises:
        HTTPException: If user is not authenticated
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user ID from token
    user_id = current_user.get("sub") or current_user.get("userId")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Try to extract ID token from request headers
    # Frontend should send: Authorization: Bearer <access_token>
    # And optionally: X-ID-Token: <id_token>
    id_token = request.headers.get("X-ID-Token")

    # Build cognito_attributes from both sources
    cognito_attributes = {
        'email': current_user.get('email', ''),
        'username': current_user.get('username', ''),
        'display_name': current_user.get('display_name', ''),
        'full_name': current_user.get('full_name', '')
    }

    # If we have ID token, extract custom attributes from it
    if id_token:
        try:
            id_token_attrs = extract_user_attributes_from_id_token(id_token)
            # Merge ID token attributes (they take precedence)
            if id_token_attrs:
                cognito_attributes.update({
                    'email': id_token_attrs.get('email') or cognito_attributes['email'],
                    'username': id_token_attrs.get('username') or cognito_attributes['username'],
                    'display_name': id_token_attrs.get('display_name') or cognito_attributes['display_name'],
                    'full_name': id_token_attrs.get('full_name') or cognito_attributes['full_name']
                })
        except Exception as e:
            # Log but continue with what we have
            import logging
            logging.warning(f"Failed to parse ID token: {e}")

    # Apply sensible defaults only if still empty
    if not cognito_attributes['email']:
        cognito_attributes['email'] = f"user_{user_id}@temp.local"

    if not cognito_attributes['username']:
        cognito_attributes['username'] = (
            cognito_attributes['email'].split('@')[0] if cognito_attributes['email'] else
            f"user_{user_id[:8]}"
        )

    if not cognito_attributes['display_name']:
        cognito_attributes['display_name'] = (
            cognito_attributes['full_name'] or
            cognito_attributes['username'] or
            f"User {user_id[:8]}"
        )

    # Get or create user profile
    user_profile_service = UserProfileService()
    profile = user_profile_service.get_or_create_user_profile(
        user_id=user_id,
        cognito_attributes=cognito_attributes
    )

    # Merge profile data into current_user
    current_user['profile'] = profile

    return current_user


def get_current_user_id(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> str:
    """
    Get the current authenticated user's ID.
    
    Args:
        current_user: User data from JWT token
    
    Returns:
        str: User ID from the 'sub' claim
    """
    return current_user.get("sub", current_user.get("userId"))