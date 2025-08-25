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
        
        # Simulate API Gateway v2 event for health check
        event = {
            "version": "2.0",
            "routeKey": "GET /health",
            "rawPath": "/health",
            "rawQueryString": "",
            "headers": {
                "accept": "application/json",
                "host": "test.execute-api.us-east-1.amazonaws.com"
            },
            "requestContext": {
                "domainName": "test.execute-api.us-east-1.amazonaws.com",
                "http": {
                    "method": "GET",
                    "path": "/health",
                    "protocol": "HTTP/1.1",
                    "sourceIp": "127.0.0.1"
                },
                "requestId": "test-request-id",
                "stage": "test"
            },
            "body": None,
            "isBase64Encoded": False
        }
        
        context = {}  # Lambda context (not used by mangum)
        
        response = handler(event, context)
        
        assert response["statusCode"] == 200
        body = json.loads(response["body"])
        assert body["status"] == "healthy"
    
    def test_handler_uses_mangum(self):
        """Test that handler uses Mangum adapter."""
        from lambda_handler import handler
        from mangum import Mangum
        
        # Handler should be an instance of Mangum
        assert isinstance(handler, Mangum)