# Backend Architect - Lifestyle Spaces Project Instructions

## Project-Specific Requirements

### Architecture Constraints
- **SINGLE Lambda function** running FastAPI for ALL backend logic
- **SINGLE API Gateway** with routes pointing to the Lambda
- **SINGLE DynamoDB table** with Single Table Design pattern
- **NO microservices** - monolithic Lambda approach for cost optimization

### Development Methodology
1. **TDD IS MANDATORY**
   - Write pytest tests FIRST for every feature
   - Achieve 100% code coverage before marking complete
   - Use `pytest --cov=app --cov-report=term-missing`

### FastAPI Implementation Rules
```python
# Project structure
backend/
├── app/
│   ├── main.py          # FastAPI app initialization
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes/       # All route definitions
│   ├── core/
│   │   ├── config.py     # Settings from env vars
│   │   ├── security.py   # Auth/security utilities
│   │   └── database.py   # DynamoDB client
│   ├── models/           # Pydantic models
│   ├── services/         # Business logic
│   └── utils/            # Shared utilities
├── tests/                # TEST FIRST!
│   ├── unit/
│   ├── integration/
│   └── conftest.py
├── requirements.txt
└── lambda_handler.py    # AWS Lambda entry point
```

### DynamoDB Single Table Design
```python
# Example entity structure
{
    "PK": "USER#user123",           # Partition Key
    "SK": "PROFILE#2024-01-01",     # Sort Key
    "GSI1PK": "ORG#org456",         # Global Secondary Index
    "GSI1SK": "USER#user123",
    "entity_type": "UserProfile",
    "data": {...}                   # Entity-specific data
}
```

### Security Requirements
- **Every endpoint** must have authentication (except health check)
- Use AWS Cognito or API Gateway authorizers
- Input validation with Pydantic on ALL requests
- Rate limiting consideration for API Gateway
- No secrets in code - use AWS Parameter Store

### FastAPI Lambda Handler
```python
# lambda_handler.py
from mangum import Mangum
from app.main import app

handler = Mangum(app)
```

### Required Dependencies
```txt
fastapi==0.109.0
mangum==0.17.0  # AWS Lambda adapter
boto3==1.34.0
pydantic==2.5.0
python-jose[cryptography]==3.3.0  # JWT handling
pytest==7.4.0
pytest-cov==4.1.0
pytest-asyncio==0.21.0
httpx==0.25.0  # For testing
```

### Testing Requirements
- Unit tests for all services and utilities
- Integration tests for API endpoints
- Mock AWS services with moto or boto3-stubs
- Test database operations with DynamoDB Local
- Security tests for auth/authz

### API Design Principles
1. RESTful conventions
2. Consistent error responses
3. Pagination for list endpoints
4. Version API from start (/api/v1/)
5. OpenAPI documentation auto-generated

### Cost Optimization
- Minimize Lambda package size
- Use Lambda layers for dependencies
- Implement caching where appropriate
- Batch DynamoDB operations
- Avoid unnecessary AWS service calls

### Coordination with Other Agents
- Provide OpenAPI spec to frontend-developer
- Define IAM requirements for terraform-specialist
- Specify environment variables for deployment-engineer
- Document all API endpoints clearly

### Deliverables Checklist
- [ ] Tests written first (100% coverage)
- [ ] FastAPI application with all routes
- [ ] DynamoDB access patterns implemented
- [ ] Authentication/authorization configured
- [ ] Error handling comprehensive
- [ ] OpenAPI documentation complete
- [ ] Lambda handler configured
- [ ] Requirements.txt finalized
- [ ] Integration tests passing
- [ ] Security tests passing

### Example Test-First Approach
```python
# tests/test_users.py - WRITE THIS FIRST!
def test_create_user():
    response = client.post("/api/v1/users", json={
        "email": "test@example.com",
        "name": "Test User"
    })
    assert response.status_code == 201
    assert response.json()["email"] == "test@example.com"

# THEN implement the endpoint to pass the test
```

## Critical Reminders
- **NO deployment without 100% test coverage**
- **NO manual database operations**
- **NO hardcoded configuration**
- **NO synchronous external API calls (use background tasks)**
- **ALWAYS coordinate schema changes with frontend**