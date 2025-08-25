"""
Space management endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from app.models.space import (
    SpaceCreate, SpaceResponse, SpaceUpdate, 
    SpaceMember, SpaceListResponse
)
from app.models.common import SuccessResponse
from app.services.space import SpaceService
from app.services.exceptions import SpaceNotFoundError, UnauthorizedError
from app.core.security import get_current_user


router = APIRouter(prefix="/api/spaces", tags=["Spaces"])


@router.post("", response_model=SpaceResponse, status_code=status.HTTP_201_CREATED)
async def create_space(
    space: SpaceCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new space."""
    try:
        service = SpaceService()
        result = service.create_space(
            space=space,
            owner_id=current_user.get("sub", "")
        )
        
        return SpaceResponse(**result, member_count=1, is_owner=True)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create space"
        )


@router.get("/{space_id}", response_model=SpaceResponse)
async def get_space(
    space_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get space by ID."""
    try:
        service = SpaceService()
        result = service.get_space(
            space_id=space_id,
            user_id=current_user.get("sub", "")
        )
        
        return SpaceResponse(**result)
    except SpaceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get space"
        )


@router.put("/{space_id}", response_model=SpaceResponse)
async def update_space(
    space_id: str,
    update: SpaceUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a space."""
    try:
        service = SpaceService()
        result = service.update_space(
            space_id=space_id,
            update=update,
            user_id=current_user.get("sub", "")
        )
        
        # Get full space info for response
        full_space = service.get_space(
            space_id=space_id,
            user_id=current_user.get("sub", "")
        )
        
        return SpaceResponse(**full_space)
    except SpaceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update space"
        )


@router.delete("/{space_id}", response_model=SuccessResponse)
async def delete_space(
    space_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a space."""
    try:
        service = SpaceService()
        service.delete_space(
            space_id=space_id,
            user_id=current_user.get("sub", "")
        )
        
        return SuccessResponse(
            message=f"Space {space_id} deleted successfully"
        )
    except SpaceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete space"
        )


@router.get("/{space_id}/members", response_model=List[SpaceMember])
async def get_space_members(
    space_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get members of a space."""
    try:
        service = SpaceService()
        members = service.get_space_members(
            space_id=space_id,
            user_id=current_user.get("sub", "")
        )
        
        return [SpaceMember(**member) for member in members]
    except SpaceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get space members"
        )