"""
User management endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from app.models.user import UserResponse, UserUpdate
from app.models.space import SpaceListResponse
from app.services.cognito import CognitoService
from app.services.space import SpaceService
from app.core.security import get_current_user
from datetime import datetime, timezone


router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile."""
    try:
        # In a real app, we'd get this from the token or database
        return UserResponse(
            id=current_user.get("sub", ""),
            email=current_user.get("email", ""),
            username=current_user.get("username", ""),
            full_name=current_user.get("full_name", ""),
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user profile"
        )


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    update: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update current user profile."""
    try:
        service = CognitoService()
        # In a real app, we'd get the access token from the request
        # service.update_user(access_token, update)
        
        return UserResponse(
            id=current_user.get("sub", ""),
            email=update.email or current_user.get("email", ""),
            username=current_user.get("username", ""),
            full_name=update.full_name or current_user.get("full_name", ""),
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user profile"
        )


@router.get("/spaces", response_model=SpaceListResponse)
async def get_user_spaces(
    page: int = 1,
    page_size: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Get spaces for current user."""
    try:
        service = SpaceService()
        result = service.list_user_spaces(
            user_id=current_user.get("sub", ""),
            page=page,
            page_size=page_size
        )
        
        return SpaceListResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user spaces"
        )