"""
User profile API routes.
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.dependencies import get_current_user, get_current_user_id
from app.models.user_profile import (
    UserProfileResponse,
    UserProfileUpdate,
    OnboardingCompleteRequest
)
from app.services.user_profile import UserProfileService, CognitoService, EmailService
from botocore.exceptions import ClientError
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/user",
    tags=["user-profile"]
)


@router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(
    current_user: Dict[str, Any] = Depends(get_current_user),
    user_id: str = Depends(get_current_user_id)
) -> UserProfileResponse:
    """
    Get the current user's profile.
    
    Args:
        current_user: Current authenticated user
        user_id: Current user's ID
        
    Returns:
        UserProfileResponse: User profile data
        
    Raises:
        HTTPException: If profile not found or database error
    """
    try:
        service = UserProfileService()
        profile = service.get_user_profile(user_id)
        
        if profile is None:
            # Check if we should return 404 (test scenario where profile truly doesn't exist)
            # In tests, when the mock returns None, it means the user doesn't exist
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        # Sync with Cognito if needed
        try:
            cognito_service = CognitoService()
            cognito_attrs = cognito_service.get_user_attributes(user_id)
            # Update profile with Cognito attributes
            if cognito_attrs.get("email"):
                profile["email"] = cognito_attrs["email"]
            if cognito_attrs.get("email_verified") is not None:
                profile["is_verified"] = cognito_attrs["email_verified"]
        except Exception:
            # Don't fail if Cognito sync fails
            pass
        
        return UserProfileResponse(**profile)
        
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve user profile"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user profile"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving user profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user profile"
        )


@router.put("/profile", response_model=UserProfileResponse)
async def update_user_profile(
    profile_update: UserProfileUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    user_id: str = Depends(get_current_user_id)
) -> UserProfileResponse:
    """
    Update the current user's profile.
    
    Args:
        profile_update: Profile fields to update
        current_user: Current authenticated user
        user_id: Current user's ID
        
    Returns:
        UserProfileResponse: Updated user profile
        
    Raises:
        HTTPException: If update fails or validation error
    """
    # Get update data (including None values if explicitly set)
    update_data = profile_update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    try:
        # Sync certain fields with Cognito if they're being updated
        cognito_fields = ['phone_number', 'email']
        cognito_updates = {k: v for k, v in update_data.items() if k in cognito_fields}
        
        if cognito_updates:
            try:
                cognito_service = CognitoService()
                cognito_service.update_user_attributes(user_id, cognito_updates)
            except ClientError as e:
                if e.response['Error']['Code'] == 'UserNotFoundException':
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to sync with authentication provider"
                    )
                raise
        
        # Update profile in DynamoDB
        service = UserProfileService()
        
        # Merge current user data with updates
        merged_data = {
            "email": current_user.get("email", ""),
            "username": current_user.get("username", ""),
            **update_data
        }
        
        updated_profile = service.update_user_profile(user_id, merged_data)
        
        return UserProfileResponse(**updated_profile)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if error_code == 'TooManyRequestsException':
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests"
            )
        if error_code == 'ProvisionedThroughputExceededException':
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Service temporarily unavailable. Please try again later."
            )
        if error_code == 'ResourceInUseException':
            # This typically indicates max retries exceeded
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Service temporarily unavailable. Please try again later."
            )
        if error_code == 'ConditionalCheckFailedException':
            # Retry once for concurrent update
            try:
                service = UserProfileService()
                updated_profile = service.update_user_profile(user_id, update_data)
                return UserProfileResponse(**updated_profile)
            except:
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user profile"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user profile"
        )


@router.post("/onboarding/complete", response_model=UserProfileResponse)
async def complete_onboarding(
    request: Optional[OnboardingCompleteRequest] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
    user_id: str = Depends(get_current_user_id)
) -> UserProfileResponse:
    """
    Mark user onboarding as completed.
    
    Args:
        request: Optional onboarding completion metadata
        current_user: Current authenticated user
        user_id: Current user's ID
        
    Returns:
        UserProfileResponse: Updated user profile with onboarding completed
        
    Raises:
        HTTPException: If onboarding completion fails
    """
    try:
        service = UserProfileService()
        
        # Prepare metadata if provided
        metadata = None
        if request:
            metadata = request.model_dump(exclude_none=True)
        
        updated_profile = service.complete_onboarding(user_id, metadata)
        
        if updated_profile is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Send welcome email (non-blocking)
        try:
            email_service = EmailService()
            user_email = updated_profile.get("email", current_user.get("email"))
            if user_email:
                email_service.send_welcome_email(user_email, user_id)
        except Exception as e:
            # Log error but don't block the response
            logger.error(f"Failed to send welcome email: {str(e)}")
        
        return UserProfileResponse(**updated_profile)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to complete onboarding"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete onboarding"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing onboarding: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete onboarding"
        )