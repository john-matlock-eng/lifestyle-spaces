"""
User management service with authentication and DynamoDB operations.
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from botocore.exceptions import ClientError
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import UserCreate, UserUpdate
from app.services.exceptions import (
    UserNotFoundError,
    UserAlreadyExistsError,
    InvalidCredentialsError,
    ExternalServiceError,
    ValidationError
)

# Configure logging
logger = logging.getLogger(__name__)


class UserService:
    """Service for user management operations."""
    
    def __init__(self):
        """Initialize the service with database client."""
        self.db = get_db()
    
    def register_user(self, user: UserCreate) -> Dict[str, Any]:
        """
        Register a new user in the system.
        
        Args:
            user: UserCreate model with registration data
            
        Returns:
            Dict: Created user data with id, timestamps
            
        Raises:
            UserAlreadyExistsError: If email or username already exists
            ValidationError: If input validation fails
            ExternalServiceError: If DynamoDB operation fails
        """
        try:
            # Validate input
            if not user.email or not user.username:
                raise ValidationError("Email and username are required")
            
            # Check if user already exists by email
            existing_user = self._get_user_by_email(user.email)
            if existing_user:
                raise UserAlreadyExistsError(f"User with email {user.email} already exists")
            
            # Check if username is already taken
            existing_username = self._get_user_by_username(user.username)
            if existing_username:
                raise UserAlreadyExistsError(f"Username {user.username} is already taken")
            
            # Generate user ID and timestamps
            user_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            
            # Hash the password
            hashed_password = get_password_hash(user.password)
            
            # Create user item for DynamoDB (single table design)
            user_item = {
                'PK': f'USER#{user_id}',
                'SK': 'METADATA',
                'id': user_id,
                'email': user.email,
                'username': user.username,
                'full_name': user.full_name,
                'password_hash': hashed_password,
                'is_active': True,
                'is_verified': False,
                'created_at': now,
                'updated_at': now,
                # GSI for email lookup
                'GSI1PK': f'EMAIL#{user.email}',
                'GSI1SK': f'USER#{user_id}',
                # GSI for username lookup
                'GSI2PK': f'USERNAME#{user.username}',
                'GSI2SK': f'USER#{user_id}'
            }
            
            # Store user in DynamoDB
            self.db.put_item(user_item)
            
            logger.info(f"User registered successfully: {user_id}")
            
            # Return user data (without password hash)
            return {
                'id': user_id,
                'email': user.email,
                'username': user.username,
                'full_name': user.full_name,
                'is_active': True,
                'is_verified': False,
                'created_at': now,
                'updated_at': now
            }
            
        except (UserAlreadyExistsError, ValidationError):
            raise
        except ClientError as e:
            logger.error(f"DynamoDB error during user registration: {e}")
            raise ExternalServiceError(f"Failed to register user: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error during user registration: {e}")
            raise ExternalServiceError(f"An unexpected error occurred: {str(e)}")
    
    def get_user(self, user_id: str) -> Dict[str, Any]:
        """
        Get user by ID.
        
        Args:
            user_id: User ID to fetch
            
        Returns:
            Dict: User data
            
        Raises:
            UserNotFoundError: If user not found
            ExternalServiceError: If DynamoDB operation fails
        """
        try:
            # Validate input
            if not user_id:
                raise ValidationError("User ID is required")
            
            # Get user from DynamoDB
            pk = f'USER#{user_id}'
            sk = 'METADATA'
            
            user_item = self.db.get_item(pk, sk)
            
            if not user_item:
                raise UserNotFoundError(f"User with ID {user_id} not found")
            
            # Remove sensitive data before returning
            return self._sanitize_user_data(user_item)
            
        except (UserNotFoundError, ValidationError):
            raise
        except ClientError as e:
            logger.error(f"DynamoDB error fetching user {user_id}: {e}")
            raise ExternalServiceError(f"Failed to fetch user: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error fetching user {user_id}: {e}")
            raise ExternalServiceError(f"An unexpected error occurred: {str(e)}")
    
    def update_user(self, user_id: str, update_data: UserUpdate) -> Dict[str, Any]:
        """
        Update user information.
        
        Args:
            user_id: User ID to update
            update_data: UserUpdate model with fields to update
            
        Returns:
            Dict: Updated user data
            
        Raises:
            UserNotFoundError: If user not found
            UserAlreadyExistsError: If new email is already taken
            ValidationError: If input validation fails
            ExternalServiceError: If DynamoDB operation fails
        """
        try:
            # Validate input
            if not user_id:
                raise ValidationError("User ID is required")
            
            # Check if user exists
            pk = f'USER#{user_id}'
            sk = 'METADATA'
            
            existing_user = self.db.get_item(pk, sk)
            if not existing_user:
                raise UserNotFoundError(f"User with ID {user_id} not found")
            
            # Build update dictionary
            updates = {}
            
            # Check if email is being updated
            if update_data.email and update_data.email != existing_user.get('email'):
                # Check if new email is already taken
                email_check = self._get_user_by_email(update_data.email)
                if email_check:
                    raise UserAlreadyExistsError(f"Email {update_data.email} is already in use")
                updates['email'] = update_data.email
                # Update GSI1 for email lookup (would need a transaction in production)
                updates['GSI1PK'] = f'EMAIL#{update_data.email}'
            
            # Update full name if provided
            if update_data.full_name is not None:
                updates['full_name'] = update_data.full_name
            
            # Add updated timestamp
            if updates:
                updates['updated_at'] = datetime.now(timezone.utc).isoformat()
                
                # Update the user in DynamoDB
                updated_user = self.db.update_item(pk, sk, updates)
                
                if not updated_user:
                    raise ExternalServiceError("Failed to update user")
                
                logger.info(f"User {user_id} updated successfully")
                
                # Return sanitized user data
                return self._sanitize_user_data(updated_user)
            else:
                # No updates to apply
                return self._sanitize_user_data(existing_user)
            
        except (UserNotFoundError, UserAlreadyExistsError, ValidationError):
            raise
        except ClientError as e:
            logger.error(f"DynamoDB error updating user {user_id}: {e}")
            raise ExternalServiceError(f"Failed to update user: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error updating user {user_id}: {e}")
            raise ExternalServiceError(f"An unexpected error occurred: {str(e)}")
    
    def authenticate_user(self, email: str, password: str) -> Dict[str, Any]:
        """
        Authenticate a user and return access token.
        
        Args:
            email: User email
            password: Plain text password
            
        Returns:
            Dict: Access token and user data
            
        Raises:
            InvalidCredentialsError: If credentials are invalid
            UserNotFoundError: If user not found
            ExternalServiceError: If DynamoDB operation fails
        """
        try:
            # Get user by email
            user = self._get_user_by_email(email)
            
            if not user:
                raise InvalidCredentialsError("Invalid email or password")
            
            # Verify password
            if not verify_password(password, user.get('password_hash', '')):
                raise InvalidCredentialsError("Invalid email or password")
            
            # Check if user is active
            if not user.get('is_active', False):
                raise InvalidCredentialsError("User account is inactive")
            
            # Create access token
            token_data = {
                'sub': user['id'],
                'email': user['email'],
                'username': user.get('username', '')
            }
            access_token = create_access_token(data=token_data)
            
            logger.info(f"User {user['id']} authenticated successfully")
            
            return {
                'access_token': access_token,
                'token_type': 'bearer',
                'user': self._sanitize_user_data(user)
            }
            
        except (InvalidCredentialsError, UserNotFoundError):
            raise
        except ClientError as e:
            logger.error(f"DynamoDB error during authentication: {e}")
            raise ExternalServiceError(f"Failed to authenticate user: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error during authentication: {e}")
            raise ExternalServiceError(f"An unexpected error occurred: {str(e)}")
    
    def _get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Get user by email using GSI.
        
        Args:
            email: User email to search
            
        Returns:
            Optional[Dict]: User data if found, None otherwise
        """
        try:
            # Query GSI1 for email lookup
            items = self.db.query(
                pk=f'EMAIL#{email}',
                index_name='GSI1'
            )
            
            if items:
                # Get the user ID from GSI result
                user_id = items[0].get('GSI1SK', '').replace('USER#', '')
                if user_id:
                    # Fetch full user data
                    return self.db.get_item(f'USER#{user_id}', 'METADATA')
            
            return None
            
        except ClientError as e:
            logger.error(f"Error fetching user by email {email}: {e}")
            return None
    
    def _get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """
        Get user by username using GSI.
        
        Args:
            username: Username to search
            
        Returns:
            Optional[Dict]: User data if found, None otherwise
        """
        try:
            # Query GSI2 for username lookup
            items = self.db.query(
                pk=f'USERNAME#{username}',
                index_name='GSI2'
            )
            
            if items:
                # Get the user ID from GSI result
                user_id = items[0].get('GSI2SK', '').replace('USER#', '')
                if user_id:
                    # Fetch full user data
                    return self.db.get_item(f'USER#{user_id}', 'METADATA')
            
            return None
            
        except ClientError as e:
            logger.error(f"Error fetching user by username {username}: {e}")
            return None
    
    def _sanitize_user_data(self, user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Remove sensitive data from user object.
        
        Args:
            user: Raw user data from database
            
        Returns:
            Dict: Sanitized user data
        """
        # Remove DynamoDB keys and sensitive data
        sanitized = {k: v for k, v in user.items() 
                    if k not in ['PK', 'SK', 'GSI1PK', 'GSI1SK', 'GSI2PK', 'GSI2SK', 'password_hash']}
        
        # Ensure required fields
        sanitized.setdefault('id', user.get('id', ''))
        sanitized.setdefault('email', user.get('email', ''))
        sanitized.setdefault('username', user.get('username', ''))
        sanitized.setdefault('full_name', user.get('full_name'))
        sanitized.setdefault('is_active', user.get('is_active', True))
        sanitized.setdefault('is_verified', user.get('is_verified', False))
        sanitized.setdefault('created_at', user.get('created_at', ''))
        sanitized.setdefault('updated_at', user.get('updated_at', ''))
        
        return sanitized