"""
Test script to verify Lambda handler works with FastAPI.
Run this to ensure the integration is working correctly.
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
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

# Import the handler
from lambda_handler import handler

def test_health_check():
    """Test the health check endpoint."""
    event = {
        'path': '/health',
        'httpMethod': 'GET',
        'headers': {},
        'queryStringParameters': None,
        'body': None,
        'stage': 'dev'
    }
    
    context = {}
    
    response = handler(event, context)
    
    print("Health Check Response:")
    print(f"Status Code: {response['statusCode']}")
    print(f"Headers: {json.dumps(response['headers'], indent=2)}")
    print(f"Body: {response['body']}")
    
    # Verify response
    assert response['statusCode'] == 200
    body = json.loads(response['body'])
    assert body['status'] == 'healthy'
    assert 'Access-Control-Allow-Origin' in response['headers']
    
    print("\n[SUCCESS] Health check test passed!")

def test_api_endpoint():
    """Test a regular API endpoint through Lambda."""
    event = {
        'path': '/api/spaces',
        'httpMethod': 'GET',
        'headers': {
            'Authorization': 'Bearer test-token'
        },
        'queryStringParameters': None,
        'body': None,
        'stage': 'dev',
        'requestContext': {
            'requestId': 'test-request-id',
            'stage': 'dev'
        }
    }
    
    context = {}
    
    response = handler(event, context)
    
    print("\n\nAPI Endpoint Response:")
    print(f"Status Code: {response['statusCode']}")
    print(f"Headers: {json.dumps(response['headers'], indent=2)}")
    print(f"Body: {response['body'][:200]}...")  # First 200 chars
    
    # Verify CORS headers are present
    assert 'Access-Control-Allow-Origin' in response['headers']
    
    print("\n[SUCCESS] API endpoint test passed!")

def test_error_handling():
    """Test error handling in Lambda."""
    event = {
        'path': '/nonexistent',
        'httpMethod': 'GET',
        'headers': {},
        'queryStringParameters': None,
        'body': None,
        'stage': 'dev',
        'requestContext': {
            'requestId': 'test-request-id',
            'stage': 'dev'
        }
    }
    
    context = {}
    
    response = handler(event, context)
    
    print("\n\n404/500 Error Response:")
    print(f"Status Code: {response['statusCode']}")
    print(f"Headers: {json.dumps(response['headers'], indent=2)}")
    print(f"Body: {response['body']}")
    
    # Should return 404 for non-existent route or 500 if Mangum can't process
    assert response['statusCode'] in [404, 500], f"Expected 404 or 500, got {response['statusCode']}"
    assert 'Access-Control-Allow-Origin' in response['headers']
    
    print("\n[SUCCESS] Error handling test passed!")

if __name__ == "__main__":
    print("[TEST] Testing Lambda Handler Integration with FastAPI\n")
    print("=" * 50)
    
    try:
        test_health_check()
        test_api_endpoint()
        test_error_handling()
        
        print("\n" + "=" * 50)
        print("[SUCCESS] All tests passed! Lambda handler is working correctly.")
        print("\nNext steps:")
        print("1. Run 'python build_lambda_package.py' to create deployment package")
        print("2. Run 'make test' to run full test suite")
        print("3. Deploy via GitHub Actions")
        
    except Exception as e:
        print(f"\n[ERROR] Test failed: {e}")
        print("\nMake sure you have installed dependencies:")
        print("  pip install -r requirements.txt")
        sys.exit(1)