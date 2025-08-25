#!/usr/bin/env python3
"""
Test script to verify the placeholder Lambda handler works correctly.
"""
import json
import sys
import os

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
        'body': None
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
        'body': None
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
        'body': None
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
        'body': '{"test": "data"}'
    }
    
    context = {}
    response = handler(event, context)
    
    assert response['statusCode'] == 200, f"Expected 200, got {response['statusCode']}"
    body = json.loads(response['body'])
    assert 'message' in body, "Body missing message field"
    assert 'path' in body, "Body missing path field"
    assert body['path'] == '/api/users', f"Wrong path: {body['path']}"
    assert body['method'] == 'POST', f"Wrong method: {body['method']}"
    
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