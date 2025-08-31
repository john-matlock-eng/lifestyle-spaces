"""
Invitation management endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from app.models.invitation import (
    InvitationCreate, InvitationResponse, 
    InvitationAccept, InvitationListResponse
)
from app.models.common import SuccessResponse
from app.services.invitation import InvitationService
from app.services.space import SpaceService
from app.services.exceptions import (
    InvitationAlreadyExistsError, InvalidInvitationError,
    InvitationExpiredError, SpaceNotFoundError, UnauthorizedError
)
from app.core.dependencies import get_current_user


router = APIRouter(tags=["Invitations"])


@router.post("/api/spaces/{space_id}/invitations", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
async def create_invitation(
    space_id: str,
    invitation: InvitationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create an invitation to a space."""
    try:
        # Check if user has permission to invite
        space_service = SpaceService()
        space = space_service.get_space(space_id, current_user.get("sub", ""))
        
        if not space_service.can_edit_space(space_id, current_user.get("sub", "")):
            raise UnauthorizedError("You don't have permission to invite members")
        
        invitation_service = InvitationService()
        result = invitation_service.create_invitation(
            invitation=invitation,
            space_id=space_id,
            space_name=space["name"],
            inviter_id=current_user.get("sub", ""),
            inviter_name=current_user.get("full_name", current_user.get("email", ""))
        )
        
        return InvitationResponse(**result)
    except InvitationAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
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
            detail="Failed to create invitation"
        )


@router.get("/api/invitations", response_model=InvitationListResponse)
async def get_invitations(
    current_user: dict = Depends(get_current_user)
):
    """Get invitations for current user."""
    try:
        service = InvitationService()
        result = service.list_user_invitations(
            email=current_user.get("email", "")
        )
        
        return InvitationListResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get invitations"
        )


@router.post("/api/invitations/{invitation_id}/accept", response_model=SuccessResponse)
async def accept_invitation(
    invitation_id: str,
    accept: InvitationAccept,
    current_user: dict = Depends(get_current_user)
):
    """Accept an invitation."""
    try:
        service = InvitationService()
        result = service.accept_invitation(
            invitation_code=accept.invitation_code,
            user_id=current_user.get("sub", ""),
            username=current_user.get("username", ""),
            email=current_user.get("email", "")
        )
        
        return SuccessResponse(
            message=f"Successfully joined {result['space_name']} as {result['role']}",
            data=result
        )
    except InvalidInvitationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except InvitationExpiredError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to accept invitation"
        )