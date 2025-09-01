"""Tests for Lambda handler response body handling."""
import json
import os
from unittest import TestCase
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone

# Set test environment
os.environ['PYTEST_CURRENT_TEST'] = 'test'
os.environ['JWT_SECRET_KEY'] = 'test-secret'


class TestLambdaResponseBody(TestCase):
    """Test Lambda handler response body handling."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_event = {
            'resource': '/api/users/spaces',
            'path': '/api/users/spaces',
            'httpMethod': 'GET',
            'headers': {
                'Authorization': 'Bearer test-token',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            'multiValueHeaders': {},
            'queryStringParameters': None,
            'multiValueQueryStringParameters': None,
            'pathParameters': None,
            'stageVariables': None,
            'requestContext': {
                'resourceId': 'test',
                'resourcePath': '/api/users/spaces',
                'httpMethod': 'GET',
                'path': '/dev/api/users/spaces',
                'accountId': '123456789012',
                'stage': 'dev',
                'requestId': 'test-request-id',
                'identity': {},
                'apiId': 'test-api-id'
            },
            'body': None,
            'isBase64Encoded': False
        }
        
        self.mock_context = Mock()
        self.mock_context.aws_request_id = 'test-request-id'
        self.mock_context.function_name = 'test-function'
        self.mock_context.memory_limit_in_mb = 128
        self.mock_context.invoked_function_arn = 'arn:aws:lambda:us-east-1:123456789012:function:test-function'
    
    @patch('lambda_handler.mangum_handler')
    def test_response_body_preserved(self, mock_mangum):
        """Test that response body is preserved through the handler."""
        from lambda_handler import handler
        
        # Mock Mangum response with a body
        test_body = json.dumps({
            'spaces': [
                {'id': 'space-1', 'name': 'Test Space 1'},
                {'id': 'space-2', 'name': 'Test Space 2'}
            ],
            'total': 2
        })
        
        mock_mangum.return_value = {
            'statusCode': 200,
            'headers': {
                'content-type': 'application/json',
                'content-length': str(len(test_body))
            },
            'multiValueHeaders': {},
            'body': test_body,
            'isBase64Encoded': False
        }
        
        # Call handler
        response = handler(self.mock_event, self.mock_context)
        
        # Verify response structure
        self.assertIn('statusCode', response)
        self.assertIn('headers', response)
        self.assertIn('body', response)
        self.assertEqual(response['statusCode'], 200)
        
        # Verify body is preserved
        self.assertEqual(response['body'], test_body)
        self.assertEqual(len(response['body']), len(test_body))
        
        # Verify body can be parsed
        parsed_body = json.loads(response['body'])
        self.assertEqual(len(parsed_body['spaces']), 2)
        self.assertEqual(parsed_body['total'], 2)
    
    @patch('lambda_handler.mangum_handler')
    def test_response_with_large_body(self, mock_mangum):
        """Test that large response bodies are handled correctly."""
        from lambda_handler import handler
        
        # Create a large response body
        spaces = []
        for i in range(50):
            spaces.append({
                'id': f'space-{i}',
                'name': f'Test Space {i}',
                'description': f'This is a longer description for space {i} to make the response larger',
                'memberCount': i * 2,
                'isPublic': i % 2 == 0
            })
        
        test_body = json.dumps({
            'spaces': spaces,
            'total': len(spaces),
            'hasMore': False
        })
        
        mock_mangum.return_value = {
            'statusCode': 200,
            'headers': {
                'content-type': 'application/json',
                'content-length': str(len(test_body))
            },
            'multiValueHeaders': {},
            'body': test_body,
            'isBase64Encoded': False
        }
        
        # Call handler
        response = handler(self.mock_event, self.mock_context)
        
        # Verify response
        self.assertEqual(response['statusCode'], 200)
        self.assertEqual(response['body'], test_body)
        self.assertEqual(len(response['body']), len(test_body))
        
        # Verify content-length header matches
        stated_length = int(response['headers']['content-length'])
        actual_length = len(response['body'])
        self.assertEqual(stated_length, actual_length)
    
    @patch('lambda_handler.mangum_handler')
    def test_cors_headers_added(self, mock_mangum):
        """Test that CORS headers are added without breaking the response."""
        from lambda_handler import handler
        
        test_body = json.dumps({'message': 'success'})
        
        mock_mangum.return_value = {
            'statusCode': 200,
            'headers': {
                'content-type': 'application/json',
                'content-length': str(len(test_body))
            },
            'multiValueHeaders': {},
            'body': test_body,
            'isBase64Encoded': False
        }
        
        # Call handler
        response = handler(self.mock_event, self.mock_context)
        
        # Verify CORS headers are added
        self.assertIn('Access-Control-Allow-Origin', response['headers'])
        self.assertIn('Access-Control-Allow-Headers', response['headers'])
        self.assertIn('Access-Control-Allow-Methods', response['headers'])
        
        # Verify body is still intact
        self.assertEqual(response['body'], test_body)
    
    @patch('lambda_handler.mangum_handler')
    def test_content_length_mismatch_fixed(self, mock_mangum):
        """Test that content-length mismatches are detected and fixed."""
        from lambda_handler import handler
        
        test_body = json.dumps({'message': 'success', 'data': 'test'})
        wrong_length = len(test_body) - 10  # Intentionally wrong
        
        mock_mangum.return_value = {
            'statusCode': 200,
            'headers': {
                'content-type': 'application/json',
                'content-length': str(wrong_length)  # Wrong length
            },
            'multiValueHeaders': {},
            'body': test_body,
            'isBase64Encoded': False
        }
        
        # Call handler
        with patch('lambda_handler.logger') as mock_logger:
            response = handler(self.mock_event, self.mock_context)
            
            # Check if warning was logged
            mock_logger.warning.assert_called()
            warning_calls = [str(call) for call in mock_logger.warning.call_args_list]
            self.assertTrue(any('Content-length mismatch' in str(call) for call in warning_calls))
        
        # Verify content-length is fixed
        stated_length = int(response['headers']['content-length'])
        actual_length = len(response['body'])
        self.assertEqual(stated_length, actual_length)
        
        # Verify body is intact
        self.assertEqual(response['body'], test_body)
    
    @patch('lambda_handler.mangum_handler')
    def test_empty_body_handled(self, mock_mangum):
        """Test that empty bodies are handled correctly."""
        from lambda_handler import handler
        
        mock_mangum.return_value = {
            'statusCode': 204,  # No content
            'headers': {
                'content-type': 'application/json'
            },
            'multiValueHeaders': {},
            'body': '',
            'isBase64Encoded': False
        }
        
        # Call handler
        response = handler(self.mock_event, self.mock_context)
        
        # Verify response
        self.assertEqual(response['statusCode'], 204)
        self.assertIn('body', response)
        self.assertEqual(response['body'], '')
    
    @patch('lambda_handler.mangum_handler')
    def test_base64_encoded_flag_set(self, mock_mangum):
        """Test that isBase64Encoded flag is properly handled."""
        from lambda_handler import handler
        
        test_body = json.dumps({'message': 'success'})
        
        # Test without isBase64Encoded in response
        mock_mangum.return_value = {
            'statusCode': 200,
            'headers': {
                'content-type': 'application/json',
                'content-length': str(len(test_body))
            },
            'body': test_body
            # No isBase64Encoded field
        }
        
        # Call handler
        response = handler(self.mock_event, self.mock_context)
        
        # Verify isBase64Encoded is added and set to False
        self.assertIn('isBase64Encoded', response)
        self.assertEqual(response['isBase64Encoded'], False)
        
        # Verify body is intact
        self.assertEqual(response['body'], test_body)
    
    def test_options_request_handled(self):
        """Test that OPTIONS requests are handled correctly."""
        from lambda_handler import handler
        
        # Create OPTIONS request
        options_event = self.mock_event.copy()
        options_event['httpMethod'] = 'OPTIONS'
        
        # Call handler
        response = handler(options_event, self.mock_context)
        
        # Verify response
        self.assertEqual(response['statusCode'], 200)
        self.assertIn('Access-Control-Allow-Origin', response['headers'])
        self.assertIn('Access-Control-Allow-Methods', response['headers'])
        self.assertEqual(response['body'], '')
    
    def test_health_check_handled(self):
        """Test that health check endpoint is handled correctly."""
        from lambda_handler import handler
        
        # Create health check request
        health_event = self.mock_event.copy()
        health_event['path'] = '/api/health'
        
        # Call handler
        response = handler(health_event, self.mock_context)
        
        # Verify response
        self.assertEqual(response['statusCode'], 200)
        self.assertIn('body', response)
        
        # Verify body contains health status
        body = json.loads(response['body'])
        self.assertEqual(body['status'], 'healthy')
        self.assertIn('version', body)
    
    @patch('lambda_handler.mangum_handler')
    def test_error_response_has_body(self, mock_mangum):
        """Test that error responses have proper body."""
        from lambda_handler import handler
        
        # Mock an error from Mangum
        mock_mangum.side_effect = Exception("Test error")
        
        # Ensure we're in dev stage for error details
        self.mock_event['stage'] = 'dev'
        
        # Call handler
        response = handler(self.mock_event, self.mock_context)
        
        # Verify error response
        self.assertEqual(response['statusCode'], 500)
        self.assertIn('body', response)
        
        # Verify error body
        body = json.loads(response['body'])
        self.assertIn('error', body)
        self.assertEqual(body['error'], 'Internal server error')
        self.assertIn('message', body)
        self.assertIn('Test error', body['message'])  # In dev mode, actual error is shown