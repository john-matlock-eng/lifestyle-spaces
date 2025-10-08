"""
Common dependencies for FastAPI routes.
"""
from typing import Dict, Any
from fastapi import Depends, HTTPException, status, Request
from app.core.cognito_auth import get_current_user_cognito
from app.services.cognito import CognitoService
from app.services.user_profile import UserProfileService


def get_current_user(
    current_user: Dict[str, Any] = Depends(get_current_user_cognito),
    request: Request = None
) -> Dict[str, Any]:
    """
    Get the current authenticated user and ensure profile exists with complete data.

    Args:
        current_user: User data from JWT token

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

    # Build complete cognito_attributes with fallbacks
    # Start with what we have from the JWT token
    # Handle both empty strings and None values
    cognito_attributes = {
        'email': current_user.get('email') or '',
        'username': current_user.get('username') or current_user.get('custom:username') or '',
        'display_name': current_user.get('display_name') or current_user.get('custom:displayName') or '',
        'full_name': current_user.get('full_name') or ''
    }

    # If critical attributes are missing, try to fetch from Cognito GetUser API
    # ID tokens don't include custom attributes, so we need to call GetUser
    if not cognito_attributes['email'] or not cognito_attributes['username'] or not cognito_attributes['display_name']:
        try:
            # Get access token from request headers
            if request and hasattr(request, 'headers'):
                auth_header = request.headers.get('Authorization', '')
                if auth_header.startswith('Bearer '):
                    access_token = auth_header[7:]
                    cognito_service = CognitoService()
                    # Get complete user info from Cognito
                    user_info = cognito_service.get_user(access_token)

                    # Update attributes with data from Cognito
                    if user_info.get('email'):
                        cognito_attributes['email'] = user_info['email']
                    if user_info.get('preferred_username'):
                        cognito_attributes['username'] = user_info['preferred_username']
                    if user_info.get('display_name'):
                        cognito_attributes['display_name'] = user_info['display_name']
                    if user_info.get('full_name'):
                        cognito_attributes['full_name'] = user_info['full_name']
        except Exception:
            # If Cognito call fails, continue with fallback logic
            pass

    # Apply sensible defaults if still empty
    if not cognito_attributes['email']:
        cognito_attributes['email'] = f"user_{user_id}@temp.local"

    if not cognito_attributes['username']:
        # Generate from email or user_id
        email = cognito_attributes['email']
        if email and '@' in email and '@temp.local' not in email:
            cognito_attributes['username'] = email.split('@')[0]
        else:
            cognito_attributes['username'] = f"user_{user_id[:8]}"

    if not cognito_attributes['display_name']:
        # Build from available data
        cognito_attributes['display_name'] = (
            cognito_attributes['full_name'] or
            cognito_attributes['username'] or
            f"User {user_id[:8]}"
        )

    # Ensure user profile exists with complete data
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