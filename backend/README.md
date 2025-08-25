# Lifestyle Spaces Backend API

FastAPI-based backend service for the Lifestyle Spaces real estate platform, designed to run on AWS Lambda with DynamoDB.

## Architecture

- **Framework**: FastAPI with Mangum for AWS Lambda
- **Database**: DynamoDB (single table design)
- **Authentication**: JWT-based authentication
- **Testing**: pytest with 100% code coverage requirement
- **Development**: TDD (Test-Driven Development) approach

## Project Structure

```
backend/
├── app/
│   ├── main.py          # FastAPI app initialization
│   ├── api/
│   │   └── routes/       # API endpoints
│   ├── core/
│   │   ├── config.py     # Configuration settings
│   │   ├── security.py   # Authentication utilities
│   │   └── database.py   # DynamoDB client
│   ├── models/           # Pydantic models
│   ├── services/         # Business logic
│   └── utils/            # Shared utilities
├── tests/                # Test suite
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── conftest.py       # Test configuration
├── lambda_handler.py     # AWS Lambda entry point
└── requirements.txt      # Python dependencies
```

## Setup

### Prerequisites

- Python 3.9+
- AWS CLI configured (for DynamoDB access)
- Virtual environment (recommended)

### Quick Start

1. **Set up development environment:**
   ```bash
   make setup
   ```
   This will install dependencies, create a .env file, and run initial tests.

2. **Or manually:**
   ```bash
   # Install dependencies
   pip install -r requirements.txt
   
   # Copy environment variables
   cp .env.example .env
   # Edit .env with your configuration
   
   # Run tests
   pytest --cov
   ```

## Development

### Running the Server

```bash
# Development server with auto-reload
make run
# Or
uvicorn app.main:app --reload

# Access API documentation
# http://localhost:8000/docs
```

### Testing

```bash
# Run all tests
make test

# Run with coverage report
make test-cov

# Run specific test types
make test-unit
make test-integration
```

### Code Quality

```bash
# Format code
make format

# Run linting
make lint
```

## API Endpoints

### Health Check
- `GET /health` - Health check endpoint (no auth required)

### Authentication (to be implemented)
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token

### Users (to be implemented)
- `GET /api/v1/users/me` - Get current user profile
- `PUT /api/v1/users/me` - Update user profile

### Properties (to be implemented)
- `GET /api/v1/properties` - List properties
- `POST /api/v1/properties` - Create property listing
- `GET /api/v1/properties/{id}` - Get property details
- `PUT /api/v1/properties/{id}` - Update property
- `DELETE /api/v1/properties/{id}` - Delete property

## DynamoDB Schema

Single table design with the following patterns:

| Entity | PK | SK | GSI1PK | GSI1SK |
|--------|----|----|--------|--------|
| User | USER#{userId} | PROFILE | EMAIL#{email} | USER#{userId} |
| Property | PROPERTY#{propertyId} | DETAILS | USER#{userId} | PROPERTY#{createdAt} |
| Inquiry | INQUIRY#{inquiryId} | DETAILS | PROPERTY#{propertyId} | INQUIRY#{createdAt} |

## Environment Variables

See `.env.example` for required environment variables:

- `ENVIRONMENT` - Environment name (development/staging/production)
- `AWS_REGION` - AWS region for services
- `DYNAMODB_TABLE` - DynamoDB table name
- `JWT_SECRET_KEY` - Secret key for JWT tokens
- `JWT_ALGORITHM` - JWT algorithm (default: HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Token expiration time

## Deployment

The backend is designed to run as a single AWS Lambda function:

1. Package the application
2. Deploy using AWS SAM, Serverless Framework, or CDK
3. Configure API Gateway to proxy all requests to the Lambda function
4. Set up DynamoDB table with proper indexes

## Security

- All endpoints except `/health` require authentication
- JWT tokens for stateless authentication
- Password hashing with bcrypt
- CORS configuration for allowed origins
- Environment-based configuration management

## Testing Strategy

Following TDD principles:
1. Write tests first
2. Implement minimal code to pass tests
3. Refactor while maintaining test coverage
4. Maintain 100% code coverage

## Contributing

1. Write tests first (TDD)
2. Ensure 100% test coverage
3. Follow PEP 8 style guidelines
4. Update documentation as needed