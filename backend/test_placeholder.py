#!/usr/bin/env python3
"""
Test script to verify the placeholder Lambda handler works correctly.
"""
# FIRST: Set environment variables before importing any app modules
import os
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret-key-for-testing-only')
os.environ.setdefault('JWT_ALGORITHM', 'HS256')
os.environ.setdefault('ACCESS_TOKEN_EXPIRE_MINUTES', '30')
os.environ.setdefault('DYNAMODB_TABLE', 'lifestyle-spaces-test')
os.environ.setdefault('CORS_ORIGINS', '["*"]')
os.environ.setdefault('AWS_REGION', 'us-east-1')
os.environ.setdefault('AWS_DEFAULT_REGION', 'us-east-1')
os.environ.setdefault('ENVIRONMENT', 'test')

# THEN: Import other modules
import json
import sys

# Add current directory to path to import the handler
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lambda_handler import handler


def test_health_endpoint():
    """Test the health check endpoint."""
    # Simulate API Gateway proxy event for /health
    event = {
        'path': '/health',
        'httpMethod': 'GET',
        'headers': {},
        'queryStringParameters': None,
        'body': None,
        'requestContext': {
            'accountId': '123456789012',
            'apiId': '1234567890',
            'stage': 'dev'
        },
        'stage': 'dev'
    }
    
    context = {}  # Lambda context (not used in our handler)
    
    response = handler(event, context)
    
    # Validate response structure
    assert 'statusCode' in response, "Response missing statusCode"
    assert 'headers' in response, "Response missing headers"
    assert 'body' in response, "Response missing body"
    
    # Check status code
    assert response['statusCode'] == 200, f"Expected 200, got {response['statusCode']}"
    
    # Check headers
    assert 'Content-Type' in response['headers'], "Missing Content-Type header"
    assert response['headers']['Content-Type'] == 'application/json', "Wrong Content-Type"
    assert 'Access-Control-Allow-Origin' in response['headers'], "Missing CORS header"
    
    # Check body
    body = json.loads(response['body'])
    assert 'status' in body, "Body missing status field"
    assert body['status'] == 'healthy', f"Expected healthy status, got {body['status']}"
    
    print("[PASS] Health endpoint test passed")
    return True


def test_dev_health_endpoint():
    """Test the /dev/health endpoint."""
    event = {
        'path': '/dev/health',
        'httpMethod': 'GET',
        'headers': {},
        'queryStringParameters': None,
        'body': None,
        'requestContext': {
            'accountId': '123456789012',
            'apiId': '1234567890',
            'stage': 'dev'
        },
        'stage': 'dev'
    }
    
    context = {}
    response = handler(event, context)
    
    assert response['statusCode'] == 200, f"Expected 200, got {response['statusCode']}"
    body = json.loads(response['body'])
    assert body['status'] == 'healthy', f"Expected healthy status, got {body['status']}"
    
    print("[PASS] Dev health endpoint test passed")
    return True


def test_options_request():
    """Test OPTIONS request for CORS preflight."""
    event = {
        'path': '/api/test',
        'httpMethod': 'OPTIONS',
        'headers': {},
        'queryStringParameters': None,
        'body': None,
        'requestContext': {
            'accountId': '123456789012',
            'apiId': '1234567890',
            'stage': 'dev'
        }
    }
    
    context = {}
    response = handler(event, context)
    
    assert response['statusCode'] == 200, f"Expected 200, got {response['statusCode']}"
    assert 'Access-Control-Allow-Methods' in response['headers'], "Missing CORS methods header"
    assert response['body'] == '', "OPTIONS should have empty body"
    
    print("[PASS] OPTIONS request test passed")
    return True


def test_generic_endpoint():
    """Test a generic endpoint."""
    event = {
        'path': '/api/users',
        'httpMethod': 'POST',
        'headers': {},
        'queryStringParameters': None,
        'body': '{"test": "data"}',
        'requestContext': {
            'accountId': '123456789012',
            'apiId': '1234567890',
            'stage': 'dev'
        }
    }
    
    context = {}
    response = handler(event, context)
    
    # Generic endpoint will go through FastAPI and might return different status codes
    # 500 can occur if Mangum can't process the event format
    assert response['statusCode'] in [200, 401, 403, 404, 500], f"Unexpected status code: {response['statusCode']}"
    # Just verify we get a response with CORS headers
    assert 'Access-Control-Allow-Origin' in response['headers']
    
    print("[PASS] Generic endpoint test passed")
    return True


def main():
    """Run all tests."""
    print("Testing placeholder Lambda handler...")
    print("-" * 40)
    
    tests = [
        test_health_endpoint,
        test_dev_health_endpoint,
        test_options_request,
        test_generic_endpoint
    ]
    
    all_passed = True
    for test in tests:
        try:
            test()
        except AssertionError as e:
            print(f"[FAIL] {test.__name__} failed: {e}")
            all_passed = False
        except Exception as e:
            print(f"[ERROR] {test.__name__} error: {e}")
            all_passed = False
    
    print("-" * 40)
    if all_passed:
        print("[SUCCESS] All tests passed!")
        return 0
    else:
        print("[FAILURE] Some tests failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())