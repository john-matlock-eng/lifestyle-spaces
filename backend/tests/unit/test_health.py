"""
Unit tests for health check endpoint.
"""
import pytest


class TestHealthCheck:
    """Test cases for health check endpoint."""
    
    def test_health_check_returns_200(self, test_client):
        """Test that health check endpoint returns 200 OK."""
        response = test_client.get("/health")
        assert response.status_code == 200
    
    def test_health_check_response_content(self, test_client):
        """Test that health check returns expected content."""
        response = test_client.get("/health")
        data = response.json()
        
        assert data["status"] == "healthy"
        assert "version" in data
        assert "environment" in data
        assert data["environment"] == "test"
    
    def test_health_check_no_auth_required(self, test_client):
        """Test that health check doesn't require authentication."""
        # Call without any auth headers
        response = test_client.get("/health")
        assert response.status_code == 200
        
        # Call with invalid auth header should still work
        response = test_client.get("/health", headers={"Authorization": "Bearer invalid"})
        assert response.status_code == 200