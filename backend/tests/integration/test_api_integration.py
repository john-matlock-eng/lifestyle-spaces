"""
Integration tests for API endpoints.
"""
import pytest
from moto import mock_aws


class TestAPIIntegration:
    """Integration tests for API endpoints."""
    
    def test_health_endpoint_integration(self, test_client):
        """Test the full health check endpoint integration."""
        response = test_client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields
        assert "status" in data
        assert "version" in data
        assert "environment" in data
        
        # Verify values
        assert data["status"] == "healthy"
        assert data["version"] == "1.0.0"
        assert data["environment"] == "test"
    
    @mock_aws
    def test_api_with_dynamodb_available(self, test_client, mock_dynamodb_table):
        """Test that API works when DynamoDB is available."""
        # This test ensures the app starts correctly with DynamoDB
        response = test_client.get("/health")
        assert response.status_code == 200
    
    def test_cors_headers_present(self, test_client):
        """Test that CORS headers are present in responses."""
        response = test_client.options(
            "/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET"
            }
        )
        
        # Check for CORS headers
        assert "access-control-allow-origin" in response.headers or "Access-Control-Allow-Origin" in response.headers
    
    def test_docs_endpoint_in_test_environment(self, test_client):
        """Test that docs endpoint is available in test environment."""
        response = test_client.get("/docs")
        # Should redirect to /docs/ with trailing slash
        assert response.status_code in [200, 307]
        
        if response.status_code == 307:
            # Follow redirect
            response = test_client.get("/docs/")
            assert response.status_code == 200