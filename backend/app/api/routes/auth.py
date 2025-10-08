"""
Authentication endpoints.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, status
from app.models.user import UserCreate, UserResponse, LoginRequest, TokenResponse
from app.models.common import SuccessResponse
from app.services.cognito import CognitoService
from app.services.exceptions import UserAlreadyExistsError, InvalidCredentialsError
from app.core.dependencies import get_current_user
from pydantic import BaseModel


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class RefreshTokenRequest(BaseModel):
    """Refresh token request model."""
    refresh_token: str


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user: UserCreate):
    """Sign up a new user and create their profile."""
    try:
        service = CognitoService()
        result = service.sign_up(user)

        # Auto-confirm for development
        service.confirm_user(user.email)

        # CRITICAL: Create user profile in DynamoDB immediately
        # This ensures we have the correct data before first sign-in
        from app.services.user_profile import UserProfileService

        user_profile_service = UserProfileService()

        # Create profile with the actual sign-up data
        profile_data = {
            'email': user.email,
            'username': user.username,
            'display_name': user.username,  # Use username as initial display name
            'full_name': user.full_name or '',
            'last_seen': datetime.now(timezone.utc).isoformat()
        }

        user_profile_service.create_user_profile(
            user_id=result["user_sub"],
            profile_data=profile_data
        )

        return UserResponse(
            id=result["user_sub"],
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
    except UserAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        # Log the actual error for debugging
        import logging
        logging.error(f"Sign-up error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sign up user: {str(e)}"
        )


@router.post("/signin", response_model=TokenResponse)
async def signin(login: LoginRequest):
    """Sign in a user."""
    try:
        service = CognitoService()
        result = service.sign_in(login)

        # Return both access_token and id_token
        # Frontend needs to send id_token for profile info
        return TokenResponse(
            access_token=result["access_token"],
            id_token=result.get("id_token"),  # Include ID token
            refresh_token=result.get("refresh_token"),  # Include refresh token
            token_type="bearer",
            expires_in=result["expires_in"]
        )
    except InvalidCredentialsError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception as e:
        import logging
        logging.error(f"Sign-in error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sign in: {str(e)}"
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    """Refresh access token."""
    try:
        service = CognitoService()
        result = service.refresh_token(request.refresh_token)
        
        return TokenResponse(
            access_token=result["access_token"],
            token_type="bearer",
            expires_in=result["expires_in"]
        )
    except InvalidCredentialsError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh token"
        )


@router.post("/signout", response_model=SuccessResponse)
async def signout(current_user: dict = Depends(get_current_user)):
    """Sign out a user."""
    try:
        # In a real app, we'd get the access token from the request
        # For now, we'll just return success
        service = CognitoService()
        # service.sign_out(access_token)
        
        return SuccessResponse(
            message="Successfully signed out"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sign out"
        )