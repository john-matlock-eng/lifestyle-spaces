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
            "isBase64Encoded": False
        }
        
        context = {}  # Lambda context
        
        response = handler(event, context)
        
        assert response["statusCode"] == 200
        assert "headers" in response
        assert response["headers"]["Content-Type"] == "application/json"
        body = json.loads(response["body"])
        assert body["status"] == "healthy"
        assert body["message"] == "API is running (placeholder)"
        assert body["environment"] == "dev"
    
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
            "isBase64Encoded": False
        }
        
        context = {}
        response = handler(event, context)
        
        assert response["statusCode"] == 200
        assert "headers" in response
        assert response["headers"]["Access-Control-Allow-Origin"] == "*"
        assert response["headers"]["Access-Control-Allow-Methods"] == "GET,POST,PUT,DELETE,OPTIONS"
        assert response["body"] == ""
    
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
            "isBase64Encoded": False
        }
        
        context = {}
        response = handler(event, context)
        
        assert response["statusCode"] == 200
        assert "headers" in response
        assert response["headers"]["Content-Type"] == "application/json"
        body = json.loads(response["body"])
        assert body["message"] == "Placeholder Lambda function is working"
        assert body["path"] == "/api/users"
        assert body["method"] == "GET"
    
    def test_handler_with_dev_health_path(self):
        """Test Lambda handler with /dev/health path."""
        from lambda_handler import handler
        
        # Simulate API Gateway v1 event for /dev/health
        event = {
            "path": "/dev/health",
            "httpMethod": "GET",
            "headers": {},
            "body": None,
            "isBase64Encoded": False
        }
        
        context = {}
        response = handler(event, context)
        
        assert response["statusCode"] == 200
        body = json.loads(response["body"])
        assert body["status"] == "healthy"
        assert body["environment"] == "dev"