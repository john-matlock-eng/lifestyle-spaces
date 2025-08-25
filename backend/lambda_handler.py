"""
Placeholder Lambda handler for API Gateway proxy integration.
This is a temporary handler until the FastAPI application is deployed.
"""
import json


def handler(event, context):
    """
    AWS Lambda handler function for API Gateway proxy integration.
    
    Args:
        event: API Gateway proxy event
        context: Lambda context object
    
    Returns:
        Properly formatted API Gateway proxy response
    """
    # Extract path from the event
    path = event.get('path', '/')
    http_method = event.get('httpMethod', 'GET')
    
    # Health check endpoint
    if path == '/health' or path == '/dev/health':
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({
                'status': 'healthy',
                'message': 'API is running (placeholder)',
                'environment': 'dev'
            })
        }
    
    # Handle OPTIONS requests for CORS
    if http_method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': ''
        }
    
    # Default response for all other endpoints
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps({
            'message': 'Placeholder Lambda function is working',
            'path': path,
            'method': http_method
        })
    }