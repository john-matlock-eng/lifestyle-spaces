# Backend Deployment Guide

## AWS Lambda Deployment Requirements

### Lambda Handler
The application uses Mangum to adapt FastAPI for AWS Lambda. The handler is configured in `lambda_handler.py`:
- Entry point: `lambda_handler.handler`
- Lifespan is disabled for Lambda execution
- Compatible with API Gateway proxy integration

### Required Environment Variables

The following environment variables MUST be set in the Lambda configuration:

#### Required
- `JWT_SECRET_KEY`: Secret key for JWT token signing (use AWS Secrets Manager in production)

#### Optional (with defaults)
- `ENVIRONMENT`: Deployment environment (default: "development")
- `DEBUG`: Debug mode flag (default: false)
- `AWS_REGION`: AWS region (default: "us-east-1")
- `DYNAMODB_TABLE`: DynamoDB table name (default: "lifestyle-spaces")
- `API_V1_PREFIX`: API version prefix (default: "/api/v1")
- `JWT_ALGORITHM`: JWT signing algorithm (default: "HS256")
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration time (default: 30)

### CORS Configuration

The application is pre-configured to accept requests from:
- Local development servers (`http://localhost:3000`, `http://localhost:3001`)
- CloudFront distributions (`https://*.cloudfront.net`)
- API Gateway endpoints (`https://*.execute-api.us-east-1.amazonaws.com`)
- Vercel deployments (`https://*.vercel.app`)
- AWS Amplify deployments (`https://*.amplifyapp.com`)

CORS settings:
- Credentials: Allowed
- Methods: All methods allowed
- Headers: All headers allowed

### Health Check Endpoint

The `/health` endpoint is available without authentication and returns:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "<current-environment>"
}
```

### Lambda Deployment Package

The Lambda deployment package should include:
1. All Python dependencies from `requirements.txt`
2. The `app/` directory with all application code
3. The `lambda_handler.py` file at the root

### API Gateway Integration

Configure API Gateway with:
- Proxy integration enabled
- Binary media types if needed for file uploads
- Request/response transformations handled by FastAPI

### CI/CD Deployment

The `lambda-placeholder.zip` file is provided as a placeholder for Terraform initial deployment. The actual deployment package should be created and uploaded by the CI/CD pipeline:

```bash
# Install dependencies
pip install -r requirements.txt -t package/

# Copy application code
cp -r app package/
cp lambda_handler.py package/

# Create deployment package
cd package && zip -r ../lambda-deployment.zip . && cd ..
```

### Testing Lambda Handler Locally

To test the Lambda handler locally:
```python
from lambda_handler import handler

# Simulate API Gateway event
event = {
    "version": "2.0",
    "routeKey": "GET /health",
    "rawPath": "/health",
    "headers": {"accept": "application/json"},
    "requestContext": {
        "http": {"method": "GET", "path": "/health"}
    }
}

response = handler(event, {})
print(response)
```

### Security Considerations

1. **JWT Secret**: Never hardcode the JWT secret. Use AWS Secrets Manager or Parameter Store
2. **API Authentication**: All endpoints except `/health` should require authentication
3. **Input Validation**: FastAPI provides automatic request validation via Pydantic
4. **CORS Origins**: Update CORS origins in production to match your specific domains

### Monitoring and Logging

- Application prints startup/shutdown messages
- Use CloudWatch Logs for monitoring Lambda execution
- API documentation available at `/docs` in non-production environments