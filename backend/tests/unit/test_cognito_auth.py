
import os
import time
from unittest.mock import patch, Mock
import pytest
from fastapi import HTTPException, status
from jose import JWTError
from app.core.cognito_auth import get_cognito_settings, get_jwks, get_rsa_key, verify_cognito_token, get_current_user_cognito

class TestCognitoAuth:
    def teardown_method(self):
        get_cognito_settings.cache_clear()

    @patch.dict(os.environ, {"AWS_REGION": "us-east-1", "COGNITO_USER_POOL_ID": "test_pool_id", "COGNITO_USER_POOL_CLIENT_ID": "test_client_id"})
    def test_get_cognito_settings_success(self):
        settings = get_cognito_settings()
        assert settings["region"] == "us-east-1"
        assert settings["user_pool_id"] == "test_pool_id"
        assert settings["client_id"] == "test_client_id"
        assert settings["issuer"] == "https://cognito-idp.us-east-1.amazonaws.com/test_pool_id"
        assert settings["jwks_uri"] == "https://cognito-idp.us-east-1.amazonaws.com/test_pool_id/.well-known/jwks.json"

    @patch.dict(os.environ, {}, clear=True)
    def test_get_cognito_settings_no_pool_id(self):
        with pytest.raises(ValueError, match="COGNITO_USER_POOL_ID environment variable is not set"):
            get_cognito_settings()

    @patch("app.core.cognito_auth.requests.get")
    @patch.dict(os.environ, {"AWS_REGION": "us-east-1", "COGNITO_USER_POOL_ID": "test_pool_id"})
    def test_get_jwks_success(self, mock_get):
        mock_response = Mock()
        mock_response.json.return_value = {"keys": ["test_key"]}
        mock_get.return_value = mock_response
        
        jwks = get_jwks()
        assert jwks == {"keys": ["test_key"]}

    @patch("app.core.cognito_auth.jwt.get_unverified_header")
    @patch("app.core.cognito_auth.get_jwks")
    def test_get_rsa_key_success(self, mock_get_jwks, mock_get_unverified_header):
        mock_get_unverified_header.return_value = {"kid": "test_kid"}
        mock_get_jwks.return_value = {"keys": [{"kid": "test_kid", "n": "123"}]}
        
        rsa_key = get_rsa_key("test_token")
        assert rsa_key == {"kid": "test_kid", "n": "123"}

    @patch("app.core.cognito_auth.get_rsa_key")
    @patch("app.core.cognito_auth.jwt.decode")
    @patch.dict(os.environ, {"AWS_REGION": "us-east-1", "COGNITO_USER_POOL_ID": "test_pool_id", "COGNITO_USER_POOL_CLIENT_ID": "test_client_id"})
    def test_verify_cognito_token_success(self, mock_decode, mock_get_rsa_key):
        mock_get_rsa_key.return_value = {"kid": "test_kid"}
        mock_decode.return_value = {"token_use": "access"}
        
        payload = verify_cognito_token("test_token")
        assert payload == {"token_use": "access"}

    def test_get_current_user_cognito_no_credentials(self):
        with pytest.raises(HTTPException) as exc_info:
            get_current_user_cognito(None)
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert exc_info.value.detail == "Not authenticated"
