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
# Note: api_gateway_base_path should be None to let Mangum handle paths correctly
mangum_handler = Mangum(
    app, 
    lifespan="off",  # Disable lifespan for Lambda
    api_gateway_base_path=None  # Let Mangum auto-detect the base path
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
        try:
            logger.info(f"Calling Mangum handler for {event.get('httpMethod')} {event.get('path')}")
            response = mangum_handler(event, context)
            logger.info(f"Mangum handler returned response type: {type(response)}")
            
            # Check if Mangum returned a dict (expected)
            if not isinstance(response, dict):
                logger.error(f"Mangum returned non-dict response: {type(response)}")
                response = {
                    'statusCode': 500,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Invalid response format from handler'})
                }
        except Exception as app_error:
            # Log the actual FastAPI/application error
            logger.error(f"FastAPI application error: {str(app_error)}", exc_info=True)
            
            # Return error response with details in dev
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({
                    'error': 'Internal server error',
                    'message': str(app_error) if event.get('stage') == 'dev' else 'An error occurred',
                    'path': event.get('path', '/'),
                    'method': event.get('httpMethod', 'UNKNOWN')
                })
            }
        
        # Log response status for debugging
        status_code = response.get('statusCode', 0)
        
        # Enhanced logging for debugging response body issues
        body = response.get('body', '')
        body_length = len(body) if body else 0
        
        # VERY DETAILED LOGGING FOR DEBUGGING
        logger.info(f"=== RESPONSE DEBUG START ===")
        logger.info(f"Path: {event.get('path', '/')}")
        logger.info(f"Method: {event.get('httpMethod', 'UNKNOWN')}")
        logger.info(f"Status Code: {status_code}")
        logger.info(f"Response Keys: {list(response.keys())}")
        logger.info(f"Body Type: {type(body)}")
        logger.info(f"Body Length: {body_length}")
        
        # Log the actual body content (first 500 chars)
        if body:
            logger.info(f"Body Content (first 500 chars): {body[:500]}")
            # Check if body is valid JSON
            try:
                parsed_body = json.loads(body) if isinstance(body, str) else body
                logger.info(f"Body is valid JSON with keys: {list(parsed_body.keys()) if isinstance(parsed_body, dict) else 'not a dict'}")
            except json.JSONDecodeError as e:
                logger.error(f"Body is NOT valid JSON! Error: {e}")
                logger.error(f"Raw body bytes: {body.encode('utf-8')[:100] if isinstance(body, str) else 'not a string'}")
        else:
            logger.warning(f"Body is empty or None! Body value: {repr(body)}")
        
        # Log headers
        headers = response.get('headers', {})
        logger.info(f"Headers: {json.dumps(headers, default=str)}")
        
        # Check for content-length header
        content_length_header = headers.get('content-length', 'NOT SET')
        logger.info(f"Content-Length Header: {content_length_header}")
        
        # Log if this is a specific path we're debugging
        if event.get('path', '/').startswith('/api/users/spaces'):
            logger.info(f"=== SPACES ENDPOINT SPECIAL DEBUG ===")
            logger.info(f"Full response object type: {type(response)}")
            logger.info(f"Response is dict: {isinstance(response, dict)}")
            logger.info(f"Response has body key: {'body' in response}")
            logger.info(f"Body is string: {isinstance(response.get('body'), str)}")
            logger.info(f"Body is bytes: {isinstance(response.get('body'), bytes)}")
            if body:
                # Log character codes of first few characters to check for special chars
                first_chars = body[:20] if len(body) > 20 else body
                char_codes = [ord(c) for c in first_chars]
                logger.info(f"First 20 char codes: {char_codes}")
        
        logger.info(f"=== RESPONSE DEBUG END ===")
        
        # Verify body is a string for API Gateway
        if body and not isinstance(body, str):
            logger.warning(f"Response body is not a string, type: {type(body)}. Converting to string.")
            response['body'] = json.dumps(body) if not isinstance(body, str) else body
        
        # Ensure CORS headers are always present
        if 'headers' not in response:
            response['headers'] = {}
        
        cors_headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        }
        
        # Update headers carefully to preserve content-length
        for key, value in cors_headers.items():
            if key not in response['headers']:
                response['headers'][key] = value
        
        # Log final response details for debugging
        final_body_length = len(response.get('body', '')) if response.get('body') else 0
        content_length = response.get('headers', {}).get('content-length', 'not set')
        
        if final_body_length > 0 and content_length != 'not set':
            stated_length = int(content_length)
            if stated_length != final_body_length:
                logger.warning(f"Content-length mismatch! Stated: {stated_length}, Actual: {final_body_length}")
                # Fix the content-length header
                response['headers']['content-length'] = str(final_body_length)
        
        # Ensure isBase64Encoded is False for JSON responses
        if 'isBase64Encoded' not in response:
            response['isBase64Encoded'] = False
        
        # Final validation for API Gateway
        if not response.get('body'):
            logger.warning("Response body is empty or missing!")
            # Ensure we have at least an empty string for the body
            response['body'] = response.get('body', '')
        
        # LOG FINAL RESPONSE BEING SENT TO API GATEWAY
        logger.info(f"=== FINAL RESPONSE TO API GATEWAY ===")
        logger.info(f"statusCode: {response.get('statusCode')}")
        logger.info(f"isBase64Encoded: {response.get('isBase64Encoded')}")
        logger.info(f"headers keys: {list(response.get('headers', {}).keys())}")
        logger.info(f"body type: {type(response.get('body'))}")
        logger.info(f"body length: {len(response.get('body', ''))}")
        
        final_body = response.get('body', '')
        if final_body:
            logger.info(f"body first 200 chars: {final_body[:200]}")
            # Validate it's proper JSON
            try:
                json.loads(final_body)
                logger.info("Body is valid JSON")
            except Exception as e:
                logger.error(f"Body is NOT valid JSON! Error: {e}")
                # Try to fix the body if it's not a string
                if not isinstance(final_body, str):
                    logger.info("Converting body to JSON string")
                    response['body'] = json.dumps(final_body)
        else:
            logger.error(f"BODY IS EMPTY! Value: {repr(final_body)}")
            # Set an empty JSON object as body for debugging
            response['body'] = json.dumps({"error": "Empty response body"})
        
        # Log the complete response structure for API Gateway proxy integration
        logger.info(f"Response structure matches API Gateway proxy format: {all(k in response for k in ['statusCode', 'headers', 'body'])}")
        
        # CRITICAL: Ensure body is ALWAYS a string for API Gateway
        if 'body' in response and not isinstance(response['body'], str):
            logger.warning(f"Body is not a string! Type: {type(response['body'])}. Converting...")
            response['body'] = json.dumps(response['body'])
        
        # Final sanity check
        logger.info(f"=== FINAL SANITY CHECK ===")
        logger.info(f"Body is string: {isinstance(response.get('body'), str)}")
        logger.info(f"StatusCode is int: {isinstance(response.get('statusCode'), int)}")
        logger.info(f"Headers is dict: {isinstance(response.get('headers'), dict)}")
        
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
