"""
User management endpoints.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
from botocore.exceptions import ClientError
from app.models.user import UserResponse, UserUpdate, UserCreate
from app.models.space import SpaceListResponse, SpaceResponse
from app.services.cognito import CognitoService
from app.services.space import SpaceService
from app.services.user import UserService
from app.services.exceptions import UserAlreadyExistsError, ValidationError
from app.core.dependencies import get_current_user
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/users", tags=["Users"])


@router.post("/register", response_model=UserResponse)
async def register_user(user_data: UserCreate):
    """Register a new user."""
    try:
        service = UserService()
        user = service.register_user(user_data)
        return UserResponse(**user)
    except UserAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user"
        )


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
    limit: int = Query(20, ge=1, description="Maximum number of spaces to return"),
    offset: int = Query(0, ge=0, description="Number of spaces to skip"),
    search: Optional[str] = Query(None, description="Search term for space name or description"),
    isPublic: Optional[bool] = Query(None, description="Filter by public/private spaces"),
    role: Optional[str] = Query(None, description="Filter by user's role in the space"),
    current_user: dict = Depends(get_current_user)
):
    """Get spaces for current user with pagination/filters."""
    logger.info(f"Getting spaces for user: {current_user.get('sub', 'unknown')}")
    logger.info(f"Query params - limit: {limit}, offset: {offset}, search: {search}, isPublic: {isPublic}, role: {role}")
    
    try:
        service = SpaceService()
        
        # Cap limit at 100 (instead of rejecting with validation error)
        limit = min(limit, 100)
        
        # Convert offset/limit to page/page_size
        page = (offset // limit) + 1 if limit > 0 else 1
        page_size = limit
        
        logger.info(f"Calling SpaceService.list_user_spaces with user_id={current_user.get('sub', '')}, page={page}, page_size={page_size}")
        
        result = service.list_user_spaces(
            user_id=current_user.get("sub", ""),
            page=page,
            page_size=page_size,
            search=search,
            is_public=isPublic,
            role=role
        )
        
        logger.info(f"SpaceService returned {result.get('total', 0)} total spaces")
        
        # Calculate if there are more results
        total_pages = (result["total"] + page_size - 1) // page_size if page_size > 0 else 1
        has_more = page < total_pages
        
        # Convert raw space dicts to SpaceResponse models
        space_models = []
        for space_data in result.get("spaces", []):
            # Remove user_role as it's not part of SpaceResponse
            space_data_copy = space_data.copy()
            space_data_copy.pop('user_role', None)
            space_models.append(SpaceResponse(**space_data_copy))
        
        # Create and return the list response
        response = SpaceListResponse(
            spaces=space_models,
            total=result["total"],
            page=page,
            page_size=page_size,
            has_more=has_more
        )
        
        # Log the response for debugging
        logger.info(f"Returning SpaceListResponse with {len(response.spaces)} spaces")
        logger.info(f"Response model dict: {response.model_dump()}")
        
        return response
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        error_message = e.response.get('Error', {}).get('Message', str(e))
        logger.error(f"AWS ClientError in get_user_spaces: {error_code} - {error_message}", exc_info=True)
        
        if error_code == 'ProvisionedThroughputExceededException':
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database throughput exceeded"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {error_message}"
        )
    except Exception as e:
        logger.error(f"Unexpected error in get_user_spaces: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user spaces: {str(e)}"
        )