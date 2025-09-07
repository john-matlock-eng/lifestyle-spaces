"""
Unit tests for the dynamic CORS handler in lambda_handler.py
"""
import pytest
from unittest.mock import patch, MagicMock
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from lambda_handler import get_cors_headers


class TestCorsHandler:
    """Test the dynamic CORS handler functionality"""
    
    def test_allowed_origin_cloudfront(self):
        """Test that CloudFront origin gets proper CORS headers with credentials"""
        event = {
            'headers': {
                'origin': 'https://duh187imz287k.cloudfront.net'
            }
        }
        
        headers = get_cors_headers(event)
        
        assert headers['Access-Control-Allow-Origin'] == 'https://duh187imz287k.cloudfront.net'
        assert headers['Access-Control-Allow-Credentials'] == 'true'
        assert 'Access-Control-Allow-Methods' in headers
        assert 'Access-Control-Allow-Headers' in headers
        assert 'Access-Control-Max-Age' in headers
    
    def test_allowed_origin_localhost(self):
        """Test that localhost origins get proper CORS headers"""
        for port in ['3000', '3001']:
            event = {
                'headers': {
                    'Origin': f'http://localhost:{port}'  # Test with capital O
                }
            }
            
            headers = get_cors_headers(event)
            
            assert headers['Access-Control-Allow-Origin'] == f'http://localhost:{port}'
            assert headers['Access-Control-Allow-Credentials'] == 'true'
    
    def test_dynamic_cloudfront_domain(self):
        """Test that any CloudFront domain gets proper CORS headers"""
        event = {
            'headers': {
                'origin': 'https://d123abc456.cloudfront.net'
            }
        }
        
        headers = get_cors_headers(event)
        
        assert headers['Access-Control-Allow-Origin'] == 'https://d123abc456.cloudfront.net'
        assert headers['Access-Control-Allow-Credentials'] == 'true'
    
    def test_dynamic_vercel_domain(self):
        """Test that Vercel domains get proper CORS headers"""
        event = {
            'headers': {
                'origin': 'https://my-app.vercel.app'
            }
        }
        
        headers = get_cors_headers(event)
        
        assert headers['Access-Control-Allow-Origin'] == 'https://my-app.vercel.app'
        assert headers['Access-Control-Allow-Credentials'] == 'true'
    
    def test_dynamic_amplify_domain(self):
        """Test that Amplify domains get proper CORS headers"""
        event = {
            'headers': {
                'origin': 'https://main.d1234abcd.amplifyapp.com'
            }
        }
        
        headers = get_cors_headers(event)
        
        assert headers['Access-Control-Allow-Origin'] == 'https://main.d1234abcd.amplifyapp.com'
        assert headers['Access-Control-Allow-Credentials'] == 'true'
    
    def test_unknown_origin_gets_wildcard(self):
        """Test that unknown origins get wildcard without credentials"""
        event = {
            'headers': {
                'origin': 'https://unknown-domain.com'
            }
        }
        
        headers = get_cors_headers(event)
        
        assert headers['Access-Control-Allow-Origin'] == '*'
        assert 'Access-Control-Allow-Credentials' not in headers
        assert 'Access-Control-Allow-Methods' in headers
        assert 'Access-Control-Allow-Headers' in headers
    
    def test_missing_origin_header(self):
        """Test that missing origin header returns wildcard"""
        event = {
            'headers': {}
        }
        
        headers = get_cors_headers(event)
        
        assert headers['Access-Control-Allow-Origin'] == '*'
        assert 'Access-Control-Allow-Credentials' not in headers
    
    def test_none_headers(self):
        """Test that None headers are handled gracefully"""
        event = {
            'headers': None
        }
        
        headers = get_cors_headers(event)
        
        assert headers['Access-Control-Allow-Origin'] == '*'
        assert 'Access-Control-Allow-Credentials' not in headers
    
    def test_case_insensitive_origin_header(self):
        """Test that origin header lookup is case-insensitive"""
        # Test lowercase 'origin'
        event1 = {
            'headers': {
                'origin': 'http://localhost:3000'
            }
        }
        headers1 = get_cors_headers(event1)
        assert headers1['Access-Control-Allow-Origin'] == 'http://localhost:3000'
        
        # Test uppercase 'Origin'
        event2 = {
            'headers': {
                'Origin': 'http://localhost:3000'
            }
        }
        headers2 = get_cors_headers(event2)
        assert headers2['Access-Control-Allow-Origin'] == 'http://localhost:3000'
    
    def test_all_cors_headers_present(self):
        """Test that all required CORS headers are present in response"""
        event = {
            'headers': {
                'origin': 'http://localhost:3000'
            }
        }
        
        headers = get_cors_headers(event)
        
        required_headers = [
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Headers',
            'Access-Control-Allow-Methods',
            'Access-Control-Max-Age'
        ]
        
        for header in required_headers:
            assert header in headers, f"Missing required CORS header: {header}"
        
        # Check that methods include all required HTTP methods
        methods = headers['Access-Control-Allow-Methods']
        for method in ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']:
            assert method in methods, f"Missing HTTP method: {method}"
        
        # Check that headers include required headers
        allowed_headers = headers['Access-Control-Allow-Headers']
        assert 'Content-Type' in allowed_headers
        assert 'Authorization' in allowed_headers


if __name__ == "__main__":
    pytest.main([__file__, "-v"])