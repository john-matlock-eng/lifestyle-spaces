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

def validate_and_fix_response(response, event=None):
    """
    Ensure response has valid body for API Gateway.
    This function performs comprehensive validation and fixes common issues.
    
    Args:
        response: The response dict from Mangum handler
        event: Optional event dict for context in error messages
        
    Returns:
        Valid response dict for API Gateway
    """
    logger.info("=== RESPONSE VALIDATION START ===")
    
    # Ensure response is a dict
    if not isinstance(response, dict):
        logger.error(f"Response is not a dict! Type: {type(response)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({"error": "Invalid response type from handler"})
        }
    
    # Check for required keys
    if 'statusCode' not in response:
        logger.error("Response missing statusCode!")
        response['statusCode'] = 500
    
    if 'headers' not in response:
        logger.warning("Response missing headers!")
        response['headers'] = {}
    
    # Validate and fix the body
    if 'body' not in response:
        logger.error("Response missing body key!")
        response['body'] = json.dumps({"error": "Response missing body"})
    elif response['body'] is None:
        logger.error("Response body is None!")
        # For 204 No Content, empty string is appropriate
        if response.get('statusCode') == 204:
            response['body'] = ''
        else:
            response['body'] = json.dumps({"error": "Empty response from handler"})
    elif response['body'] == '':
        # Empty string is valid for some status codes
        if response.get('statusCode') not in [204, 304]:
            logger.warning("Response body is empty string for non-204/304 status!")
            # Keep empty string but log it
    elif isinstance(response['body'], bytes):
        logger.warning(f"Response body is bytes, converting to string")
        try:
            response['body'] = response['body'].decode('utf-8')
        except Exception as e:
            logger.error(f"Failed to decode bytes body: {e}")
            response['body'] = json.dumps({"error": "Failed to decode response"})
    elif not isinstance(response['body'], str):
        logger.error(f"Response body is not string: {type(response['body'])}")
        try:
            response['body'] = json.dumps(response['body'])
        except Exception as e:
            logger.error(f"Failed to serialize body to JSON: {e}")
            response['body'] = str(response['body'])
    
    # Additional validation for string bodies
    if isinstance(response['body'], str) and response['body']:
        # Check if it's valid JSON (for non-HTML responses)
        content_type = response.get('headers', {}).get('Content-Type', 'application/json')
        if 'json' in content_type:
            try:
                parsed = json.loads(response['body'])
                logger.info(f"Body is valid JSON with type: {type(parsed)}")
            except json.JSONDecodeError as e:
                logger.warning(f"Body claims to be JSON but isn't valid: {e}")
                # Don't modify - might be intentionally malformed for testing
        
        # Check for suspicious patterns
        if response['body'].startswith('\x00') or '\x00' in response['body'][:100]:
            logger.error("Body contains null bytes!")
            response['body'] = json.dumps({"error": "Response contains invalid characters"})
    
    # Ensure content-length matches if present
    if 'content-length' in response.get('headers', {}):
        actual_length = len(response['body']) if response['body'] else 0
        stated_length = response['headers'].get('content-length')
        try:
            if int(stated_length) != actual_length:
                logger.warning(f"Fixing content-length: was {stated_length}, now {actual_length}")
                response['headers']['content-length'] = str(actual_length)
        except (ValueError, TypeError):
            logger.error(f"Invalid content-length header: {stated_length}")
            response['headers']['content-length'] = str(actual_length)
    
    # Log validation result
    logger.info(f"Validation complete. Status: {response.get('statusCode')}, "
                f"Body type: {type(response.get('body'))}, "
                f"Body length: {len(response.get('body', ''))}")
    logger.info("=== RESPONSE VALIDATION END ===")
    
    return response

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
            
            # CRITICAL FIX: Remove multiValueHeaders if present
            # API Gateway doesn't handle multiValueHeaders well in some configurations
            if isinstance(response, dict) and 'multiValueHeaders' in response:
                logger.info("Found multiValueHeaders in response - converting to single-value headers")
                
                # Ensure headers dict exists
                if 'headers' not in response:
                    response['headers'] = {}
                
                # Merge multiValueHeaders into headers (taking first value for single-value headers)
                for key, values in response.get('multiValueHeaders', {}).items():
                    if values and len(values) > 0:
                        # For most headers, take the first value
                        # Some headers like Set-Cookie might need special handling in the future
                        if key.lower() == 'set-cookie' and len(values) > 1:
                            # For Set-Cookie, we might want to join them, but for now take first
                            logger.warning(f"Multiple Set-Cookie headers found, using first: {key}")
                        response['headers'][key] = values[0]
                        logger.debug(f"Converted multiValueHeader {key}: {values} -> {values[0]}")
                
                # Remove multiValueHeaders completely
                del response['multiValueHeaders']
                logger.info("Removed multiValueHeaders from response")
            
            # === ENHANCED RESPONSE DEBUGGING START ===
            logger.info("=== RAW MANGUM RESPONSE INSPECTION ===")
            logger.info(f"Response type: {type(response)}")
            logger.info(f"Response is dict: {isinstance(response, dict)}")
            
            # Deep inspection of the response object
            if response is None:
                logger.error("CRITICAL: Mangum returned None!")
                response = {
                    'statusCode': 500,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Null response from Mangum handler'})
                }
            elif isinstance(response, dict):
                logger.info(f"Response keys: {list(response.keys())}")
                
                # Inspect the body in detail
                body = response.get('body')
                logger.info(f"Body key exists: {'body' in response}")
                logger.info(f"Body value type: {type(body)}")
                logger.info(f"Body is None: {body is None}")
                logger.info(f"Body is empty string: {body == ''}")
                
                if body is not None:
                    logger.info(f"Body length: {len(body) if hasattr(body, '__len__') else 'N/A'}")
                    
                    # Byte-level inspection
                    if isinstance(body, str):
                        body_bytes = body.encode('utf-8', errors='replace')
                        logger.info(f"Body byte length: {len(body_bytes)}")
                        logger.info(f"First 50 bytes (hex): {body_bytes[:50].hex()}")
                        logger.info(f"First 50 bytes (repr): {repr(body_bytes[:50])}")
                        
                        # Check for invisible characters
                        if len(body) > 0 and all(c.isspace() for c in body):
                            logger.warning("Body contains only whitespace characters!")
                            whitespace_types = {
                                ' ': 'space',
                                '\t': 'tab',
                                '\n': 'newline',
                                '\r': 'carriage return',
                                '\f': 'form feed',
                                '\v': 'vertical tab'
                            }
                            found_whitespace = [whitespace_types.get(c, f'unknown({ord(c)})') 
                                              for c in set(body)]
                            logger.warning(f"Whitespace types found: {found_whitespace}")
                    elif isinstance(body, bytes):
                        logger.info(f"Body is bytes with length: {len(body)}")
                        logger.info(f"First 50 bytes (hex): {body[:50].hex()}")
                        logger.info(f"First 50 bytes (repr): {repr(body[:50])}")
                        # Convert bytes to string
                        try:
                            response['body'] = body.decode('utf-8')
                            logger.info("Converted bytes body to string")
                        except Exception as decode_error:
                            logger.error(f"Failed to decode bytes: {decode_error}")
                            response['body'] = json.dumps({'error': 'Failed to decode response'})
                    else:
                        logger.warning(f"Body is neither string nor bytes: {type(body)}")
                        # Try to convert to JSON string
                        try:
                            response['body'] = json.dumps(body)
                            logger.info("Converted body to JSON string")
                        except Exception as json_error:
                            logger.error(f"Failed to convert body to JSON: {json_error}")
                            response['body'] = str(body)
                else:
                    logger.error("Body is None - this will cause empty response!")
                
                # Check headers for clues
                headers = response.get('headers', {})
                content_type = headers.get('content-type', headers.get('Content-Type', 'not set'))
                content_length = headers.get('content-length', headers.get('Content-Length', 'not set'))
                logger.info(f"Content-Type header: {content_type}")
                logger.info(f"Content-Length header: {content_length}")
                
                # Check if content-length matches actual body length
                if content_length != 'not set' and body is not None:
                    try:
                        stated_length = int(content_length)
                        actual_length = len(body) if isinstance(body, (str, bytes)) else len(str(body))
                        if stated_length != actual_length:
                            logger.warning(f"Content-Length mismatch! Stated: {stated_length}, Actual: {actual_length}")
                    except (ValueError, TypeError) as e:
                        logger.error(f"Error checking content-length: {e}")
            else:
                logger.error(f"Mangum returned non-dict response: {type(response)}")
                logger.error(f"Response value: {repr(response)[:500]}")
                response = {
                    'statusCode': 500,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Invalid response format from handler'})
                }
            
            logger.info("=== END RAW MANGUM RESPONSE INSPECTION ===")
            
            # Track response body through the flow
            if isinstance(response, dict) and 'body' in response:
                original_body = response['body']
                logger.info(f"RESPONSE TRACKING - After Mangum: body type={type(original_body)}, "
                           f"length={len(original_body) if original_body else 0}, "
                           f"is_none={original_body is None}, is_empty={original_body == ''}")
            
            # Check if Mangum returned a dict (expected)
            if not isinstance(response, dict):
                logger.error(f"Mangum returned non-dict response after inspection: {type(response)}")
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
            logger.info(f"RESPONSE TRACKING - After string conversion: body type={type(response['body'])}, "
                       f"length={len(response['body']) if response['body'] else 0}")
        
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
            # Only add error message for non-204 responses
            if response.get('statusCode') != 204:
                # Set an empty JSON object as body for debugging
                response['body'] = json.dumps({"error": "Empty response body"})
        
        # Log the complete response structure for API Gateway proxy integration
        logger.info(f"Response structure matches API Gateway proxy format: {all(k in response for k in ['statusCode', 'headers', 'body'])}")
        
        # CRITICAL: Ensure body is ALWAYS a string for API Gateway
        if 'body' in response and not isinstance(response['body'], str):
            logger.warning(f"Body is not a string! Type: {type(response['body'])}. Converting...")
            response['body'] = json.dumps(response['body'])
        
        # Log response state before validation
        logger.info(f"RESPONSE TRACKING - Before validation: body type={type(response.get('body'))}, "
                   f"length={len(response.get('body', '')) if response.get('body') else 0}, "
                   f"is_none={response.get('body') is None}, is_empty={response.get('body') == ''}")
        
        # Apply comprehensive validation and fixes before returning
        response = validate_and_fix_response(response, event)
        
        # Log response state after validation
        logger.info(f"RESPONSE TRACKING - After validation: body type={type(response.get('body'))}, "
                   f"length={len(response.get('body', '')) if response.get('body') else 0}, "
                   f"is_none={response.get('body') is None}, is_empty={response.get('body') == ''}")
        
        # Final sanity check after validation
        logger.info(f"=== FINAL SANITY CHECK AFTER VALIDATION ===")
        logger.info(f"Body is string: {isinstance(response.get('body'), str)}")
        logger.info(f"StatusCode is int: {isinstance(response.get('statusCode'), int)}")
        logger.info(f"Headers is dict: {isinstance(response.get('headers'), dict)}")
        logger.info(f"Body length: {len(response.get('body', ''))}")
        
        # One more check - ensure body is NEVER None for API Gateway
        if response.get('body') is None:
            logger.error("CRITICAL: Body is still None after validation! Setting empty string.")
            response['body'] = ''
        
        # Special debugging for problematic endpoints
        request_path = event.get('path', '/')
        if '/spaces' in request_path or '/users' in request_path:
            logger.info(f"=== SPECIAL DEBUG FOR {request_path} ===")
            logger.info(f"Final response structure:")
            logger.info(f"  - statusCode: {response.get('statusCode')} (type: {type(response.get('statusCode'))})")
            logger.info(f"  - headers: {list(response.get('headers', {}).keys())}")
            logger.info(f"  - body exists: {'body' in response}")
            logger.info(f"  - body type: {type(response.get('body'))}")
            logger.info(f"  - body length: {len(response.get('body', ''))}")
            if response.get('body'):
                # Show actual content preview
                body_preview = response['body'][:200] if len(response['body']) > 200 else response['body']
                logger.info(f"  - body preview: {repr(body_preview)}")
                # Check encoding
                if isinstance(response['body'], str):
                    try:
                        # Verify it can be encoded to bytes
                        encoded = response['body'].encode('utf-8')
                        logger.info(f"  - body encodes to {len(encoded)} bytes successfully")
                    except Exception as e:
                        logger.error(f"  - body encoding failed: {e}")
            logger.info(f"=== END SPECIAL DEBUG ===")
        
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
