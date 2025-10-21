"""
Test to verify that response bodies are preserved correctly through the Lambda handler.
This test specifically addresses the concern about empty response bodies.
"""

import json
import logging
from unittest.mock import Mock, patch
import pytest
from lambda_handler import handler


class TestResponseBodyPreservation:
    """Verify that response bodies are preserved correctly."""
    
    @patch('lambda_handler.mangum_handler')
    def test_spaces_endpoint_preserves_response_body(self, mock_mangum_handler):
        """Test that /api/users/spaces endpoint preserves the response body."""
        # Setup - simulate the exact response from the spaces endpoint
        spaces_response = {
            "spaces": [
                {
                    "id": "space-1",
                    "name": "Living Room",
                    "description": "Main living area",
                    "items": [],
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z"
                }
            ],
            "total": 1,
            "page": 1,
            "page_size": 10
        }
        
        # Mock Mangum to return this response
        mock_mangum_handler.return_value = {
            "statusCode": 200,
            "body": json.dumps(spaces_response),
            "headers": {"Content-Type": "application/json"}
        }
        
        # Create a valid API Gateway event
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
        
        # Execute the handler
        result = handler(event, {})
        
        # Verify the response
        assert result["statusCode"] == 200
        assert "body" in result
        assert result["body"] is not None
        assert result["body"] != ""
        
        # Parse and verify the body content
        body = json.loads(result["body"])
        assert "spaces" in body
        assert len(body["spaces"]) == 1
        assert body["spaces"][0]["id"] == "space-1"
        assert body["total"] == 1
        
        print(f"SUCCESS: Response body preserved: {len(result['body'])} bytes")
        print(f"SUCCESS: Response content valid with {len(body['spaces'])} spaces")
    
    @patch('lambda_handler.mangum_handler')
    def test_empty_spaces_list_preserves_structure(self, mock_mangum_handler):
        """Test that empty spaces list still returns proper structure."""
        # Empty but valid response
        empty_response = {
            "spaces": [],
            "total": 0,
            "page": 1,
            "page_size": 10
        }
        
        mock_mangum_handler.return_value = {
            "statusCode": 200,
            "body": json.dumps(empty_response),
            "headers": {"Content-Type": "application/json"}
        }
        
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
        
        result = handler(event, {})
        
        assert result["statusCode"] == 200
        assert result["body"] is not None
        
        body = json.loads(result["body"])
        assert body["spaces"] == []
        assert body["total"] == 0
        
        print(f"SUCCESS: Empty list response preserved correctly")
    
    @patch('lambda_handler.mangum_handler')
    def test_large_response_body_preserved(self, mock_mangum_handler):
        """Test that large response bodies are preserved."""
        # Create a large response with many spaces
        large_response = {
            "spaces": [
                {
                    "id": f"space-{i}",
                    "name": f"Room {i}",
                    "description": f"Description for room {i} with some longer text to make the response bigger",
                    "items": [f"item-{j}" for j in range(5)],
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z"
                }
                for i in range(50)  # 50 spaces
            ],
            "total": 50,
            "page": 1,
            "page_size": 50
        }
        
        response_json = json.dumps(large_response)
        mock_mangum_handler.return_value = {
            "statusCode": 200,
            "body": response_json,
            "headers": {"Content-Type": "application/json"}
        }
        
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
        
        result = handler(event, {})
        
        assert result["statusCode"] == 200
        assert result["body"] == response_json
        
        body = json.loads(result["body"])
        assert len(body["spaces"]) == 50
        assert body["total"] == 50
        
        print(f"SUCCESS: Large response preserved: {len(result['body'])} bytes")
        print(f"SUCCESS: Number of spaces: {len(body['spaces'])}")
    
    @patch('lambda_handler.mangum_handler')
    def test_response_with_special_characters(self, mock_mangum_handler):
        """Test that responses with special characters are preserved."""
        special_response = {
            "spaces": [
                {
                    "id": "space-1",
                    "name": "Café & Lounge",
                    "description": "Special chars: €£¥ émojis: 🏠 🛋️ quotes: \"hello\" 'world'",
                    "items": [],
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z"
                }
            ],
            "total": 1,
            "page": 1,
            "page_size": 10
        }
        
        mock_mangum_handler.return_value = {
            "statusCode": 200,
            "body": json.dumps(special_response, ensure_ascii=False),
            "headers": {"Content-Type": "application/json; charset=utf-8"}
        }
        
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
        
        result = handler(event, {})
        
        assert result["statusCode"] == 200
        body = json.loads(result["body"])
        assert "Café & Lounge" in body["spaces"][0]["name"]
        assert "€£¥" in body["spaces"][0]["description"]
        assert "🏠" in body["spaces"][0]["description"]
        
        print(f"SUCCESS: Special characters preserved correctly")
        print(f"SUCCESS: Description contains special chars and emojis")


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v", "-s"])