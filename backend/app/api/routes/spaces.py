"""
Space management endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query, Body
from typing import Optional
from jose import JWTError
from botocore.exceptions import ClientError
from app.models.space import (
    SpaceCreate, SpaceResponse, SpaceUpdate, 
    SpaceMember, SpaceListResponse, MembersListResponse
)
from app.models.common import SuccessResponse
from app.services.space import SpaceService
from app.services.exceptions import (
    SpaceNotFoundError, UnauthorizedError, ValidationError,
    InvalidInviteCodeError, AlreadyMemberError
)
from app.core.dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/spaces", tags=["Spaces"])


@router.post("", response_model=SpaceResponse, status_code=status.HTTP_201_CREATED)
async def create_space(
    space: SpaceCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new space with invite code generation."""
    try:
        logger.info(f"[API_CREATE_SPACE] Request received from user={current_user.get('sub')}, space_name={space.name}")

        service = SpaceService()
        result = service.create_space(
            space=space,
            owner_id=current_user.get("sub", "")
        )

        logger.info(f"[API_CREATE_SPACE] Service returned result with invite_code={result.get('invite_code')}")

        # Return SpaceResponse with proper field mapping
        # The model will handle the alias conversion (id -> spaceId)
        response = SpaceResponse(
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

        logger.info(f"[API_CREATE_SPACE] Returning response with invite_code={response.invite_code}")
        return response
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
            is_owner=result.get("is_owner", False),
            invite_code=result.get("invite_code")
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


@router.get("/{space_id}/members", response_model=MembersListResponse)
async def get_space_members(
    space_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get members (members only or public)."""
    try:
        logger.info(f"Getting members for space {space_id} by user {current_user.get('sub')}")
        service = SpaceService()
        members = service.get_space_members(
            space_id=space_id,
            user_id=current_user.get("sub", "")
        )
        
        # Convert response fields to match expected format
        formatted_members = []
        for member in members:
            # Handle display_name field - use username if not available, or empty string if both are None
            display_name = member.get("display_name")
            if display_name is None:
                username = member.get("username")
                display_name = username if username is not None else ""
            
            formatted_members.append(SpaceMember(
                user_id=member["user_id"],
                username=member.get("username"),  # Allow None
                email=member.get("email"),  # Allow None
                display_name=display_name,
                role=member["role"],
                joined_at=member["joined_at"]
            ))
        
        # Return MembersListResponse as expected by frontend
        return MembersListResponse(
            members=formatted_members,
            total=len(formatted_members),
            has_more=False
        )
    except SpaceNotFoundError as e:
        logger.error(f"Space not found: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except UnauthorizedError as e:
        logger.error(f"Unauthorized access: {e}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error getting space members: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get space members: {str(e)}"
        )


@router.post("/{space_id}/invite", response_model=dict)
async def regenerate_invite_code(
    space_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Regenerate invite code for a space (owner/admin only)."""
    try:
        service = SpaceService()
        
        # Check if user is owner/admin
        member = service.get_member(space_id, current_user.get("sub"))
        if not member or member.get("role") not in ["owner", "admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only owners and admins can regenerate invite codes"
            )
        
        # Generate new invite code
        new_code = service.regenerate_invite_code(space_id)
        
        return {
            "invite_code": new_code,
            "invite_url": f"/join/{new_code}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to regenerate invite code: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to regenerate invite code"
        )


@router.post("/join", response_model=SpaceResponse)
async def join_space_with_code(
    invite_code: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    """Join a space using an invite code."""
    try:
        service = SpaceService()
        result = service.join_space_with_invite_code(
            invite_code=invite_code,
            user_id=current_user.get("sub")
        )
        
        # Get full space details
        space = service.get_space(
            space_id=result["space_id"],
            user_id=current_user.get("sub")
        )
        
        return SpaceResponse(
            id=space["id"],
            name=space["name"],
            description=space.get("description"),
            type=space.get("type", "workspace"),
            owner_id=space["owner_id"],
            created_at=space["created_at"],
            updated_at=space["updated_at"],
            member_count=space.get("member_count", 0),
            is_public=space.get("is_public", False),
            is_owner=space.get("is_owner", False)
        )
    except InvalidInviteCodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except AlreadyMemberError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to join space with invite code: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to join space"
        )