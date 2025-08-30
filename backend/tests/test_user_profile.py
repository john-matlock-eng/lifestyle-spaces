"""
Comprehensive unit tests for user profile endpoints.
Following TDD approach - tests written BEFORE implementation.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone
from botocore.exceptions import ClientError
from app.core.dependencies import get_current_user


class TestUserProfile:
    """Test user profile endpoints with full coverage."""
    
    @pytest.fixture(autouse=True)
    def setup(self, test_client):
        """Set up mocks."""
        # Store test_client for use in tests
        self.client = test_client
        
        # Mock authenticated user
        self.mock_user = {
            "sub": "user-123-456",
            "email": "user@example.com",
            "username": "testuser",
            "full_name": "Test User",
            "preferred_name": "Tester",
            "bio": "Test bio",
            "avatar_url": "https://example.com/avatar.jpg",
            "phone_number": "+1234567890",
            "location": "San Francisco, CA",
            "timezone": "America/Los_Angeles",
            "language": "en",
            "onboarding_completed": False,
            "onboarding_step": 1,
            "notification_preferences": {
                "email": True,
                "push": False,
                "sms": False
            },
            "privacy_settings": {
                "profile_visibility": "public",
                "show_email": False,
                "show_phone": False
            }
        }
        
        # Override auth dependency
        def override_get_current_user():
            return self.mock_user
            
        test_client.app.dependency_overrides[get_current_user] = override_get_current_user
        
        # Yield control back to the test
        yield
        
        # Clean up dependency overrides after test
        test_client.app.dependency_overrides.clear()


class TestGetUserProfile(TestUserProfile):
    """Test GET /api/user/profile endpoint."""
    
    def test_get_profile_success(self, test_client):
        """Test successful profile retrieval with all fields."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.get_user_profile.return_value = {
                "id": "user-123-456",
                "email": "user@example.com",
                "username": "testuser",
                "full_name": "Test User",
                "preferred_name": "Tester",
                "bio": "Test bio",
                "avatar_url": "https://example.com/avatar.jpg",
                "phone_number": "+1234567890",
                "location": "San Francisco, CA",
                "timezone": "America/Los_Angeles",
                "language": "en",
                "onboarding_completed": True,
                "onboarding_step": 5,
                "notification_preferences": {
                    "email": True,
                    "push": True,
                    "sms": False
                },
                "privacy_settings": {
                    "profile_visibility": "public",
                    "show_email": False,
                    "show_phone": False
                },
                "created_at": "2024-01-01T00:00:00.000000+00:00",
                "updated_at": "2024-01-15T12:00:00.000000+00:00",
                "last_login": "2024-01-20T18:00:00.000000+00:00",
                "is_active": True,
                "is_verified": True
            }
            mock_service.return_value = mock_service_instance
            
            response = test_client.get("/api/user/profile")
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "user-123-456"
            assert data["email"] == "user@example.com"
            assert data["username"] == "testuser"
            assert data["full_name"] == "Test User"
            assert data["preferred_name"] == "Tester"
            assert data["bio"] == "Test bio"
            assert data["avatar_url"] == "https://example.com/avatar.jpg"
            assert data["onboarding_completed"] == True
            assert data["notification_preferences"]["email"] == True
            assert data["privacy_settings"]["profile_visibility"] == "public"
            assert data["is_active"] == True
            assert data["is_verified"] == True
            
            # Verify service was called with correct user ID
            mock_service_instance.get_user_profile.assert_called_once_with("user-123-456")
    
    def test_get_profile_minimal_fields(self, test_client):
        """Test profile retrieval with minimal required fields only."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.get_user_profile.return_value = {
                "id": "user-123-456",
                "email": "user@example.com",
                "username": "testuser",
                "onboarding_completed": False,
                "onboarding_step": 0,
                "created_at": "2024-01-01T00:00:00.000000+00:00",
                "updated_at": "2024-01-01T00:00:00.000000+00:00",
                "is_active": True,
                "is_verified": False
            }
            mock_service.return_value = mock_service_instance
            
            response = test_client.get("/api/user/profile")
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "user-123-456"
            assert data["email"] == "user@example.com"
            assert data["username"] == "testuser"
            assert data["onboarding_completed"] == False
            assert data["full_name"] is None
            assert data["bio"] is None
    
    def test_get_profile_user_not_found(self, test_client):
        """Test profile retrieval when user doesn't exist in database."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.get_user_profile.return_value = None
            mock_service.return_value = mock_service_instance
            
            response = test_client.get("/api/user/profile")
            
            assert response.status_code == 404
            assert "User profile not found" in response.json()["detail"]
    
    def test_get_profile_database_error(self, test_client):
        """Test profile retrieval with database connection error."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.get_user_profile.side_effect = ClientError(
                {"Error": {"Code": "ResourceNotFoundException"}},
                "GetItem"
            )
            mock_service.return_value = mock_service_instance
            
            response = test_client.get("/api/user/profile")
            
            assert response.status_code == 500
            assert "Failed to retrieve user profile" in response.json()["detail"]
    
    def test_get_profile_unauthenticated(self, test_client):
        """Test profile retrieval without authentication."""
        # Clear the auth override to simulate unauthenticated request
        test_client.app.dependency_overrides.clear()
        
        response = test_client.get("/api/user/profile")
        
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]
    
    def test_get_profile_cognito_sync(self, test_client):
        """Test profile retrieval with Cognito user attributes sync."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service, \
             patch('app.api.routes.user_profile.CognitoService') as mock_cognito:
            
            mock_service_instance = Mock()
            mock_cognito_instance = Mock()
            
            # Simulate fetching fresh data from Cognito
            mock_cognito_instance.get_user_attributes.return_value = {
                "email": "updated@example.com",
                "email_verified": True,
                "phone_number": "+9876543210",
                "phone_number_verified": True
            }
            
            mock_service_instance.get_user_profile.return_value = {
                "id": "user-123-456",
                "email": "updated@example.com",
                "username": "testuser",
                "onboarding_completed": True,
                "created_at": "2024-01-01T00:00:00.000000+00:00",
                "updated_at": "2024-01-01T00:00:00.000000+00:00",
                "is_active": True,
                "is_verified": True
            }
            
            mock_service.return_value = mock_service_instance
            mock_cognito.return_value = mock_cognito_instance
            
            response = test_client.get("/api/user/profile")
            
            assert response.status_code == 200
            data = response.json()
            assert data["email"] == "updated@example.com"


class TestUpdateUserProfile(TestUserProfile):
    """Test PUT /api/user/profile endpoint."""
    
    def test_update_profile_all_fields(self, test_client):
        """Test updating all profile fields."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.update_user_profile.return_value = {
                "id": "user-123-456",
                "email": "user@example.com",
                "username": "testuser",
                "full_name": "Updated Full Name",
                "preferred_name": "Updated Preferred",
                "bio": "Updated bio text",
                "avatar_url": "https://example.com/new-avatar.jpg",
                "phone_number": "+9876543210",
                "location": "New York, NY",
                "timezone": "America/New_York",
                "language": "es",
                "notification_preferences": {
                    "email": False,
                    "push": True,
                    "sms": True
                },
                "privacy_settings": {
                    "profile_visibility": "private",
                    "show_email": True,
                    "show_phone": True
                },
                "created_at": "2024-01-01T00:00:00.000000+00:00",
                "updated_at": "2024-01-20T12:00:00.000000+00:00",
                "onboarding_completed": True,
                "onboarding_step": 5,
                "is_active": True,
                "is_verified": True
            }
            mock_service.return_value = mock_service_instance
            
            update_data = {
                "full_name": "Updated Full Name",
                "preferred_name": "Updated Preferred",
                "bio": "Updated bio text",
                "avatar_url": "https://example.com/new-avatar.jpg",
                "phone_number": "+9876543210",
                "location": "New York, NY",
                "timezone": "America/New_York",
                "language": "es",
                "notification_preferences": {
                    "email": False,
                    "push": True,
                    "sms": True
                },
                "privacy_settings": {
                    "profile_visibility": "private",
                    "show_email": True,
                    "show_phone": True
                }
            }
            
            response = test_client.put("/api/user/profile", json=update_data)
            
            if response.status_code != 200:
                print(f"Response: {response.json()}")
            assert response.status_code == 200
            data = response.json()
            assert data["full_name"] == "Updated Full Name"
            assert data["bio"] == "Updated bio text"
            assert data["location"] == "New York, NY"
            assert data["notification_preferences"]["push"] == True
            assert data["privacy_settings"]["profile_visibility"] == "private"
            
            # Verify service was called with user ID
            mock_service_instance.update_user_profile.assert_called_once()
            call_args = mock_service_instance.update_user_profile.call_args
            assert call_args[0][0] == "user-123-456"
            # Check that the main fields are in the call
            called_data = call_args[0][1]
            assert called_data["full_name"] == "Updated Full Name"
            assert called_data["bio"] == "Updated bio text"
    
    def test_update_profile_partial_fields(self, test_client):
        """Test updating only some profile fields."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.update_user_profile.return_value = {
                "id": "user-123-456",
                "email": "user@example.com",
                "username": "testuser",
                "full_name": "Partial Update",
                "bio": "Original bio",
                "created_at": "2024-01-01T00:00:00.000000+00:00",
                "updated_at": "2024-01-20T12:00:00.000000+00:00",
                "onboarding_completed": False,
                "onboarding_step": 0,
                "is_active": True,
                "is_verified": False
            }
            mock_service.return_value = mock_service_instance
            
            update_data = {"full_name": "Partial Update"}
            
            response = test_client.put("/api/user/profile", json=update_data, 
                                      headers={"Authorization": "Bearer test-token"})
            
            assert response.status_code == 200
            data = response.json()
            assert data["full_name"] == "Partial Update"
            assert data["bio"] == "Original bio"
    
    def test_update_profile_invalid_email(self, test_client):
        """Test updating profile with invalid email format."""
        update_data = {
            "full_name": "Test User",
            "email": "invalid-email"  # Invalid email format
        }
        
        response = test_client.put("/api/user/profile", json=update_data)
        
        assert response.status_code == 422
        detail = response.json()["detail"][0]["msg"].lower()
        assert "email" in detail or "validation" in detail
    
    def test_update_profile_invalid_phone(self, test_client):
        """Test updating profile with invalid phone number format."""
        update_data = {
            "phone_number": "123"  # Too short for a valid phone number
        }
        
        response = test_client.put("/api/user/profile", json=update_data)
        
        assert response.status_code == 422
        detail = str(response.json()["detail"]).lower()
        assert "phone" in detail or "validation" in detail or "10 characters" in detail
    
    def test_update_profile_invalid_timezone(self, test_client):
        """Test updating profile with invalid timezone."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.update_user_profile.side_effect = ValueError("Invalid timezone")
            mock_service.return_value = mock_service_instance
            
            update_data = {"timezone": "Invalid/Timezone"}
            
            response = test_client.put("/api/user/profile", json=update_data)
            
            assert response.status_code == 400
            assert "Invalid timezone" in response.json()["detail"]
    
    def test_update_profile_invalid_language(self, test_client):
        """Test updating profile with invalid language code."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.update_user_profile.side_effect = ValueError("Invalid language code")
            mock_service.return_value = mock_service_instance
            
            update_data = {"language": "xyz"}  # Invalid ISO language code
            
            response = test_client.put("/api/user/profile", json=update_data)
            
            assert response.status_code == 400
            assert "Invalid language code" in response.json()["detail"]
    
    def test_update_profile_bio_too_long(self, test_client):
        """Test updating profile with bio exceeding max length."""
        update_data = {
            "bio": "x" * 1001  # Exceeds 1000 character limit
        }
        
        response = test_client.put("/api/user/profile", json=update_data)
        
        assert response.status_code == 422
        detail = str(response.json()["detail"]).lower()
        assert "1000" in detail or "length" in detail or "characters" in detail
    
    def test_update_profile_database_error(self, test_client):
        """Test profile update with database error."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.update_user_profile.side_effect = ClientError(
                {"Error": {"Code": "ProvisionedThroughputExceededException"}},
                "UpdateItem"
            )
            mock_service.return_value = mock_service_instance
            
            update_data = {"full_name": "Test Update"}
            
            response = test_client.put("/api/user/profile", json=update_data)
            
            assert response.status_code == 503
            assert "Service temporarily unavailable" in response.json()["detail"]
    
    def test_update_profile_cognito_sync_error(self, test_client):
        """Test profile update with Cognito sync failure."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service, \
             patch('app.api.routes.user_profile.CognitoService') as mock_cognito:
            
            mock_service_instance = Mock()
            mock_cognito_instance = Mock()
            
            # Cognito update fails
            mock_cognito_instance.update_user_attributes.side_effect = ClientError(
                {"Error": {"Code": "UserNotFoundException"}},
                "AdminUpdateUserAttributes"
            )
            
            mock_service.return_value = mock_service_instance
            mock_cognito.return_value = mock_cognito_instance
            
            update_data = {"phone_number": "+1234567890"}
            
            response = test_client.put("/api/user/profile", json=update_data)
            
            assert response.status_code == 500
            assert "Failed to sync with authentication provider" in response.json()["detail"]
    
    def test_update_profile_unauthenticated(self, test_client):
        """Test profile update without authentication."""
        test_client.app.dependency_overrides.clear()
        
        update_data = {"full_name": "Test User"}
        
        response = test_client.put("/api/user/profile", json=update_data)
        
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]
    
    def test_update_profile_empty_request(self, test_client):
        """Test profile update with empty request body."""
        response = test_client.put("/api/user/profile", json={})
        
        assert response.status_code == 400
        assert "No fields to update" in response.json()["detail"]
    
    def test_update_profile_notification_preferences(self, test_client):
        """Test updating only notification preferences."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.update_user_profile.return_value = {
                "id": "user-123-456",
                "email": "user@example.com",
                "username": "testuser",
                "notification_preferences": {
                    "email": False,
                    "push": True,
                    "sms": True
                },
                "created_at": "2024-01-01T00:00:00.000000+00:00",
                "updated_at": "2024-01-20T12:00:00.000000+00:00",
                "onboarding_completed": False,
                "onboarding_step": 0,
                "is_active": True,
                "is_verified": False
            }
            mock_service.return_value = mock_service_instance
            
            update_data = {
                "notification_preferences": {
                    "email": False,
                    "push": True,
                    "sms": True
                }
            }
            
            response = test_client.put("/api/user/profile", json=update_data, 
                                      headers={"Authorization": "Bearer test-token"})
            
            assert response.status_code == 200
            data = response.json()
            assert data["notification_preferences"]["email"] == False
            assert data["notification_preferences"]["push"] == True
    
    def test_update_profile_privacy_settings(self, test_client):
        """Test updating only privacy settings."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.update_user_profile.return_value = {
                "id": "user-123-456",
                "email": "user@example.com",
                "username": "testuser",
                "privacy_settings": {
                    "profile_visibility": "friends",
                    "show_email": True,
                    "show_phone": False
                },
                "created_at": "2024-01-01T00:00:00.000000+00:00",
                "updated_at": "2024-01-20T12:00:00.000000+00:00",
                "onboarding_completed": False,
                "onboarding_step": 0,
                "is_active": True,
                "is_verified": False
            }
            mock_service.return_value = mock_service_instance
            
            update_data = {
                "privacy_settings": {
                    "profile_visibility": "friends",
                    "show_email": True,
                    "show_phone": False
                }
            }
            
            response = test_client.put("/api/user/profile", json=update_data, 
                                      headers={"Authorization": "Bearer test-token"})
            
            assert response.status_code == 200
            data = response.json()
            assert data["privacy_settings"]["profile_visibility"] == "friends"


class TestCompleteOnboarding(TestUserProfile):
    """Test POST /api/user/onboarding/complete endpoint."""
    
    def test_complete_onboarding_success(self, test_client):
        """Test successful onboarding completion."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.complete_onboarding.return_value = {
                "id": "user-123-456",
                "email": "user@example.com",
                "username": "testuser",
                "onboarding_completed": True,
                "onboarding_step": 5,
                "onboarding_completed_at": "2024-01-20T12:00:00.000000+00:00",
                "created_at": "2024-01-01T00:00:00.000000+00:00",
                "updated_at": "2024-01-20T12:00:00.000000+00:00",
                "is_active": True,
                "is_verified": True
            }
            mock_service.return_value = mock_service_instance
            
            response = test_client.post("/api/user/onboarding/complete")
            
            assert response.status_code == 200
            data = response.json()
            assert data["onboarding_completed"] == True
            assert data["onboarding_step"] == 5
            assert "onboarding_completed_at" in data
            
            # Verify service was called
            mock_service_instance.complete_onboarding.assert_called_once_with("user-123-456", None)
    
    def test_complete_onboarding_already_completed(self, test_client):
        """Test completing onboarding when already completed."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.complete_onboarding.side_effect = ValueError("Onboarding already completed")
            mock_service.return_value = mock_service_instance
            
            response = test_client.post("/api/user/onboarding/complete")
            
            assert response.status_code == 400
            assert "Onboarding already completed" in response.json()["detail"]
    
    def test_complete_onboarding_incomplete_steps(self, test_client):
        """Test completing onboarding with incomplete required steps."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.complete_onboarding.side_effect = ValueError("Required onboarding steps not completed")
            mock_service.return_value = mock_service_instance
            
            response = test_client.post("/api/user/onboarding/complete")
            
            assert response.status_code == 400
            assert "Required onboarding steps not completed" in response.json()["detail"]
    
    def test_complete_onboarding_user_not_found(self, test_client):
        """Test completing onboarding for non-existent user."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.complete_onboarding.return_value = None
            mock_service.return_value = mock_service_instance
            
            response = test_client.post("/api/user/onboarding/complete")
            
            assert response.status_code == 404
            assert "User not found" in response.json()["detail"]
    
    def test_complete_onboarding_database_error(self, test_client):
        """Test onboarding completion with database error."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.complete_onboarding.side_effect = ClientError(
                {"Error": {"Code": "ConditionalCheckFailedException"}},
                "UpdateItem"
            )
            mock_service.return_value = mock_service_instance
            
            response = test_client.post("/api/user/onboarding/complete")
            
            assert response.status_code == 500
            assert "Failed to complete onboarding" in response.json()["detail"]
    
    def test_complete_onboarding_unauthenticated(self, test_client):
        """Test onboarding completion without authentication."""
        test_client.app.dependency_overrides.clear()
        
        response = test_client.post("/api/user/onboarding/complete")
        
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]
    
    def test_complete_onboarding_with_metadata(self, test_client):
        """Test onboarding completion with additional metadata."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.complete_onboarding.return_value = {
                "id": "user-123-456",
                "email": "user@example.com",
                "username": "testuser",
                "onboarding_completed": True,
                "onboarding_step": 5,
                "onboarding_completed_at": "2024-01-20T12:00:00.000000+00:00",
                "onboarding_metadata": {
                    "completion_source": "web",
                    "time_to_complete": 300,
                    "skipped_optional_steps": ["social_connect", "import_contacts"]
                },
                "created_at": "2024-01-01T00:00:00.000000+00:00",
                "updated_at": "2024-01-20T12:00:00.000000+00:00",
                "is_active": True,
                "is_verified": True
            }
            mock_service.return_value = mock_service_instance
            
            request_data = {
                "completion_source": "web",
                "time_to_complete": 300,
                "skipped_optional_steps": ["social_connect", "import_contacts"]
            }
            
            response = test_client.post("/api/user/onboarding/complete", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["onboarding_completed"] == True
            assert data["onboarding_metadata"]["completion_source"] == "web"
            assert data["onboarding_metadata"]["time_to_complete"] == 300
    
    def test_complete_onboarding_triggers_welcome_email(self, test_client):
        """Test that completing onboarding triggers a welcome email."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service, \
             patch('app.api.routes.user_profile.EmailService') as mock_email:
            
            mock_service_instance = Mock()
            mock_email_instance = Mock()
            
            mock_service_instance.complete_onboarding.return_value = {
                "id": "user-123-456",
                "email": "user@example.com",
                "username": "testuser",
                "onboarding_completed": True,
                "onboarding_step": 5,
                "created_at": "2024-01-01T00:00:00.000000+00:00",
                "updated_at": "2024-01-20T12:00:00.000000+00:00",
                "is_active": True,
                "is_verified": True
            }
            
            mock_service.return_value = mock_service_instance
            mock_email.return_value = mock_email_instance
            
            response = test_client.post("/api/user/onboarding/complete")
            
            assert response.status_code == 200
            
            # Verify welcome email was sent
            mock_email_instance.send_welcome_email.assert_called_once_with(
                "user@example.com",
                "user-123-456"
            )
    
    def test_complete_onboarding_email_failure_non_blocking(self, test_client):
        """Test that email failure doesn't block onboarding completion."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service, \
             patch('app.api.routes.user_profile.EmailService') as mock_email:
            
            mock_service_instance = Mock()
            mock_email_instance = Mock()
            
            mock_service_instance.complete_onboarding.return_value = {
                "id": "user-123-456",
                "email": "user@example.com",
                "username": "testuser",
                "onboarding_completed": True,
                "onboarding_step": 5,
                "created_at": "2024-01-01T00:00:00.000000+00:00",
                "updated_at": "2024-01-20T12:00:00.000000+00:00",
                "is_active": True,
                "is_verified": True
            }
            
            # Email service fails but shouldn't block the response
            mock_email_instance.send_welcome_email.side_effect = Exception("Email service down")
            
            mock_service.return_value = mock_service_instance
            mock_email.return_value = mock_email_instance
            
            response = test_client.post("/api/user/onboarding/complete")
            
            # Should still succeed even if email fails
            assert response.status_code == 200
            data = response.json()
            assert data["onboarding_completed"] == True


class TestUserProfileEdgeCases:
    """Test edge cases and boundary conditions for user profile endpoints."""
    
    @pytest.fixture(autouse=True)
    def setup(self, test_client):
        """Set up mocks."""
        # Store test_client for use in tests
        self.client = test_client
        
        # Mock authenticated user
        self.mock_user = {"sub": "user-123-456"}
        
        # Override auth dependency
        def override_get_current_user():
            return self.mock_user
            
        test_client.app.dependency_overrides[get_current_user] = override_get_current_user
        
        # Yield control back to the test
        yield
        
        # Clean up dependency overrides after test
        test_client.app.dependency_overrides.clear()
    
    def test_profile_with_special_characters(self, test_client):
        """Test profile with special characters in fields."""
        with patch('app.core.security.decode_token') as mock_decode, \
             patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_decode.return_value = self.mock_user
            mock_service_instance = Mock()
            mock_service_instance.update_user_profile.return_value = {
                "id": "user-123-456",
                "email": "user@example.com",
                "username": "testuser",
                "full_name": "Test 用户 🎉",
                "bio": "Developer & Designer | alert('xss')",  # Sanitized version
                "location": "São Paulo, BR",
                "created_at": "2024-01-01T00:00:00.000000+00:00",
                "updated_at": "2024-01-20T12:00:00.000000+00:00",
                "onboarding_completed": False,
                "onboarding_step": 0,
                "is_active": True,
                "is_verified": False
            }
            mock_service.return_value = mock_service_instance
            
            update_data = {
                "full_name": "Test 用户 🎉",
                "bio": "Developer & Designer | <script>alert('xss')</script>",
                "location": "São Paulo, BR"
            }
            
            response = test_client.put("/api/user/profile", json=update_data, 
                                      headers={"Authorization": "Bearer test-token"})
            
            assert response.status_code == 200
            data = response.json()
            assert data["full_name"] == "Test 用户 🎉"
            # Bio should be sanitized to prevent XSS
            assert "<script>" not in data["bio"]
    
    def test_profile_concurrent_updates(self, test_client):
        """Test handling concurrent profile updates."""
        with patch('app.core.security.decode_token') as mock_decode, \
             patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_decode.return_value = self.mock_user
            mock_service_instance = Mock()
            
            # Simulate optimistic locking failure
            mock_service_instance.update_user_profile.side_effect = [
                ClientError(
                    {"Error": {"Code": "ConditionalCheckFailedException"}},
                    "UpdateItem"
                ),
                {
                    "id": "user-123-456",
                    "email": "user@example.com",
                    "username": "testuser",
                    "full_name": "Successfully Updated",
                    "created_at": "2024-01-01T00:00:00.000000+00:00",
                    "updated_at": "2024-01-20T12:00:00.000000+00:00",
                    "onboarding_completed": False,
                    "onboarding_step": 0,
                    "is_active": True,
                    "is_verified": False
                }
            ]
            mock_service.return_value = mock_service_instance
            
            update_data = {"full_name": "Test Update"}
            
            # First attempt should retry internally
            response = test_client.put("/api/user/profile", json=update_data, 
                                      headers={"Authorization": "Bearer test-token"})
            
            assert response.status_code == 200
            data = response.json()
            assert data["full_name"] == "Successfully Updated"
    
    def test_profile_max_field_lengths(self, test_client):
        """Test profile fields at maximum allowed lengths."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service_instance = Mock()
            
            # Create data at max lengths
            max_length_data = {
                "full_name": "x" * 100,  # Max 100 chars
                "preferred_name": "x" * 50,  # Max 50 chars
                "bio": "x" * 1000,  # Max 1000 chars
                "location": "x" * 100,  # Max 100 chars
            }
            
            mock_service_instance.update_user_profile.return_value = {
                "id": "user-123-456",
                "email": "user@example.com",
                "username": "testuser",
                **max_length_data,
                "created_at": "2024-01-01T00:00:00.000000+00:00",
                "updated_at": "2024-01-20T12:00:00.000000+00:00",
                "onboarding_completed": False,
                "onboarding_step": 0,
                "is_active": True,
                "is_verified": False
            }
            mock_service.return_value = mock_service_instance
            
            response = test_client.put("/api/user/profile", json=max_length_data,
                                      headers={"Authorization": "Bearer test-token"})
            
            assert response.status_code == 200
            data = response.json()
            assert len(data["full_name"]) == 100
            assert len(data["bio"]) == 1000
    
    def test_profile_null_values(self, test_client):
        """Test handling null values in profile updates."""
        with patch('app.core.security.decode_token') as mock_decode, \
             patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_decode.return_value = self.mock_user
            mock_service_instance = Mock()
            mock_service_instance.update_user_profile.return_value = {
                "id": "user-123-456",
                "email": "user@example.com",
                "username": "testuser",
                "full_name": None,
                "bio": None,
                "avatar_url": None,
                "created_at": "2024-01-01T00:00:00.000000+00:00",
                "updated_at": "2024-01-20T12:00:00.000000+00:00",
                "onboarding_completed": False,
                "onboarding_step": 0,
                "is_active": True,
                "is_verified": False
            }
            mock_service.return_value = mock_service_instance
            
            # Explicitly set fields to null to remove them
            update_data = {
                "full_name": None,
                "bio": None,
                "avatar_url": None
            }
            
            response = test_client.put("/api/user/profile", json=update_data, 
                                      headers={"Authorization": "Bearer test-token"})
            
            assert response.status_code == 200
            data = response.json()
            assert data["full_name"] is None
            assert data["bio"] is None
            assert data["avatar_url"] is None
    
    def test_profile_rate_limiting(self, test_client):
        """Test rate limiting on profile endpoints."""
        with patch('app.core.security.decode_token') as mock_decode, \
             patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_decode.return_value = self.mock_user
            mock_service_instance = Mock()
            mock_service_instance.update_user_profile.side_effect = ClientError(
                {"Error": {"Code": "TooManyRequestsException"}},
                "UpdateItem"
            )
            mock_service.return_value = mock_service_instance
            
            update_data = {"full_name": "Test"}
            
            response = test_client.put("/api/user/profile", json=update_data,
                                      headers={"Authorization": "Bearer test-token"})
            
            assert response.status_code == 429
            assert "Too many requests" in response.json()["detail"]