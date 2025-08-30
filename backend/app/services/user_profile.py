"""
User profile service for business logic.
"""
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from app.core.database import get_db
from botocore.exceptions import ClientError
import pytz


class UserProfileService:
    """Service for managing user profiles."""
    
    def __init__(self):
        """Initialize the service with database client."""
        self.db = get_db()
    
    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user profile from DynamoDB.
        
        Args:
            user_id: User ID to fetch profile for
            
        Returns:
            Optional[Dict]: User profile data or None if not found
        """
        try:
            # DynamoDB single table design: PK=USER#{userId}, SK=PROFILE
            pk = f"USER#{user_id}"
            sk = "PROFILE"
            
            profile = self.db.get_item(pk, sk)
            
            if profile:
                # Transform DynamoDB item to response format
                return self._transform_profile_response(profile)
            
            # Return minimal profile if not found (first time user)
            return None
            
        except ClientError:
            raise
    
    def update_user_profile(self, user_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update user profile in DynamoDB.
        
        Args:
            user_id: User ID to update profile for
            update_data: Dictionary of fields to update
            
        Returns:
            Dict: Updated user profile data
            
        Raises:
            ValueError: If timezone or language code is invalid
            ClientError: If DynamoDB operation fails
        """
        # Validate timezone if provided
        if 'timezone' in update_data and update_data['timezone']:
            try:
                pytz.timezone(update_data['timezone'])
            except pytz.exceptions.UnknownTimeZoneError:
                raise ValueError("Invalid timezone")
        
        # Validate language code if provided
        if 'language' in update_data and update_data['language']:
            # Basic ISO 639-1 validation (2-letter codes)
            valid_languages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh']
            if update_data['language'] not in valid_languages:
                raise ValueError("Invalid language code")
        
        # Add updated_at timestamp
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # DynamoDB single table design
        pk = f"USER#{user_id}"
        sk = "PROFILE"
        
        # Get existing profile or create new one
        existing_profile = self.db.get_item(pk, sk)
        
        if existing_profile:
            # Update existing profile
            updated_profile = self.db.update_item(pk, sk, update_data)
        else:
            # Create new profile
            profile_item = {
                'PK': pk,
                'SK': sk,
                'id': user_id,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'is_active': True,
                'is_verified': False,
                'onboarding_completed': False,
                'onboarding_step': 0,
                **update_data
            }
            self.db.put_item(profile_item)
            updated_profile = profile_item
        
        return self._transform_profile_response(updated_profile)
    
    def complete_onboarding(self, user_id: str, metadata: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """
        Mark user onboarding as completed.
        
        Args:
            user_id: User ID to complete onboarding for
            metadata: Optional metadata about onboarding completion
            
        Returns:
            Optional[Dict]: Updated user profile or None if user not found
            
        Raises:
            ValueError: If onboarding is already completed or steps not finished
            ClientError: If DynamoDB operation fails
        """
        # Get existing profile
        pk = f"USER#{user_id}"
        sk = "PROFILE"
        
        profile = self.db.get_item(pk, sk)
        
        if not profile:
            return None
        
        # Check if already completed
        if profile.get('onboarding_completed', False):
            raise ValueError("Onboarding already completed")
        
        # Check if all required steps are done (example: minimum step 3)
        current_step = profile.get('onboarding_step', 0)
        if current_step < 3:
            raise ValueError("Required onboarding steps not completed")
        
        # Update profile with onboarding completion
        update_data = {
            'onboarding_completed': True,
            'onboarding_step': 5,  # Set to final step
            'onboarding_completed_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        if metadata:
            update_data['onboarding_metadata'] = metadata
        
        updated_profile = self.db.update_item(pk, sk, update_data)
        
        return self._transform_profile_response(updated_profile)
    
    def create_user_profile(self, user_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new user profile in DynamoDB.
        
        Args:
            user_id: User ID to create profile for
            profile_data: Dictionary containing profile fields
            
        Returns:
            Dict: Created user profile data
            
        Raises:
            ClientError: If DynamoDB operation fails
        """
        pk = f"USER#{user_id}"
        sk = "PROFILE"
        profile_item = {
            'PK': pk,
            'SK': sk,
            'id': user_id,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
            'is_active': True,
            'is_verified': False,
            'onboarding_completed': False,
            'onboarding_step': 0,
            **profile_data
        }
        self.db.put_item(profile_item)
        return self._transform_profile_response(profile_item)
    
    def delete_user_profile(self, user_id: str) -> bool:
        """
        Delete a user profile from DynamoDB.
        
        Args:
            user_id: User ID to delete profile for
            
        Returns:
            bool: True if deletion was successful
            
        Raises:
            ClientError: If DynamoDB operation fails
        """
        pk = f"USER#{user_id}"
        sk = "PROFILE"
        return self.db.delete_item(pk, sk)
    
    def _transform_profile_response(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform DynamoDB item to API response format.
        
        Args:
            profile: Raw DynamoDB item
            
        Returns:
            Dict: Transformed profile for API response
        """
        # Remove DynamoDB keys
        response = {k: v for k, v in profile.items() if k not in ['PK', 'SK']}
        
        # Ensure required fields have defaults - these are required by UserProfileResponse
        response.setdefault('id', profile.get('id', ''))
        response.setdefault('email', profile.get('email', ''))
        response.setdefault('username', profile.get('username', ''))
        response.setdefault('onboarding_completed', False)
        response.setdefault('onboarding_step', 0)
        response.setdefault('created_at', profile.get('created_at', datetime.now(timezone.utc).isoformat()))
        response.setdefault('updated_at', profile.get('updated_at', datetime.now(timezone.utc).isoformat()))
        response.setdefault('is_active', True)
        response.setdefault('is_verified', False)
        
        return response


class CognitoService:
    """Service for AWS Cognito operations."""
    
    def get_user_attributes(self, user_id: str) -> Dict[str, Any]:
        """
        Get user attributes from Cognito.
        
        Args:
            user_id: User ID in Cognito
            
        Returns:
            Dict: User attributes from Cognito
        """
        # This would normally call AWS Cognito
        # For now, return mock data for testing
        return {
            "email": "user@example.com",
            "email_verified": True
        }
    
    def update_user_attributes(self, user_id: str, attributes: Dict[str, Any]) -> None:
        """
        Update user attributes in Cognito.
        
        Args:
            user_id: User ID in Cognito
            attributes: Attributes to update
        """
        # This would normally call AWS Cognito
        # For now, just pass for testing
        pass


class EmailService:
    """Service for sending emails."""
    
    def send_welcome_email(self, email: str, user_id: str) -> None:
        """
        Send welcome email to user.
        
        Args:
            email: User's email address
            user_id: User's ID
        """
        # This would normally send an email via AWS SES
        # For now, just pass for testing
        pass