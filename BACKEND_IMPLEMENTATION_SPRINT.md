# Backend API Implementation Sprint - Lifestyle Spaces

## 🎯 Mission Brief
**Objective**: Implement the complete FastAPI backend for Lifestyle Spaces, replacing the placeholder Lambda with production-ready API routes. This is the critical missing piece - frontend is ready, infrastructure is deployed, but the backend logic doesn't exist yet.

## 📌 Current State Assessment

### System Status
- **Frontend**: ✅ Complete (98.38% test coverage, 413 tests passing)
- **Infrastructure**: ✅ Deployed (Lambda + API Gateway + DynamoDB via Terraform)
- **Backend**: ❌ Placeholder Lambda - **THIS IS THE GAP TO FILL**
- **Authentication**: ✅ Cognito configured with auto-confirmation

### Critical Requirements
- **100% test coverage** (non-negotiable for backend)
- **TDD approach** (tests FIRST, implementation SECOND)
- **Type safety** (TypeScript ↔ Pydantic alignment)
- **Single Table DynamoDB** design pattern

## 🚀 Implementation Order (Follow Strictly)

### Phase 1: Core Setup & User Profile [PRIORITY]

#### Step 1: Analyze Frontend API Contracts
```bash
@typescript-pro analyze the frontend API calls in /frontend/src/services/ and create type definitions for all API contracts in a single document
```

#### Step 2: Create User Profile Tests (TDD)
```bash
@backend-architect using the TypeScript interfaces from typescript-pro, create the test file /backend/tests/test_user_profile.py with comprehensive tests for:
- GET /api/user/profile 
- PUT /api/user/profile
- POST /api/user/onboarding/complete
Remember: Write ALL tests FIRST before any implementation
```

#### Step 3: Implement User Profile Endpoints
```bash
@backend-architect now implement /backend/app/api/routes/user_profile.py to make all tests pass. Use the DynamoDB single table design with PK: USER#{userId}, SK: PROFILE
```

#### Step 4: Create Space Management Tests
```bash
@backend-architect create /backend/tests/test_spaces.py with tests for:
- POST /api/spaces/create (returns spaceId and inviteCode)
- GET /api/spaces/{spaceId}
- GET /api/spaces (list user's spaces)
- PUT /api/spaces/{spaceId}/settings
```

#### Step 5: Implement Space Endpoints
```bash
@backend-architect implement /backend/app/api/routes/spaces.py following the tests
```

### Phase 2: Invitations & Membership

#### Step 6: Create Invitation Tests
```bash
@backend-architect create tests for /backend/tests/test_invitations.py:
- POST /api/invitations/create
- GET /api/invitations/validate?code={code}
- POST /api/invitations/accept
- GET /api/invitations/pending
```

#### Step 7: Implement Invitation Endpoints
```bash
@backend-architect implement /backend/app/api/routes/invitations.py
```

#### Step 8: Create Member Management Tests
```bash
@backend-architect create tests for /backend/tests/test_members.py:
- GET /api/spaces/{spaceId}/members
- POST /api/spaces/{spaceId}/members/invite
- DELETE /api/spaces/{spaceId}/members/{memberId}
- PUT /api/spaces/{spaceId}/members/{memberId}/role
```

#### Step 9: Implement Member Endpoints
```bash
@backend-architect implement /backend/app/api/routes/members.py
```

### Phase 3: Core Application Assembly

#### Step 10: Create FastAPI Application
```python
@backend-architect create /backend/app/main.py that:
- Initializes FastAPI app with CORS for CloudFront domain
- Includes all routers
- Adds exception handlers
- Implements health check endpoint
- Adds request ID middleware
```

#### Step 11: Create Lambda Handler
```python
@backend-architect create /backend/lambda_handler.py:
from mangum import Mangum
from app.main import app
handler = Mangum(app)
```

#### Step 12: Achieve 100% Coverage
```bash
@backend-architect run pytest --cov=app --cov-report=term-missing and fix any gaps until 100% coverage
```

### Phase 4: Integration & Type Safety

#### Step 13: Create Pydantic Models
```bash
@typescript-pro create /backend/app/types/api_types.py converting all TypeScript interfaces to Pydantic models, ensuring perfect alignment between frontend and backend
```

#### Step 14: Update Frontend Services
```bash
@frontend-developer update /frontend/src/services/ to match the exact endpoints implemented, removing any placeholder code
```

#### Step 15: Create Build Script
```bash
@deployment-engineer create /backend/scripts/build_lambda.sh that:
- Installs dependencies
- Runs tests with coverage check
- Creates deployment package
- Validates package size < 50MB
```

### Phase 5: Deployment

#### Step 16: Update Terraform
```bash
@terraform-specialist update /terraform/modules/backend/main.tf to point to the new Lambda deployment package and run terraform plan
```

#### Step 17: Create CI/CD Pipeline
```bash
@deployment-engineer create GitHub Action workflow for backend deployment that:
- Runs tests with 100% coverage requirement
- Builds Lambda package
- Updates Lambda function code
- Invalidates API Gateway cache
```

## 📁 File Structure to Create

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app initialization
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── user_profile.py    # User profile endpoints
│   │       ├── spaces.py          # Space CRUD operations
│   │       ├── invitations.py     # Invitation flow
│   │       └── members.py         # Member management
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py              # Settings from environment
│   │   ├── database.py            # DynamoDB client setup
│   │   └── security.py            # JWT & auth utilities
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py             # Pydantic models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── user_service.py        # User business logic
│   │   ├── space_service.py       # Space operations
│   │   └── invitation_service.py  # Invitation logic
│   └── utils/
│       ├── __init__.py
│       └── dynamodb_utils.py      # DynamoDB helpers
├── tests/
│   ├── __init__.py
│   ├── conftest.py                # Pytest fixtures
│   ├── test_user_profile.py       # User profile tests
│   ├── test_spaces.py             # Space management tests
│   ├── test_invitations.py        # Invitation flow tests
│   ├── test_members.py            # Member management tests
│   └── test_integration.py        # End-to-end tests
├── lambda_handler.py              # AWS Lambda entry point
├── requirements.txt                # Python dependencies
└── pytest.ini                      # Test configuration
```

## 🗄️ DynamoDB Single Table Design

### Access Patterns
1. **Get user profile**: PK=USER#{userId}, SK=PROFILE
2. **List user's spaces**: GSI1 where SK=USER#{userId}
3. **Get space details**: PK=SPACE#{spaceId}, SK=METADATA
4. **List space members**: PK=SPACE#{spaceId}, SK begins_with MEMBER#
5. **Get invitation**: PK=INVITATION#{inviteCode}, SK=METADATA
6. **List user's invitations**: GSI1 where SK=USER#{userId} and PK begins_with INVITATION#

### Key Structure
```
PK (Partition Key)          | SK (Sort Key)              | Entity Type
---------------------------- | -------------------------- | -----------
USER#{userId}               | PROFILE                    | User Profile
USER#{userId}               | SPACE#{spaceId}           | User-Space Membership
SPACE#{spaceId}            | METADATA                   | Space Details
SPACE#{spaceId}            | MEMBER#{userId}           | Space Member
INVITATION#{inviteCode}    | METADATA                   | Invitation Details
INVITATION#{inviteCode}    | USER#{userId}             | Invitation Target
```

### Global Secondary Indexes
- **GSI1**: PK=SK, SK=PK (Inverse index for lookups)
- **GSI2**: PK=entityType, SK=createdAt (For queries by type)

## 🔐 Environment Variables

```bash
# Local development (.env file)
AWS_REGION=us-east-1
DYNAMODB_TABLE=lifestyle-spaces-dev
CORS_ORIGINS=http://localhost:5173,https://your-cloudfront-url
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=xxxxx
ENVIRONMENT=dev
LOG_LEVEL=INFO
```

## ✅ Validation Checkpoints

### After Each Phase
```bash
# Test Coverage Check
cd backend
pytest --cov=app --cov-report=term-missing --cov-fail-under=100

# Type Alignment Check
@typescript-pro verify that all Pydantic models in backend match TypeScript interfaces in frontend

# Lint Check
python -m pylint app/ --fail-under=9.0

# Security Check
python -m bandit -r app/
```

### DynamoDB Query Validation
```python
# Ensure all queries use indexes efficiently
# No table scans allowed
# All queries must have consistent response times < 50ms
```

## 📊 Success Metrics

### Technical Requirements
- [ ] **100% test coverage** achieved
- [ ] All frontend API calls functional
- [ ] DynamoDB queries optimized (no scans)
- [ ] Type safety verified (TS ↔ Pydantic)
- [ ] Lambda package < 50MB
- [ ] API response time < 200ms p95
- [ ] Proper error handling (4xx/5xx)
- [ ] OpenAPI documentation generated

### Quality Gates
- [ ] All tests passing (0 failures)
- [ ] No critical security vulnerabilities
- [ ] Code follows PEP 8 standards
- [ ] Docstrings for all public functions
- [ ] No hardcoded secrets or credentials

## 🚨 Common Issues & Solutions

### Import Errors
```bash
# Fix: Ensure Python path includes backend
export PYTHONPATH="${PYTHONPATH}:/path/to/backend"
```

### DynamoDB Connection Issues
```bash
# Fix: Verify table name matches Terraform output
aws dynamodb list-tables --region us-east-1
```

### Type Mismatches
```bash
# Fix: Run type alignment validation
@typescript-pro validate all API contracts between frontend and backend
```

### Test Failures
```bash
# Fix: STOP immediately and fix before proceeding
# Never skip failing tests - they indicate contract violations
```

### Lambda Size Issues
```bash
# Fix: Use Lambda layers for large dependencies
# Or use requirements-lambda.txt with minimal deps
```

## 🎮 Quick Commands

### Debug Specific Endpoint
```bash
@backend-architect "test only the POST /api/spaces/create endpoint with verbose output"
```

### Fix Type Mismatch
```bash
@typescript-pro "align the SpaceCreate type between frontend TypeScript and backend Pydantic"
```

### Optimize DynamoDB Query
```bash
@backend-architect "optimize the list_user_spaces query using GSI1 to avoid table scan"
```

### Check Coverage Gaps
```bash
@backend-architect "show uncovered lines in space_service.py and write tests for them"
```

### Validate All Types
```bash
@typescript-pro + @backend-architect "validate all API contracts match between frontend and backend"
```

## ⏱️ Expected Timeline

### With Focused Execution
- **Phase 1**: 2-3 hours (Core endpoints & tests)
- **Phase 2**: 1-2 hours (Invitations & members)
- **Phase 3**: 1 hour (Assembly & integration)
- **Phase 4**: 1 hour (Type alignment & build)
- **Phase 5**: 1 hour (Deployment setup)

**Total**: 6-8 hours for complete implementation with 100% coverage

### Parallelization Opportunities
- Can run typescript-pro type analysis while backend-architect writes tests
- Frontend updates can happen parallel to build script creation
- Terraform updates can be prepared while tests run

## 📈 Progress Tracking

Create `backend/IMPLEMENTATION_STATUS.md`:

```markdown
# Backend Implementation Progress

## Phase 1: Core Setup ⏳
- [ ] TypeScript interfaces analyzed
- [ ] User profile tests written
- [ ] User profile endpoints implemented (Coverage: ___%)
- [ ] Space tests written  
- [ ] Space endpoints implemented (Coverage: ___%)

## Phase 2: Invitations & Membership
- [ ] Invitation tests written
- [ ] Invitation endpoints implemented (Coverage: ___%)
- [ ] Member tests written
- [ ] Member endpoints implemented (Coverage: ___%)

## Phase 3: Core Assembly
- [ ] FastAPI app created
- [ ] Lambda handler configured
- [ ] Middleware added
- [ ] Exception handlers implemented
- [ ] Health check endpoint working

## Phase 4: Integration
- [ ] Pydantic models aligned with TypeScript
- [ ] Frontend services updated
- [ ] Build script created
- [ ] Package size verified (Current: ___MB)

## Phase 5: Deployment
- [ ] Terraform configuration updated
- [ ] GitHub Action workflow created
- [ ] Lambda deployed to dev
- [ ] API Gateway tested end-to-end
- [ ] CloudFront cache invalidated

## Overall Metrics
- Total Tests: ___
- Coverage: ___%
- Package Size: ___MB
- Avg Response Time: ___ms
- Error Rate: ___%
```

## 🏁 Start Command

Begin your sprint with:
```bash
@typescript-pro analyze the frontend API calls in /frontend/src/services/ and create comprehensive type definitions for all API contracts
```

## 🎯 Why This Approach Succeeds

1. **TDD Enforced**: Writing tests first guarantees 100% coverage
2. **Type-Driven**: TypeScript interfaces drive backend implementation
3. **Sequential Validation**: Each phase builds on verified work
4. **Agent Specialization**: Each agent handles their domain expertise
5. **Clear Checkpoints**: Can pause and resume at phase boundaries
6. **Measurable Progress**: Concrete metrics at each step

This sprint plan is optimized for Claude Code's agent execution model and your project's specific requirements. Execute sequentially for best results!

---

*Ready to transform that placeholder Lambda into a production-ready API!*