# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lifestyle Spaces is a serverless real estate platform POC with a React frontend and Python/FastAPI backend deployed to AWS Lambda. The project uses DynamoDB for data storage and is deployed via GitHub Actions with Terraform infrastructure.

## Common Development Commands

### Backend (Python/FastAPI)
```bash
# Navigate to backend directory first
cd backend

# Install dependencies
make install
# or
python -m pip install -r requirements.txt

# Run tests
make test
# or
python -m pytest tests/ -v --tb=short

# Run tests with coverage (target: 95%+)
make coverage
# or
python -m pytest --cov=app --cov-report=term-missing

# Run specific test file
python -m pytest tests/unit/test_specific.py -v

# Lint code
make lint
# or
python -m flake8 app/ tests/ --max-line-length=100

# Format code
make format
# or
python -m black app/ tests/ --line-length=100

# Run development server
make run
# or
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Build Lambda deployment package
make build
# or
python build_lambda_package.py
```

### Frontend (React/TypeScript)
```bash
# Navigate to frontend directory first
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
# or
npm run test:coverage

# Lint code
npm run lint

# Type check
npm run type-check
```

## High-Level Architecture

### Backend Architecture
The backend uses a serverless architecture with the following key components:

1. **Lambda Handler** (`backend/lambda_handler.py`): Entry point for AWS Lambda, uses Mangum to adapt FastAPI to Lambda runtime. Handles CORS and routes requests to the FastAPI application.

2. **FastAPI Application** (`backend/app/main.py`): Main application with middleware for CORS, authentication, and error handling. Routes are organized by feature domains.

3. **Single Table DynamoDB Design**: All entities (users, spaces, invitations) are stored in a single DynamoDB table using composite keys:
   - Users: `PK=USER#<userId>`, `SK=PROFILE`
   - Spaces: `PK=SPACE#<spaceId>`, `SK=DETAILS`
   - Invitations: `PK=INVITATION#<invitationId>`, `SK=DETAILS`
   - GSI patterns for access patterns like user's spaces, space invitations, etc.

4. **Service Layer Pattern**: Business logic is separated into service modules (`backend/app/services/`) that handle database operations and business rules. Routes (`backend/app/api/routes/`) are thin controllers that delegate to services.

5. **Authentication**: JWT-based authentication with access and refresh tokens. Protected routes use dependency injection for user verification.

### Frontend Architecture
React application with TypeScript using:
- AWS Amplify for authentication
- React Router for navigation
- React Hook Form for form handling
- Vite for build tooling

### Infrastructure
- Terraform modules in `terraform/` for infrastructure as code
- GitHub Actions workflows for CI/CD:
  - `backend-tests.yml`: Runs on every push, validates tests pass
  - `deploy-prod.yml`: Production deployment pipeline
  - `terraform-plan.yml` & `terraform-apply.yml`: Infrastructure management

## Critical Implementation Details

### API Response Format
All API responses follow camelCase convention for JSON fields:
```python
class UserResponse(BaseModel):
    user_id: str = Field(alias="userId")
    email: str
    display_name: str = Field(alias="displayName")

    class Config:
        populate_by_name = True
        by_alias = True
```

### Testing Approach
The project follows Test-Driven Development (TDD) with comprehensive test coverage:
- Unit tests for all services and utilities
- Integration tests for API endpoints
- Mock AWS services using moto library
- Target: 95%+ coverage for backend

### Database Access Patterns
The single-table design supports these primary access patterns:
1. Get user by ID or email
2. List user's spaces
3. Get space details
4. List space members
5. List pending invitations for a user
6. List invitations for a space

### Current Development State
- Backend: 96% test coverage, 338 tests passing
- Frontend: 98.38% test coverage
- Lambda deployment package: 28.43MB optimized
- Production deployment ready via GitHub Actions

## Key Files to Understand the System

1. `backend/app/core/database.py`: DynamoDB client and table operations
2. `backend/app/models/`: Pydantic models defining data structures
3. `backend/app/services/`: Business logic implementation
4. `backend/app/api/routes/`: API endpoint definitions
5. `backend/lambda_handler.py`: Lambda entry point with CORS handling
6. `backend/API_CONTRACTS.md`: Detailed API documentation
7. `terraform/modules/`: Infrastructure module definitions

## Critical Development Rules

### Test-Driven Development (TDD)
- **ALWAYS write tests FIRST before implementation**
- Backend: 95%+ coverage required (currently at 96%)
- Frontend: 90%+ coverage required (currently at 98.38%)
- No code merges without passing tests

### Security Requirements
- All API endpoints require authentication (except /health)
- Input validation on all user inputs via Pydantic
- No secrets in code - use AWS Secrets Manager/Parameter Store
- CORS properly configured with allowed origins

### Cost Optimization (POC Phase)
- Single Lambda function for all backend logic
- DynamoDB on-demand pricing
- Minimal CloudWatch logging (errors only)
- No provisioned concurrency

### CI/CD Requirements
- ALL deployments through GitHub Actions
- NO manual AWS console changes
- Infrastructure changes via Terraform only

## Using Claude Code Agents

This project has specialized agent configurations in `.claude/agents/` for different development tasks:

### Available Agents
1. **backend-architect**: API design, database schemas, system architecture
2. **frontend-developer**: React components, TypeScript, responsive layouts
3. **deployment-engineer**: CI/CD pipelines, AWS deployments, GitHub Actions
4. **terraform-specialist**: Infrastructure as code, AWS resource management
5. **typescript-pro**: Advanced TypeScript patterns, type safety
6. **mobile-developer**: React Native development (future feature)
7. **ui-ux-designer**: Interface designs, accessibility, design systems

### Using Agents
Claude Code will automatically use these specialized agents when appropriate. Each agent has:
- General instructions (`<agent-name>.md`)
- Project-specific instructions (`<agent-name>-project.md`)

The agents will be invoked proactively for tasks matching their expertise. For example:
- Creating new API endpoints → backend-architect
- Setting up deployments → deployment-engineer
- Building UI components → frontend-developer

### Agent Coordination
- Agents follow TDD methodology
- Cross-agent dependencies are communicated
- All agents adhere to project constraints (single Lambda, single DynamoDB table, etc.)