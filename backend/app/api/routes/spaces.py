"""
Space management endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
from jose import JWTError
from botocore.exceptions import ClientError
from app.models.space import (
    SpaceCreate, SpaceResponse, SpaceUpdate, 
    SpaceMember, SpaceListResponse, MembersListResponse
)
from app.models.common import SuccessResponse
from app.services.space import SpaceService
from app.services.exceptions import (
    SpaceNotFoundError, UnauthorizedError, ValidationError
)
from app.core.dependencies import get_current_user


router = APIRouter(prefix="/api/spaces", tags=["Spaces"])


@router.post("", response_model=SpaceResponse, status_code=status.HTTP_201_CREATED)
async def create_space(
    space: SpaceCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new space with invite code generation."""
    try:
        service = SpaceService()
        result = service.create_space(
            space=space,
            owner_id=current_user.get("sub", ""),
            owner_email=current_user.get("email", ""),
            owner_username=current_user.get("username", "")
        )
        
        # Return SpaceResponse with proper field mapping
        # The model will handle the alias conversion (id -> spaceId)
        return SpaceResponse(
            id=result["id"],
            name=result["name"],
            description=result.get("description"),
            type=result.get("type", "workspace"),
            owner_id=result["owner_id"],
            created_at=result["created_at"],
            updated_at=result["updated_at"],
            member_count=1,
            is_public=result.get("is_public", False),
            is_owner=True,
            invite_code=result.get("invite_code")
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except ClientError as e:
        if e.response['Error']['Code'] == 'ServiceUnavailable':
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database service unavailable"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create space"
        )
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
    """Get space by ID (check membership or public)."""
    try:
        service = SpaceService()
        result = service.get_space(
            space_id=space_id,
            user_id=current_user.get("sub", "")
        )
        
        # Convert response fields to match expected format
        return SpaceResponse(
            id=result["id"],
            name=result["name"],
            description=result.get("description"),
            type=result.get("type", "workspace"),
            owner_id=result["owner_id"],
            created_at=result["created_at"],
            updated_at=result["updated_at"],
            member_count=result.get("member_count", 0),
            is_public=result.get("is_public", False),
            is_owner=result.get("is_owner", False)
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
            detail="Failed to get space"
        )


@router.put("/{space_id}", response_model=SpaceResponse)
async def update_space(
    space_id: str,
    update: SpaceUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update space (owner/admin only)."""
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
        
        # Convert response fields to match expected format
        return SpaceResponse(
            id=full_space["id"],
            name=full_space["name"],
            description=full_space.get("description"),
            type=full_space.get("type", "workspace"),
            owner_id=full_space["owner_id"],
            created_at=full_space["created_at"],
            updated_at=full_space["updated_at"],
            member_count=full_space.get("member_count", 0),
            is_public=full_space.get("is_public", False),
            is_owner=full_space.get("is_owner", False)
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
    """Get members (members only or public)."""
    try:
        service = SpaceService()
        members = service.get_space_members(
            space_id=space_id,
            user_id=current_user.get("sub", "")
        )
        
        # Convert response fields to match expected format
        formatted_members = []
        for member in members:
            formatted_members.append(SpaceMember(
                user_id=member["user_id"],
                username=member.get("username", ""),
                email=member.get("email", ""),
                role=member["role"],
                joined_at=member["joined_at"]
            ))
        
        return formatted_members
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
            detail="Failed to get space members"
        )