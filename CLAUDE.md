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
- **100% code coverage is MANDATORY** (excluding Terraform/IaC)
- No code merges without passing tests and coverage reports
- Frontend: Use Vitest for React components
- Backend: Use pytest for FastAPI

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

### 5. Agent Coordination
- Each agent must follow their specific domain guidelines
- All agents must ensure TDD approach
- Cross-agent dependencies must be clearly communicated
- Final implementation must be complete before PR notification

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
npm run build       # Production build
npm run lint        # Code linting
```

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

## Important Notes

- **NO MANUAL FIXES**: Everything through code and CI/CD
- **TDD IS MANDATORY**: Tests before code, always
- **100% COVERAGE**: No exceptions for application code
- **SECURITY FIRST**: Every decision must consider security
- **COST CONSCIOUS**: This is a POC, avoid unnecessary AWS costs
- **AGENT COORDINATION**: Use appropriate agents for each task