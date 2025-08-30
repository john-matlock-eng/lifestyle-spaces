"""
Comprehensive unit tests for UserService with 100% coverage.
Tests all methods including error paths and edge cases.
"""
import uuid
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone
from botocore.exceptions import ClientError

from app.services.user import UserService
from app.models.user import UserCreate, UserUpdate
from app.services.exceptions import (
    UserNotFoundError,
    UserAlreadyExistsError,
    InvalidCredentialsError,
    ExternalServiceError,
    ValidationError
)


class TestUserService:
    """Test UserService class."""
    
    @pytest.fixture
    def mock_db(self):
        """Create a mock database client."""
        with patch('app.services.user.get_db') as mock_get_db:
            mock_db = Mock()
            mock_get_db.return_value = mock_db
            yield mock_db
    
    @pytest.fixture
    def user_service(self, mock_db):
        """Create UserService instance with mocked database."""
        return UserService()
    
    @pytest.fixture
    def sample_user_create(self):
        """Sample UserCreate data for testing."""
        return UserCreate(
            email="test@example.com",
            username="testuser",
            full_name="Test User",
            password="SecurePassword123!"
        )
    
    @pytest.fixture
    def sample_user_db(self):
        """Sample user data from database."""
        return {
            'PK': 'USER#123e4567-e89b-12d3-a456-426614174000',
            'SK': 'METADATA',
            'id': '123e4567-e89b-12d3-a456-426614174000',
            'email': 'test@example.com',
            'username': 'testuser',
            'full_name': 'Test User',
            'password_hash': 'hashed_password_here',
            'is_active': True,
            'is_verified': False,
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z',
            'GSI1PK': 'EMAIL#test@example.com',
            'GSI1SK': 'USER#123e4567-e89b-12d3-a456-426614174000',
            'GSI2PK': 'USERNAME#testuser',
            'GSI2SK': 'USER#123e4567-e89b-12d3-a456-426614174000'
        }
    
    # Test register_user method (lines 46-113)
    
    def test_register_user_success(self, user_service, mock_db, sample_user_create):
        """Test successful user registration."""
        # Mock the database methods
        mock_db.put_item.return_value = True
        mock_db.query.return_value = []  # No existing users
        
        with patch('app.services.user.get_password_hash') as mock_hash:
            mock_hash.return_value = 'hashed_password'
            with patch('app.services.user.uuid.uuid4') as mock_uuid:
                mock_uuid.return_value = uuid.UUID('123e4567-e89b-12d3-a456-426614174000')
                
                result = user_service.register_user(sample_user_create)
        
        assert result['email'] == 'test@example.com'
        assert result['username'] == 'testuser'
        assert result['full_name'] == 'Test User'
        assert result['is_active'] is True
        assert result['is_verified'] is False
        assert 'id' in result
        assert 'created_at' in result
        assert 'updated_at' in result
        mock_db.put_item.assert_called_once()
    
    def test_register_user_missing_email(self, user_service, mock_db):
        """Test registration with missing email."""
        # Use a mock object directly to test the validation logic
        user_data = Mock()
        user_data.email = ""
        user_data.username = "testuser"
        user_data.full_name = "Test User"
        user_data.password = "SecurePassword123!"
        
        with pytest.raises(ValidationError, match="Email and username are required"):
            user_service.register_user(user_data)
    
    def test_register_user_missing_username(self, user_service, mock_db):
        """Test registration with missing username."""
        # Use a mock object directly to test the validation logic
        user_data = Mock()
        user_data.email = "test@example.com"
        user_data.username = ""
        user_data.full_name = "Test User"
        user_data.password = "SecurePassword123!"
        
        with pytest.raises(ValidationError, match="Email and username are required"):
            user_service.register_user(user_data)
    
    def test_register_user_email_already_exists(self, user_service, mock_db, sample_user_create, sample_user_db):
        """Test registration when email already exists."""
        # Mock _get_user_by_email to return existing user
        with patch.object(user_service, '_get_user_by_email', return_value=sample_user_db):
            with pytest.raises(UserAlreadyExistsError, match="User with email test@example.com already exists"):
                user_service.register_user(sample_user_create)
    
    def test_register_user_username_already_taken(self, user_service, mock_db, sample_user_create, sample_user_db):
        """Test registration when username is already taken."""
        # Mock _get_user_by_email to return None (email not exists)
        # Mock _get_user_by_username to return existing user
        with patch.object(user_service, '_get_user_by_email', return_value=None):
            with patch.object(user_service, '_get_user_by_username', return_value=sample_user_db):
                with pytest.raises(UserAlreadyExistsError, match="Username testuser is already taken"):
                    user_service.register_user(sample_user_create)
    
    def test_register_user_dynamodb_error(self, user_service, mock_db, sample_user_create):
        """Test registration with DynamoDB error."""
        mock_db.query.return_value = []  # No existing users
        mock_db.put_item.side_effect = ClientError(
            {'Error': {'Code': 'InternalServerError', 'Message': 'Database error'}}, 
            'PutItem'
        )
        
        with patch('app.services.user.get_password_hash') as mock_hash:
            mock_hash.return_value = 'hashed_password'
            with pytest.raises(ExternalServiceError, match="Failed to register user"):
                user_service.register_user(sample_user_create)
    
    def test_register_user_unexpected_error(self, user_service, mock_db, sample_user_create):
        """Test registration with unexpected error."""
        mock_db.query.return_value = []  # No existing users
        mock_db.put_item.side_effect = Exception("Unexpected error")
        
        with patch('app.services.user.get_password_hash') as mock_hash:
            mock_hash.return_value = 'hashed_password'
            with pytest.raises(ExternalServiceError, match="An unexpected error occurred"):
                user_service.register_user(sample_user_create)
    
    # Test get_user method (lines 129-153)
    
    def test_get_user_success(self, user_service, mock_db, sample_user_db):
        """Test successful user retrieval."""
        mock_db.get_item.return_value = sample_user_db
        
        result = user_service.get_user('123e4567-e89b-12d3-a456-426614174000')
        
        assert result['id'] == '123e4567-e89b-12d3-a456-426614174000'
        assert result['email'] == 'test@example.com'
        assert result['username'] == 'testuser'
        assert 'password_hash' not in result
        assert 'PK' not in result
        assert 'SK' not in result
    
    def test_get_user_missing_id(self, user_service, mock_db):
        """Test get_user with missing user_id."""
        with pytest.raises(ValidationError, match="User ID is required"):
            user_service.get_user("")
    
    def test_get_user_not_found(self, user_service, mock_db):
        """Test get_user when user doesn't exist."""
        mock_db.get_item.return_value = None
        
        with pytest.raises(UserNotFoundError, match="User with ID test-id not found"):
            user_service.get_user("test-id")
    
    def test_get_user_dynamodb_error(self, user_service, mock_db):
        """Test get_user with DynamoDB error."""
        mock_db.get_item.side_effect = ClientError(
            {'Error': {'Code': 'InternalServerError', 'Message': 'Database error'}},
            'GetItem'
        )
        
        with pytest.raises(ExternalServiceError, match="Failed to fetch user"):
            user_service.get_user("test-id")
    
    def test_get_user_unexpected_error(self, user_service, mock_db):
        """Test get_user with unexpected error."""
        mock_db.get_item.side_effect = Exception("Unexpected error")
        
        with pytest.raises(ExternalServiceError, match="An unexpected error occurred"):
            user_service.get_user("test-id")
    
    # Test update_user method (lines 172-227)
    
    def test_update_user_success(self, user_service, mock_db, sample_user_db):
        """Test successful user update."""
        mock_db.get_item.return_value = sample_user_db
        updated_user = sample_user_db.copy()
        updated_user['email'] = 'newemail@example.com'
        updated_user['full_name'] = 'Updated Name'
        mock_db.update_item.return_value = updated_user
        
        update_data = UserUpdate(
            email="newemail@example.com",
            full_name="Updated Name"
        )
        
        with patch.object(user_service, '_get_user_by_email', return_value=None):
            result = user_service.update_user('123e4567-e89b-12d3-a456-426614174000', update_data)
        
        assert result['email'] == 'newemail@example.com'
        assert result['full_name'] == 'Updated Name'
        assert 'password_hash' not in result
    
    def test_update_user_missing_id(self, user_service, mock_db):
        """Test update_user with missing user_id."""
        update_data = UserUpdate(email="newemail@example.com")
        
        with pytest.raises(ValidationError, match="User ID is required"):
            user_service.update_user("", update_data)
    
    def test_update_user_not_found(self, user_service, mock_db):
        """Test update_user when user doesn't exist."""
        mock_db.get_item.return_value = None
        update_data = UserUpdate(email="newemail@example.com")
        
        with pytest.raises(UserNotFoundError, match="User with ID test-id not found"):
            user_service.update_user("test-id", update_data)
    
    def test_update_user_email_already_taken(self, user_service, mock_db, sample_user_db):
        """Test update_user when new email is already taken."""
        mock_db.get_item.return_value = sample_user_db
        update_data = UserUpdate(email="taken@example.com")
        
        # Mock _get_user_by_email to return another user
        other_user = sample_user_db.copy()
        other_user['id'] = 'other-user-id'
        with patch.object(user_service, '_get_user_by_email', return_value=other_user):
            with pytest.raises(UserAlreadyExistsError, match="Email taken@example.com is already in use"):
                user_service.update_user('123e4567-e89b-12d3-a456-426614174000', update_data)
    
    def test_update_user_only_full_name(self, user_service, mock_db, sample_user_db):
        """Test updating only full_name field."""
        mock_db.get_item.return_value = sample_user_db
        updated_user = sample_user_db.copy()
        updated_user['full_name'] = 'New Name Only'
        mock_db.update_item.return_value = updated_user
        
        update_data = UserUpdate(full_name="New Name Only")
        
        result = user_service.update_user('123e4567-e89b-12d3-a456-426614174000', update_data)
        
        assert result['full_name'] == 'New Name Only'
        assert result['email'] == 'test@example.com'  # Unchanged
    
    def test_update_user_no_changes(self, user_service, mock_db, sample_user_db):
        """Test update_user with no actual changes."""
        mock_db.get_item.return_value = sample_user_db
        
        # Update with same email (no actual change)
        update_data = UserUpdate(email="test@example.com")
        
        result = user_service.update_user('123e4567-e89b-12d3-a456-426614174000', update_data)
        
        assert result['email'] == 'test@example.com'
        # update_item should not be called when there are no changes
        mock_db.update_item.assert_not_called()
    
    def test_update_user_empty_update(self, user_service, mock_db, sample_user_db):
        """Test update_user with empty update data."""
        mock_db.get_item.return_value = sample_user_db
        
        update_data = UserUpdate()
        
        result = user_service.update_user('123e4567-e89b-12d3-a456-426614174000', update_data)
        
        assert result['email'] == 'test@example.com'
        mock_db.update_item.assert_not_called()
    
    def test_update_user_update_fails(self, user_service, mock_db, sample_user_db):
        """Test update_user when database update returns None."""
        mock_db.get_item.return_value = sample_user_db
        mock_db.update_item.return_value = None
        
        update_data = UserUpdate(full_name="New Name")
        
        with pytest.raises(ExternalServiceError, match="Failed to update user"):
            user_service.update_user('123e4567-e89b-12d3-a456-426614174000', update_data)
    
    def test_update_user_dynamodb_error(self, user_service, mock_db, sample_user_db):
        """Test update_user with DynamoDB error."""
        mock_db.get_item.return_value = sample_user_db
        mock_db.update_item.side_effect = ClientError(
            {'Error': {'Code': 'InternalServerError', 'Message': 'Database error'}},
            'UpdateItem'
        )
        
        update_data = UserUpdate(full_name="New Name")
        
        with pytest.raises(ExternalServiceError, match="Failed to update user"):
            user_service.update_user('123e4567-e89b-12d3-a456-426614174000', update_data)
    
    def test_update_user_unexpected_error(self, user_service, mock_db, sample_user_db):
        """Test update_user with unexpected error."""
        mock_db.get_item.return_value = sample_user_db
        mock_db.update_item.side_effect = Exception("Unexpected error")
        
        update_data = UserUpdate(full_name="New Name")
        
        with pytest.raises(ExternalServiceError, match="An unexpected error occurred"):
            user_service.update_user('123e4567-e89b-12d3-a456-426614174000', update_data)
    
    # Test authenticate_user method (lines 245-283)
    
    def test_authenticate_user_success(self, user_service, mock_db, sample_user_db):
        """Test successful user authentication."""
        with patch.object(user_service, '_get_user_by_email', return_value=sample_user_db):
            with patch('app.services.user.verify_password', return_value=True):
                with patch('app.services.user.create_access_token', return_value='test-token'):
                    result = user_service.authenticate_user('test@example.com', 'password123')
        
        assert result['access_token'] == 'test-token'
        assert result['token_type'] == 'bearer'
        assert result['user']['email'] == 'test@example.com'
        assert 'password_hash' not in result['user']
    
    def test_authenticate_user_not_found(self, user_service, mock_db):
        """Test authentication when user not found."""
        with patch.object(user_service, '_get_user_by_email', return_value=None):
            with pytest.raises(InvalidCredentialsError, match="Invalid email or password"):
                user_service.authenticate_user('notfound@example.com', 'password123')
    
    def test_authenticate_user_wrong_password(self, user_service, mock_db, sample_user_db):
        """Test authentication with wrong password."""
        with patch.object(user_service, '_get_user_by_email', return_value=sample_user_db):
            with patch('app.services.user.verify_password', return_value=False):
                with pytest.raises(InvalidCredentialsError, match="Invalid email or password"):
                    user_service.authenticate_user('test@example.com', 'wrongpassword')
    
    def test_authenticate_user_inactive(self, user_service, mock_db, sample_user_db):
        """Test authentication with inactive user."""
        inactive_user = sample_user_db.copy()
        inactive_user['is_active'] = False
        
        with patch.object(user_service, '_get_user_by_email', return_value=inactive_user):
            with patch('app.services.user.verify_password', return_value=True):
                with pytest.raises(InvalidCredentialsError, match="User account is inactive"):
                    user_service.authenticate_user('test@example.com', 'password123')
    
    def test_authenticate_user_missing_password_hash(self, user_service, mock_db, sample_user_db):
        """Test authentication when user has no password_hash field."""
        user_no_password = sample_user_db.copy()
        del user_no_password['password_hash']
        
        with patch.object(user_service, '_get_user_by_email', return_value=user_no_password):
            with patch('app.services.user.verify_password', return_value=False):
                with pytest.raises(InvalidCredentialsError, match="Invalid email or password"):
                    user_service.authenticate_user('test@example.com', 'password123')
    
    def test_authenticate_user_missing_is_active(self, user_service, mock_db, sample_user_db):
        """Test authentication when user has no is_active field (defaults to False)."""
        user_no_active = sample_user_db.copy()
        del user_no_active['is_active']
        
        with patch.object(user_service, '_get_user_by_email', return_value=user_no_active):
            with patch('app.services.user.verify_password', return_value=True):
                with pytest.raises(InvalidCredentialsError, match="User account is inactive"):
                    user_service.authenticate_user('test@example.com', 'password123')
    
    def test_authenticate_user_dynamodb_error(self, user_service, mock_db):
        """Test authentication with DynamoDB error."""
        with patch.object(user_service, '_get_user_by_email', side_effect=ClientError(
            {'Error': {'Code': 'InternalServerError', 'Message': 'Database error'}},
            'Query'
        )):
            with pytest.raises(ExternalServiceError, match="Failed to authenticate user"):
                user_service.authenticate_user('test@example.com', 'password123')
    
    def test_authenticate_user_unexpected_error(self, user_service, mock_db):
        """Test authentication with unexpected error."""
        with patch.object(user_service, '_get_user_by_email', side_effect=Exception("Unexpected error")):
            with pytest.raises(ExternalServiceError, match="An unexpected error occurred"):
                user_service.authenticate_user('test@example.com', 'password123')
    
    # Test _get_user_by_email method (lines 295-313)
    
    def test_get_user_by_email_found(self, user_service, mock_db, sample_user_db):
        """Test _get_user_by_email when user is found."""
        mock_db.query.return_value = [
            {'GSI1SK': 'USER#123e4567-e89b-12d3-a456-426614174000'}
        ]
        mock_db.get_item.return_value = sample_user_db
        
        result = user_service._get_user_by_email('test@example.com')
        
        assert result == sample_user_db
        mock_db.query.assert_called_with(
            pk='EMAIL#test@example.com',
            index_name='GSI1'
        )
        mock_db.get_item.assert_called_with(
            'USER#123e4567-e89b-12d3-a456-426614174000',
            'METADATA'
        )
    
    def test_get_user_by_email_not_found(self, user_service, mock_db):
        """Test _get_user_by_email when user is not found."""
        mock_db.query.return_value = []
        
        result = user_service._get_user_by_email('notfound@example.com')
        
        assert result is None
        mock_db.query.assert_called_with(
            pk='EMAIL#notfound@example.com',
            index_name='GSI1'
        )
    
    def test_get_user_by_email_no_user_id(self, user_service, mock_db):
        """Test _get_user_by_email when GSI result has no valid user ID."""
        mock_db.query.return_value = [
            {}  # Missing GSI1SK key entirely
        ]
        
        result = user_service._get_user_by_email('test@example.com')
        
        assert result is None
    
    def test_get_user_by_email_empty_user_id(self, user_service, mock_db):
        """Test _get_user_by_email when user ID is empty after parsing."""
        mock_db.query.return_value = [
            {'GSI1SK': 'USER#'}  # Empty ID after prefix
        ]
        
        result = user_service._get_user_by_email('test@example.com')
        
        assert result is None
    
    def test_get_user_by_email_client_error(self, user_service, mock_db):
        """Test _get_user_by_email with ClientError."""
        mock_db.query.side_effect = ClientError(
            {'Error': {'Code': 'InternalServerError', 'Message': 'Database error'}},
            'Query'
        )
        
        result = user_service._get_user_by_email('test@example.com')
        
        assert result is None
    
    # Test _get_user_by_username method (lines 325-343)
    
    def test_get_user_by_username_found(self, user_service, mock_db, sample_user_db):
        """Test _get_user_by_username when user is found."""
        mock_db.query.return_value = [
            {'GSI2SK': 'USER#123e4567-e89b-12d3-a456-426614174000'}
        ]
        mock_db.get_item.return_value = sample_user_db
        
        result = user_service._get_user_by_username('testuser')
        
        assert result == sample_user_db
        mock_db.query.assert_called_with(
            pk='USERNAME#testuser',
            index_name='GSI2'
        )
        mock_db.get_item.assert_called_with(
            'USER#123e4567-e89b-12d3-a456-426614174000',
            'METADATA'
        )
    
    def test_get_user_by_username_not_found(self, user_service, mock_db):
        """Test _get_user_by_username when user is not found."""
        mock_db.query.return_value = []
        
        result = user_service._get_user_by_username('notfound')
        
        assert result is None
        mock_db.query.assert_called_with(
            pk='USERNAME#notfound',
            index_name='GSI2'
        )
    
    def test_get_user_by_username_no_user_id(self, user_service, mock_db):
        """Test _get_user_by_username when GSI result has no valid user ID."""
        mock_db.query.return_value = [
            {}  # Missing GSI2SK key entirely
        ]
        
        result = user_service._get_user_by_username('testuser')
        
        assert result is None
    
    def test_get_user_by_username_empty_user_id(self, user_service, mock_db):
        """Test _get_user_by_username when user ID is empty after parsing."""
        mock_db.query.return_value = [
            {'GSI2SK': 'USER#'}  # Empty ID after prefix
        ]
        
        result = user_service._get_user_by_username('testuser')
        
        assert result is None
    
    def test_get_user_by_username_client_error(self, user_service, mock_db):
        """Test _get_user_by_username with ClientError."""
        mock_db.query.side_effect = ClientError(
            {'Error': {'Code': 'InternalServerError', 'Message': 'Database error'}},
            'Query'
        )
        
        result = user_service._get_user_by_username('testuser')
        
        assert result is None
    
    # Test _sanitize_user_data method (lines 356-369)
    
    def test_sanitize_user_data_complete(self, user_service, sample_user_db):
        """Test _sanitize_user_data with complete user data."""
        result = user_service._sanitize_user_data(sample_user_db)
        
        # Check that sensitive fields are removed
        assert 'PK' not in result
        assert 'SK' not in result
        assert 'GSI1PK' not in result
        assert 'GSI1SK' not in result
        assert 'GSI2PK' not in result
        assert 'GSI2SK' not in result
        assert 'password_hash' not in result
        
        # Check that required fields are present
        assert result['id'] == '123e4567-e89b-12d3-a456-426614174000'
        assert result['email'] == 'test@example.com'
        assert result['username'] == 'testuser'
        assert result['full_name'] == 'Test User'
        assert result['is_active'] is True
        assert result['is_verified'] is False
        assert result['created_at'] == '2024-01-01T00:00:00Z'
        assert result['updated_at'] == '2024-01-01T00:00:00Z'
    
    def test_sanitize_user_data_minimal(self, user_service):
        """Test _sanitize_user_data with minimal user data."""
        minimal_user = {
            'PK': 'USER#123',
            'SK': 'METADATA',
            'password_hash': 'secret'
        }
        
        result = user_service._sanitize_user_data(minimal_user)
        
        # Check that sensitive fields are removed
        assert 'PK' not in result
        assert 'SK' not in result
        assert 'password_hash' not in result
        
        # Check that defaults are set
        assert result['id'] == ''
        assert result['email'] == ''
        assert result['username'] == ''
        assert result['full_name'] is None
        assert result['is_active'] is True
        assert result['is_verified'] is False
        assert result['created_at'] == ''
        assert result['updated_at'] == ''
    
    def test_sanitize_user_data_partial(self, user_service):
        """Test _sanitize_user_data with partial user data."""
        partial_user = {
            'id': 'user-123',
            'email': 'partial@example.com',
            'PK': 'USER#user-123',
            'SK': 'METADATA',
            'password_hash': 'hashed',
            'extra_field': 'extra_value'
        }
        
        result = user_service._sanitize_user_data(partial_user)
        
        # Check that sensitive fields are removed
        assert 'PK' not in result
        assert 'SK' not in result
        assert 'password_hash' not in result
        
        # Check that existing fields are preserved
        assert result['id'] == 'user-123'
        assert result['email'] == 'partial@example.com'
        assert result['extra_field'] == 'extra_value'
        
        # Check that missing fields get defaults
        assert result['username'] == ''
        assert result['full_name'] is None
        assert result['is_active'] is True
        assert result['is_verified'] is False
        assert result['created_at'] == ''
        assert result['updated_at'] == ''
    
    def test_sanitize_user_data_all_gsi_keys(self, user_service):
        """Test _sanitize_user_data removes known GSI keys."""
        user_with_gsi = {
            'id': 'user-123',
            'email': 'test@example.com',
            'GSI1PK': 'EMAIL#test@example.com',
            'GSI1SK': 'USER#user-123',
            'GSI2PK': 'USERNAME#testuser',
            'GSI2SK': 'USER#user-123',
            'other_field': 'other_value'
        }
        
        result = user_service._sanitize_user_data(user_with_gsi)
        
        # Check that known GSI keys are removed
        assert 'GSI1PK' not in result
        assert 'GSI1SK' not in result
        assert 'GSI2PK' not in result
        assert 'GSI2SK' not in result
        
        # Check that non-GSI fields are preserved
        assert result['id'] == 'user-123'
        assert result['email'] == 'test@example.com'
        assert result['other_field'] == 'other_value'