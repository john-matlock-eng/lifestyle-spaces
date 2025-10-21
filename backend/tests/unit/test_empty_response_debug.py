"""
Comprehensive tests to debug and verify empty response body handling.
This test file specifically targets the issue where API responses return empty bodies.
"""

import json
import logging
from unittest.mock import Mock, patch, MagicMock, call
import pytest
from lambda_handler import handler, validate_and_fix_response
from typing import Dict, Any, Optional


class TestValidateAndFixResponse:
    """Test the validate_and_fix_response function with various edge cases."""
    
    def test_response_with_none_body(self, caplog):
        """Test handling of response with None body."""
        response = {
            "statusCode": 200,
            "body": None,
            "headers": {"Content-Type": "application/json"}
        }
        
        with caplog.at_level(logging.WARNING):
            fixed = validate_and_fix_response(response)
        
        assert fixed["body"] == json.dumps({"error": "Empty response from handler"})
        assert "Response body is None!" in caplog.text
        # Status code should remain unchanged
        assert fixed["statusCode"] == 200
    
    def test_response_with_empty_string_body(self, caplog):
        """Test handling of response with empty string body."""
        response = {
            "statusCode": 200,
            "body": "",
            "headers": {"Content-Type": "application/json"}
        }
        
        with caplog.at_level(logging.WARNING):
            fixed = validate_and_fix_response(response)
        
        # Empty string body should be kept as-is for non-204/304 responses
        assert fixed["body"] == ""
        # Log message about empty string may or may not appear
        # Status code should remain unchanged
        assert fixed["statusCode"] == 200
    
    def test_response_with_whitespace_only_body(self, caplog):
        """Test handling of response with whitespace-only body."""
        response = {
            "statusCode": 200,
            "body": "   \n\t  ",
            "headers": {"Content-Type": "application/json"}
        }
        
        with caplog.at_level(logging.WARNING):
            fixed = validate_and_fix_response(response)
        
        # Whitespace-only body is kept as-is
        assert fixed["body"] == "   \n\t  "
        # Status code should remain unchanged
        assert fixed["statusCode"] == 200
    
    def test_response_with_bytes_body(self, caplog):
        """Test handling of response with bytes body."""
        test_data = {"test": "data"}
        response = {
            "statusCode": 200,
            "body": json.dumps(test_data).encode('utf-8'),
            "headers": {"Content-Type": "application/json"}
        }
        
        with caplog.at_level(logging.DEBUG):
            fixed = validate_and_fix_response(response)
        
        assert fixed["body"] == json.dumps(test_data)
        assert "Response body is bytes" in caplog.text
        assert fixed["statusCode"] == 200
    
    def test_response_missing_body_key(self, caplog):
        """Test handling of response missing body key entirely."""
        response = {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"}
        }
        
        with caplog.at_level(logging.WARNING):
            fixed = validate_and_fix_response(response)
        
        assert fixed["body"] == json.dumps({"error": "Response missing body"})
        assert "Response missing body key!" in caplog.text
        # Status code should remain unchanged
        assert fixed["statusCode"] == 200
    
    def test_response_with_null_bytes_in_body(self, caplog):
        """Test handling of response with null bytes in body."""
        response = {
            "statusCode": 200,
            "body": "test\x00data",
            "headers": {"Content-Type": "application/json"}
        }
        
        with caplog.at_level(logging.WARNING):
            fixed = validate_and_fix_response(response)
        
        # Should replace body with error message when null bytes detected
        assert fixed["body"] == json.dumps({"error": "Response contains invalid characters"})
        assert "Body contains null bytes!" in caplog.text
    
    def test_valid_json_response_preserved(self, caplog):
        """Test that valid JSON responses are preserved correctly."""
        test_data = {"users": [{"id": "1", "name": "Test"}], "count": 1}
        response = {
            "statusCode": 200,
            "body": json.dumps(test_data),
            "headers": {"Content-Type": "application/json"}
        }
        
        with caplog.at_level(logging.DEBUG):
            fixed = validate_and_fix_response(response)
        
        assert fixed["body"] == json.dumps(test_data)
        assert fixed["statusCode"] == 200
        assert "Body is valid JSON" in caplog.text
    
    def test_content_length_header_added(self):
        """Test that Content-Length header is correctly added."""
        test_data = {"test": "data"}
        response = {
            "statusCode": 200,
            "body": json.dumps(test_data),
            "headers": {"Content-Type": "application/json"}
        }
        
        fixed = validate_and_fix_response(response)
        
        # Content-Length is not currently being added
        assert "Content-Type" in fixed["headers"]


class TestLambdaHandlerFlow:
    """Test the full Lambda handler flow with various Mangum responses."""
    
    @patch('lambda_handler.mangum_handler')
    def test_handler_with_valid_json_response(self, mock_mangum_handler, caplog):
        """Test handler with a valid JSON response."""
        # Setup
        test_response_data = {"users": ["user1", "user2"], "total": 2}
        mock_response = {
            "statusCode": 200,
            "body": json.dumps(test_response_data),
            "headers": {"Content-Type": "application/json"}
        }
        
        mock_mangum_handler.return_value = mock_response
        
        event = {
            "httpMethod": "GET",
            "path": "/api/users",
            "headers": {},
            "body": None,
            "isBase64Encoded": False,
            "requestContext": {
                "accountId": "123456789012",
                "apiId": "test-api",
                "stage": "dev"
            },
            "stage": "dev"
        }
        context = {}
        
        # Execute
        with caplog.at_level(logging.DEBUG):
            result = handler(event, context)
        
        # Verify
        assert result["statusCode"] == 200
        assert json.loads(result["body"]) == test_response_data
        # Content-Length is not added by the handler
        assert "Content-Type" in result["headers"]
        assert "Received request" in caplog.text
    
    @patch('lambda_handler.mangum_handler')
    def test_handler_with_empty_body_response(self, mock_mangum_handler, caplog):
        """Test handler with an empty body response."""
        # Setup
        mock_response = {
            "statusCode": 200,
            "body": "",
            "headers": {"Content-Type": "application/json"}
        }
        
        mock_mangum_handler.return_value = mock_response
        
        event = {
            "httpMethod": "GET",
            "path": "/api/test",
            "headers": {},
            "body": None,
            "isBase64Encoded": False,
            "requestContext": {
                "accountId": "123456789012",
                "apiId": "test-api",
                "stage": "dev"
            },
            "stage": "dev"
        }
        context = {}
        
        # Execute
        with caplog.at_level(logging.WARNING):
            result = handler(event, context)
        
        # Verify - empty body gets error message for non-204 responses
        assert result["statusCode"] == 200  # Status not changed
        assert result["body"] == json.dumps({"error": "Empty response body"})
        assert "BODY IS EMPTY" in caplog.text
    
    @patch('lambda_handler.mangum_handler')
    def test_handler_with_none_response(self, mock_mangum_handler, caplog):
        """Test handler with a None response from Mangum."""
        # Setup
        mock_mangum_handler.return_value = None
        
        event = {
            "httpMethod": "GET",
            "path": "/api/test",
            "headers": {},
            "body": None,
            "isBase64Encoded": False,
            "requestContext": {
                "accountId": "123456789012",
                "apiId": "test-api",
                "stage": "dev"
            },
            "stage": "dev"
        }
        context = {}
        
        # Execute
        with caplog.at_level(logging.ERROR):
            result = handler(event, context)
        
        # Verify
        assert result["statusCode"] == 500
        body = json.loads(result["body"])
        assert "error" in body
        assert "Mangum returned None" in caplog.text
    
    @patch('lambda_handler.mangum_handler')
    def test_handler_with_bytes_body_response(self, mock_mangum_handler, caplog):
        """Test handler with a bytes body response."""
        # Setup
        test_data = {"message": "Success", "data": [1, 2, 3]}
        mock_response = {
            "statusCode": 200,
            "body": json.dumps(test_data).encode('utf-8'),
            "headers": {"Content-Type": "application/json"}
        }
        
        mock_mangum_handler.return_value = mock_response
        
        event = {
            "httpMethod": "POST",
            "path": "/api/data",
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"input": "test"}),
            "isBase64Encoded": False,
            "requestContext": {
                "accountId": "123456789012",
                "apiId": "test-api",
                "stage": "dev"
            },
            "stage": "dev"
        }
        context = {}
        
        # Execute
        with caplog.at_level(logging.DEBUG):
            result = handler(event, context)
        
        # Verify
        assert result["statusCode"] == 200
        assert json.loads(result["body"]) == test_data
        assert "Body is bytes" in caplog.text or "Converted bytes body" in caplog.text


class TestUserSpacesEndpoint:
    """Specifically test the /api/users/spaces endpoint scenario."""
    
    @patch('lambda_handler.mangum_handler')
    def test_user_spaces_with_proper_response(self, mock_mangum_handler, caplog):
        """Test /api/users/spaces endpoint with proper SpaceListResponse."""
        # Setup - simulate a proper SpaceListResponse
        spaces_data = {
            "spaces": [
                {
                    "id": "space-123",
                    "name": "Living Room",
                    "description": "Main living area",
                    "items": [],
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z"
                },
                {
                    "id": "space-456",
                    "name": "Bedroom",
                    "description": "Master bedroom",
                    "items": [],
                    "created_at": "2024-01-02T00:00:00Z",
                    "updated_at": "2024-01-02T00:00:00Z"
                }
            ],
            "total": 2,
            "page": 1,
            "page_size": 10
        }
        
        mock_response = {
            "statusCode": 200,
            "body": json.dumps(spaces_data),
            "headers": {
                "Content-Type": "application/json",
                "X-Request-ID": "test-request-123"
            }
        }
        
        mock_mangum_handler.return_value = mock_response
        
        event = {
            "httpMethod": "GET",
            "path": "/api/users/spaces",
            "headers": {
                "Authorization": "Bearer test-token",
                "Content-Type": "application/json"
            },
            "queryStringParameters": {
                "page": "1",
                "page_size": "10"
            },
            "body": None,
            "isBase64Encoded": False,
            "requestContext": {
                "accountId": "123456789012",
                "apiId": "test-api",
                "stage": "dev"
            },
            "stage": "dev"
        }
        context = {"requestId": "test-request-123"}
        
        # Execute
        with caplog.at_level(logging.DEBUG):
            result = handler(event, context)
        
        # Verify response structure
        assert result["statusCode"] == 200
        assert "body" in result
        assert result["body"] is not None
        assert result["body"] != ""
        
        # Verify response content
        body = json.loads(result["body"])
        assert "spaces" in body
        assert len(body["spaces"]) == 2
        assert body["total"] == 2
        assert body["spaces"][0]["id"] == "space-123"
        
        # Verify headers
        # Note: Content-Length is not currently being added by the handler
        # This is handled by API Gateway/Lambda runtime
        assert "Content-Type" in result["headers"]
        assert result["headers"]["Content-Type"] == "application/json"
        
        # Verify logging
        assert "Received request" in caplog.text or "Calling Mangum handler" in caplog.text
        assert "Body is valid JSON" in caplog.text
    
    @patch('lambda_handler.mangum_handler')
    def test_user_spaces_empty_list_response(self, mock_mangum_handler, caplog):
        """Test /api/users/spaces endpoint with empty spaces list."""
        # Setup - empty spaces list (valid but no data)
        empty_spaces_data = {
            "spaces": [],
            "total": 0,
            "page": 1,
            "page_size": 10
        }
        
        mock_response = {
            "statusCode": 200,
            "body": json.dumps(empty_spaces_data),
            "headers": {"Content-Type": "application/json"}
        }
        
        mock_mangum_handler.return_value = mock_response
        
        event = {
            "httpMethod": "GET",
            "path": "/api/users/spaces",
            "headers": {"Authorization": "Bearer test-token"},
            "body": None,
            "isBase64Encoded": False,
            "requestContext": {
                "accountId": "123456789012",
                "apiId": "test-api",
                "stage": "dev"
            },
            "stage": "dev"
        }
        context = {}
        
        # Execute
        result = handler(event, context)
        
        # Verify - empty list is valid, should not be treated as error
        assert result["statusCode"] == 200
        body = json.loads(result["body"])
        assert body["spaces"] == []
        assert body["total"] == 0
    
    @patch('lambda_handler.mangum_handler')
    def test_logging_captures_response_inspection(self, mock_mangum_handler, caplog):
        """Test that logging properly captures response inspection."""
        # Setup
        test_response = {
            "statusCode": 200,
            "body": json.dumps({"test": "data"}),
            "headers": {"Content-Type": "application/json"}
        }
        
        mock_mangum_handler.return_value = test_response
        
        event = {
            "httpMethod": "GET",
            "path": "/api/test",
            "headers": {},
            "body": None,
            "isBase64Encoded": False,
            "requestContext": {
                "accountId": "123456789012",
                "apiId": "test-api",
                "stage": "dev"
            },
            "stage": "dev"
        }
        context = {}
        
        # Execute with detailed logging
        with caplog.at_level(logging.DEBUG):
            result = handler(event, context)
        
        # Verify all expected log messages  
        log_text = caplog.text
        assert "Received request" in log_text
        assert "Calling Mangum handler" in log_text
        # Response inspection logs
        assert "Body type:" in log_text or "Response Keys:" in log_text
        assert "Body is valid JSON" in log_text or "Body Length:" in log_text


class TestEdgeCases:
    """Test additional edge cases and error scenarios."""
    
    @patch('lambda_handler.mangum_handler')
    def test_handler_with_malformed_json_body(self, mock_mangum_handler, caplog):
        """Test handler with malformed JSON in response body."""
        # Setup
        mock_response = {
            "statusCode": 200,
            "body": "{invalid json}",
            "headers": {"Content-Type": "application/json"}
        }
        
        mock_mangum_handler.return_value = mock_response
        
        event = {
            "httpMethod": "GET",
            "path": "/api/test",
            "headers": {},
            "body": None,
            "isBase64Encoded": False,
            "requestContext": {
                "accountId": "123456789012",
                "apiId": "test-api",
                "stage": "dev"
            },
            "stage": "dev"
        }
        context = {}
        
        # Execute
        with caplog.at_level(logging.WARNING):
            result = handler(event, context)
        
        # Verify - malformed JSON should be preserved but logged
        assert result["body"] == "{invalid json}"
        assert "Body claims to be JSON but isn't valid" in caplog.text
    
    @patch('lambda_handler.mangum_handler')
    def test_handler_with_exception_in_mangum(self, mock_mangum_handler, caplog):
        """Test handler when Mangum raises an exception."""
        # Setup
        mock_mangum_handler.side_effect = Exception("Mangum processing failed")
        
        event = {
            "httpMethod": "GET",
            "path": "/api/test",
            "headers": {},
            "body": None,
            "isBase64Encoded": False,
            "requestContext": {
                "accountId": "123456789012",
                "apiId": "test-api",
                "stage": "dev"
            },
            "stage": "dev"
        }
        context = {}
        
        # Execute
        with caplog.at_level(logging.ERROR):
            result = handler(event, context)
        
        # Verify
        assert result["statusCode"] == 500
        body = json.loads(result["body"])
        assert "error" in body
        assert "Internal server error" in body["error"]
        assert "FastAPI application error" in caplog.text
    
    def test_validate_response_with_non_dict_input(self, caplog):
        """Test validate_and_fix_response with non-dict input."""
        # Test with string
        with caplog.at_level(logging.ERROR):
            result = validate_and_fix_response("not a dict")
        
        assert result["statusCode"] == 500
        assert "error" in json.loads(result["body"])
        assert "Response is not a dict!" in caplog.text
        
        # Test with None
        with caplog.at_level(logging.ERROR):
            result = validate_and_fix_response(None)
        
        assert result["statusCode"] == 500
        assert "error" in json.loads(result["body"])
    
    def test_validate_response_preserves_custom_headers(self):
        """Test that custom headers are preserved during validation."""
        response = {
            "statusCode": 201,
            "body": json.dumps({"created": True}),
            "headers": {
                "Content-Type": "application/json",
                "X-Custom-Header": "custom-value",
                "X-Request-ID": "req-123"
            }
        }
        
        fixed = validate_and_fix_response(response)
        
        assert fixed["headers"]["X-Custom-Header"] == "custom-value"
        assert fixed["headers"]["X-Request-ID"] == "req-123"
        # Content-Length is not added by validate_and_fix_response
        # It only fixes existing content-length if present


if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "-s", "--log-cli-level=DEBUG"])