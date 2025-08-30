"""
Common dependencies for FastAPI routes.
"""
from typing import Dict, Any
from fastapi import Depends, HTTPException, status
from app.core.security import get_current_user as security_get_current_user
from app.services.cognito import CognitoService


def get_current_user(
    current_user: Dict[str, Any] = Depends(security_get_current_user)
) -> Dict[str, Any]:
    """
    Get the current authenticated user.
    
    Args:
        current_user: User data from JWT token
    
    Returns:
        Dict: User information
        
    Raises:
        HTTPException: If user is not authenticated
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
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