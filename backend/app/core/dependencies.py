"""
Common dependencies for FastAPI routes.
"""
from typing import Dict, Any
from fastapi import Depends, HTTPException, status
from app.core.cognito_auth import get_current_user_cognito
from app.services.cognito import CognitoService
from app.services.user_profile import UserProfileService


def get_current_user(
    current_user: Dict[str, Any] = Depends(get_current_user_cognito)
) -> Dict[str, Any]:
    """
    Get the current authenticated user and ensure profile exists.
    
    Args:
        current_user: User data from JWT token
    
    Returns:
        Dict: User information with profile
        
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
    
    if user_id:
        # Ensure user profile exists
        user_profile_service = UserProfileService()
        profile = user_profile_service.get_or_create_user_profile(
            user_id=user_id,
            cognito_attributes={
                'email': current_user.get('email', ''),
                'username': current_user.get('username', ''),
                'display_name': current_user.get('display_name', ''),
                'full_name': current_user.get('full_name', '')
            }
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