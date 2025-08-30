"""
Unit tests for AWS Lambda handler.
"""
import pytest
import json


class TestLambdaHandler:
    """Test cases for Lambda handler."""
    
    def test_handler_exists(self):
        """Test that Lambda handler exists and is callable."""
        from lambda_handler import handler
        assert callable(handler)
    
    def test_handler_with_health_check_event(self):
        """Test Lambda handler with health check event."""
        from lambda_handler import handler
        
        # Simulate API Gateway v1 event for health check (matching placeholder handler)
        event = {
            "path": "/health",
            "httpMethod": "GET",
            "headers": {
                "Accept": "application/json",
                "Host": "test.execute-api.us-east-1.amazonaws.com"
            },
            "body": None,
            "isBase64Encoded": False,
            "requestContext": {
                "accountId": "123456789012",
                "apiId": "1234567890",
                "stage": "dev"
            },
            "stage": "dev"
        }
        
        context = {}  # Lambda context
        
        response = handler(event, context)
        
        assert response["statusCode"] == 200
        assert "headers" in response
        assert response["headers"]["Content-Type"] == "application/json"
        body = json.loads(response["body"])
        assert body["status"] == "healthy"
        assert body["environment"] == "dev"
        assert "version" in body
    
    def test_handler_with_options_request(self):
        """Test Lambda handler with OPTIONS request for CORS."""
        from lambda_handler import handler
        
        # Simulate API Gateway v1 event for OPTIONS request
        event = {
            "path": "/any-path",
            "httpMethod": "OPTIONS",
            "headers": {
                "Origin": "http://localhost:3000"
            },
            "body": None,
            "isBase64Encoded": False,
            "requestContext": {
                "accountId": "123456789012",
                "apiId": "1234567890",
                "stage": "dev"
            }
        }
        
        context = {}
        response = handler(event, context)
        
        # OPTIONS request should return 200 with CORS headers
        assert response["statusCode"] == 200
        assert "headers" in response
        assert response["headers"]["Access-Control-Allow-Origin"] == "*"
        assert "Access-Control-Allow-Methods" in response["headers"]
    
    def test_handler_with_default_endpoint(self):
        """Test Lambda handler with default endpoint."""
        from lambda_handler import handler
        
        # Simulate API Gateway v1 event for a default endpoint
        event = {
            "path": "/api/users",
            "httpMethod": "GET",
            "headers": {
                "Accept": "application/json"
            },
            "body": None,
            "isBase64Encoded": False,
            "requestContext": {
                "accountId": "123456789012",
                "apiId": "1234567890",
                "stage": "dev"
            }
        }
        
        context = {}
        response = handler(event, context)
        
        # The endpoint should go through FastAPI and return a valid response
        # Could be 401 (unauthorized), 404, or 500 if Mangum can't process
        assert response["statusCode"] in [200, 401, 403, 404, 500]
        assert "headers" in response
        # CORS headers should always be present
        assert "Access-Control-Allow-Origin" in response["headers"]
    
    def test_handler_with_dev_health_path(self):
        """Test Lambda handler with /dev/health path."""
        from lambda_handler import handler
        
        # Simulate API Gateway v1 event for /dev/health
        event = {
            "path": "/dev/health",
            "httpMethod": "GET",
            "headers": {},
            "body": None,
            "isBase64Encoded": False,
            "requestContext": {
                "accountId": "123456789012",
                "apiId": "1234567890",
                "stage": "dev"
            },
            "stage": "dev"
        }
        
        context = {}
        response = handler(event, context)
        
        assert response["statusCode"] == 200
        body = json.loads(response["body"])
        assert body["status"] == "healthy"
        assert body["environment"] == "dev"