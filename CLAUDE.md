# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lifestyle Spaces - A POC application deployed on AWS with security-first architecture.

### Technology Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Python FastAPI (single Lambda function)
- **Database**: DynamoDB (Single Table Design)
- **Infrastructure**: Terraform + GitHub Actions
- **AWS Services**: CloudFront, S3, API Gateway, Lambda, DynamoDB

## Critical Development Rules

### 1. Test-Driven Development (TDD)
- **ALWAYS write tests FIRST before implementation**
- **100% code coverage is MANDATORY for backend**
- **90% code coverage is required for frontend**
- No code merges without passing tests and coverage reports
- Frontend: Use Vitest for React components (90% coverage threshold)
- Backend: Use pytest for FastAPI (100% coverage threshold)

### 2. Security Requirements
- **Security-first approach on all implementations**
- No secrets in code - use AWS Secrets Manager/Parameter Store
- All API endpoints must have authentication/authorization
- Input validation on all user inputs
- CORS properly configured
- Data encryption at rest and in transit

### 3. Cost Optimization (POC Phase)
- NO CloudWatch alarms or excessive monitoring
- Minimal logging (errors only)
- Use Lambda cold starts (no provisioned concurrency)
- DynamoDB on-demand pricing
- S3 lifecycle policies for logs

### 4. CI/CD Requirements
- **ALL changes through GitHub Actions and Terraform**
- NO manual AWS console changes
- NO one-off scripts for fixes
- Every change must be:
  1. Developed with TDD
  2. Pass all tests with 100% coverage
  3. Deployed via GitHub Actions
  4. Infrastructure changes via Terraform only

### 5. TypeScript & Frontend Requirements
- **ALWAYS use `import type` for type-only imports** when `verbatimModuleSyntax` is enabled
- **Never import React directly** in components (using new JSX transform)
- **Validate API responses at runtime** instead of using unsafe type assertions
- **Use proper type guards** when accessing DOM elements
- **Always check for null/undefined** before calling methods like `focus()`
- **Build must pass** before committing (`npm run build`)
- **Lint must pass** before committing (`npm run lint`)

#### Common ESLint & TypeScript Pitfalls to Avoid:
```typescript
// ❌ WRONG - will fail with verbatimModuleSyntax
import { User, AuthState } from '../types';

// ✅ CORRECT
import type { User, AuthState } from '../types';

// ❌ WRONG - unsafe type assertion
const response = await apiCall() as SomeType;

// ✅ CORRECT - validate at runtime
const response = await apiCall();
if (!response || typeof response !== 'object' || !('expectedField' in response)) {
  throw new Error('Invalid API response');
}
return response as SomeType;

// ❌ WRONG - no null check for DOM elements
element.nextElementSibling.focus();

// ✅ CORRECT - proper null checks
const nextElement = element.nextElementSibling as HTMLElement | null;
if (nextElement && typeof nextElement.focus === 'function') {
  nextElement.focus();
}

// ❌ WRONG - using 'any' type
const handleClick = (event: any) => { ... }

// ✅ CORRECT - use specific types
const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => { ... }

// ❌ WRONG - unused variables
const response = await apiCall();
return true;

// ✅ CORRECT - remove unused variables
await apiCall();
return true;
```

### 6. Agent Coordination
- Each agent must follow their specific domain guidelines
- All agents must ensure TDD approach
- Cross-agent dependencies must be clearly communicated
- Final implementation must be complete before PR notification
- **Frontend agents must ensure TypeScript compilation succeeds**
- **Backend agents must ensure 100% test coverage**

#### Agent-Specific Requirements:

**frontend-developer agent:**
- MUST use `import type` for all type-only imports
- MUST run `npm run lint` and fix ALL errors before completing any task
- MUST validate builds with `npm run build` before completing
- MUST ensure all tests pass with `npm run test`
- MUST handle null/undefined checks for DOM operations
- MUST validate API responses instead of blind type casting
- MUST NOT use `any` type - always specify proper types
- MUST NOT leave unused variables in code

**backend-architect agent:**
- MUST achieve 100% test coverage
- MUST mock all AWS services in tests
- MUST use proper error handling
- MUST validate all input data

**deployment-engineer agent:**
- MUST NOT set AWS reserved environment variables
- MUST use IAM roles instead of access keys
- MUST verify deployments don't break existing functionality
- MUST ensure CI/CD pipelines pass all checks

**typescript-pro agent:**
- MUST enforce `verbatimModuleSyntax` compliance
- MUST use proper type guards
- MUST avoid unsafe type assertions
- MUST ensure strict null checks

## Architecture Details

### AWS Infrastructure
```
CloudFront → S3 (Frontend Static Files)
     ↓
API Gateway → Lambda (FastAPI Router) → DynamoDB
```

### Backend Architecture
- **Single API Gateway** with all routes
- **Single Lambda function** running FastAPI
- **Single DynamoDB table** with composite keys
- Python FastAPI handles all routing internally

### Frontend Architecture
- Static build deployed to S3
- CloudFront distribution for global delivery
- Environment variables injected at build time
- API calls through CloudFront to API Gateway

## Development Commands

### Frontend Development
```bash
cd frontend
npm install
npm run test        # Run tests first (TDD)
npm run test:coverage # Check coverage (must be 100%)
npm run dev         # Development server
npm run build       # Production build - MUST PASS before commit
npm run lint        # Code linting - MUST PASS before commit
npm run typecheck   # TypeScript type checking
```

### Frontend Pre-Commit Checklist
**MANDATORY** - Agents must verify ALL of these before marking tasks complete:
1. ✅ `npm run lint` passes without errors (NO ESLint errors allowed)
2. ✅ `npm run build` passes without errors (TypeScript compilation must succeed)
3. ✅ `npm run test` all tests pass
4. ✅ Coverage meets requirements (90% minimum)
5. ✅ No TypeScript errors (check with `npx tsc --noEmit`)

**IMPORTANT**: Never mark a frontend task as complete without running `npm run lint`!

### Backend Development
```bash
cd backend
pip install -r requirements.txt
pytest              # Run tests first (TDD)
pytest --cov=app --cov-report=term-missing  # Coverage (must be 100%)
uvicorn app.main:app --reload  # Local development
```

### Infrastructure
```bash
cd terraform
terraform init
terraform plan
terraform apply     # Only through GitHub Actions in production
```

## Project Structure
```
lifestyle-spaces/
├── frontend/           # React application
│   ├── src/
│   ├── tests/         # Frontend tests (write first!)
│   └── package.json
├── backend/           # FastAPI application
│   ├── app/
│   ├── tests/         # Backend tests (write first!)
│   └── requirements.txt
├── terraform/         # Infrastructure as Code
│   ├── modules/
│   ├── environments/
│   └── main.tf
├── .github/
│   └── workflows/     # CI/CD pipelines
└── CLAUDE.md
```

## Workflow Process

1. **Feature Request**: User requests a feature
2. **TDD Development**: Agents write tests first, then implementation
3. **Coverage Check**: Ensure 100% code coverage
4. **Integration**: Coordinate between frontend/backend/infrastructure
5. **Complete Testing**: All tests pass across the stack
6. **PR Notification**: Agents notify when ready for PR
7. **Automated Deployment**: GitHub Actions handles deployment

## DynamoDB Single Table Design

### Access Patterns
- Define all access patterns before implementation
- Use composite keys (PK, SK) effectively
- GSIs only when absolutely necessary
- Minimize read/write capacity units

### Key Structure
```
PK: ENTITY#id
SK: METADATA#timestamp or RELATED#id
```

## GitHub Actions Workflows

### Required Workflows
1. **test.yml**: Run on every push (tests + coverage)
2. **deploy-dev.yml**: Deploy to dev on main branch
3. **deploy-prod.yml**: Manual trigger for production
4. **terraform-plan.yml**: Plan infrastructure changes
5. **terraform-apply.yml**: Apply infrastructure changes

## Common CI/CD Pitfalls to Avoid

### Lambda Environment Variables
- **NEVER set AWS reserved environment variables** in Lambda configuration:
  - ❌ AWS_REGION (automatically provided)
  - ❌ AWS_DEFAULT_REGION (automatically provided)
  - ❌ AWS_ACCESS_KEY_ID (use IAM roles)
  - ❌ AWS_SECRET_ACCESS_KEY (use IAM roles)
  - ❌ AWS_SESSION_TOKEN (use IAM roles)
  - ❌ Any AWS_LAMBDA_* variables

### API Endpoint Consistency
- Frontend API calls must match backend routes exactly
- Always include `/api` prefix in API calls
- Example: `/api/spaces` not `/spaces` or `/rooms`

### Test Isolation
- Tests must not depend on external AWS services
- All AWS SDK calls must be mocked in tests
- Use `@patch` decorators or mock modules properly
- Tests must pass without AWS credentials

## Important Notes

- **NO MANUAL FIXES**: Everything through code and CI/CD
- **TDD IS MANDATORY**: Tests before code, always
- **100% COVERAGE**: Required for backend (Python/FastAPI)
- **90% COVERAGE**: Required for frontend (React/TypeScript)
- **SECURITY FIRST**: Every decision must consider security
- **COST CONSCIOUS**: This is a POC, avoid unnecessary AWS costs
- **AGENT COORDINATION**: Use appropriate agents for each task
- **BUILD MUST PASS**: Never commit code that doesn't build
- **TYPE SAFETY**: Use TypeScript's strict mode effectively