"""
AWS Lambda handler for FastAPI application using Mangum adapter.
This replaces the placeholder handler with actual FastAPI functionality.
"""
import json
import logging
from mangum import Mangum
from app.main import app

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Create the Mangum handler
mangum_handler = Mangum(
    app, 
    lifespan="off",  # Disable lifespan for Lambda
    api_gateway_base_path="/",
    custom_handlers=[]
)

# Lambda handler function
def handler(event, context):
    """
    AWS Lambda handler function with error handling.
    
    Args:
        event: API Gateway proxy event
        context: Lambda context object
    
    Returns:
        API Gateway proxy response
    """
    try:
        # Sanitize event for logging - remove sensitive data
        safe_event = event.copy()
        if 'headers' in safe_event and safe_event['headers']:
            safe_headers = safe_event['headers'].copy()
            # Remove sensitive headers
            sensitive_headers = ['Authorization', 'authorization', 'Cookie', 'cookie', 
                               'X-Api-Key', 'x-api-key', 'X-Auth-Token', 'x-auth-token']
            for header in sensitive_headers:
                if header in safe_headers:
                    safe_headers[header] = '[REDACTED]'
            safe_event['headers'] = safe_headers
        
        if 'multiValueHeaders' in safe_event and safe_event['multiValueHeaders']:
            safe_mv_headers = safe_event['multiValueHeaders'].copy()
            for header in ['Authorization', 'authorization', 'Cookie', 'cookie']:
                if header in safe_mv_headers:
                    safe_mv_headers[header] = ['[REDACTED]']
            safe_event['multiValueHeaders'] = safe_mv_headers
        
        # Log the sanitized event for debugging
        logger.info(f"Received request: {event.get('httpMethod', 'UNKNOWN')} {event.get('path', '/')}")
        
        # Handle OPTIONS requests directly for CORS preflight
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                    'Access-Control-Max-Age': '86400'
                },
                'body': ''
            }
        
        # Handle health check directly for faster response
        path = event.get('path', '/')
        if path in ['/health', '/api/health', f"/{event.get('stage', 'dev')}/health"]:
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({
                    'status': 'healthy',
                    'environment': event.get('stage', 'dev'),
                    'version': '1.0.0'
                })
            }
        
        # Process request through FastAPI
        response = mangum_handler(event, context)
        
        # Log response status for debugging
        status_code = response.get('statusCode', 0)
        logger.info(f"{event.get('httpMethod', 'UNKNOWN')} {event.get('path', '/')} {status_code}")
        
        # Ensure CORS headers are always present
        if 'headers' not in response:
            response['headers'] = {}
        
        cors_headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        }
        response['headers'].update(cors_headers)
        
        return response
        
    except Exception as e:
        logger.error(f"Lambda handler error: {str(e)}", exc_info=True)
        
        # Return a proper error response
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e) if event.get('stage') == 'dev' else 'An error occurred'
            })
        }
