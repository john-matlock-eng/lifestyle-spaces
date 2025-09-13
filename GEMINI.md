# GEMINI.md

This file provides guidance to the Gemini CLI when working with code in this repository.

## Project Overview

Lifestyle Spaces is a proof-of-concept (POC) collaborative accountability platform deployed on AWS with a security-first architecture.

### Technology Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Python FastAPI (single Lambda function)
- **Database**: DynamoDB (Single Table Design)
- **Infrastructure**: Terraform + GitHub Actions
- **AWS Services**: CloudFront, S3, API Gateway, Lambda, DynamoDB

## Critical Development Rules

### 1. Test-Driven Development (TDD)
- **ALWAYS write tests FIRST before implementation.**
- **100% code coverage is MANDATORY for the backend.**
- **90% code coverage is required for the frontend.**
- No code merges without passing tests and coverage reports.
- Frontend: Use Vitest for React components.
- Backend: Use pytest for FastAPI.

### 2. Security Requirements
- **Adopt a security-first approach in all implementations.**
- No secrets in code; use AWS Secrets Manager/Parameter Store.
- All API endpoints must have authentication/authorization.
- Implement input validation on all user inputs.
- Configure CORS properly.
- Ensure data is encrypted at rest and in transit.

### 3. Cost Optimization (POC Phase)
- NO CloudWatch alarms or excessive monitoring.
- Minimal logging (errors only).
- Use Lambda cold starts (no provisioned concurrency).
- Use DynamoDB on-demand pricing.
- Implement S3 lifecycle policies for logs.

### 4. CI/CD Requirements
- **ALL changes must be deployed through GitHub Actions and Terraform.**
- NO manual AWS console changes.
- NO one-off scripts for fixes.
- Every change must be:
  1. Developed with TDD.
  2. Pass all tests with required coverage.
  3. Deployed via GitHub Actions.
  4. Infrastructure changes via Terraform only.

### 5. TypeScript & Frontend Requirements
- **ALWAYS use `import type` for type-only imports** when `verbatimModuleSyntax` is enabled.
- **Never import React directly** in components (using the new JSX transform).
- **Validate API responses at runtime** instead of using unsafe type assertions.
- **Use proper type guards** when accessing DOM elements.
- **Always check for null/undefined** before calling methods like `focus()`.
- The build must pass before committing (`npm run build`).
- Linting must pass before committing (`npm run lint`).

## Agent Coordination
- Each agent must follow their specific domain guidelines.
- All agents must adhere to the TDD approach.
- Cross-agent dependencies must be clearly communicated.
- Final implementation must be complete before a pull request is made.

## Development Commands

### Frontend Development
```bash
cd frontend
npm install
npm run test        # Run tests first (TDD)
npm run test:coverage # Check coverage (must be 90%)
npm run dev         # Development server
npm run build       # Production build - MUST PASS before commit
npm run lint        # Code linting - MUST PASS before commit
npm run typecheck   # TypeScript type checking
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
└── GEMINI.md
```

## Agent-Specific Instructions

### Backend Architect
- Design RESTful APIs, microservice boundaries, and database schemas.
- Review system architecture for scalability and performance bottlenecks.
- **Project-Specific:**
    - Architecture: SINGLE Lambda function (FastAPI), SINGLE API Gateway, SINGLE DynamoDB table.
    - TDD is MANDATORY (100% coverage).
    - Use the specified project structure.
    - Implement security in all endpoints.
    - Provide OpenAPI spec to the frontend.

### Deployment Engineer
- Configure CI/CD pipelines, Docker containers, and cloud deployments.
- **Project-Specific:**
    - No manual deployments; everything through GitHub Actions.
    - Enforce 100% test coverage gates in pipelines.
    - Manage GitHub Actions workflows for testing, deployment, and Terraform.
    - Configure AWS resources and environment variables as specified.
    - Use OIDC for AWS authentication.

### Frontend Developer
- Build React components, implement responsive layouts, and handle client-side state management.
- **Project-Specific:**
    - TDD is MANDATORY (90% coverage) with Vitest.
    - Use the specified project structure and Vite configuration.
    - Follow the API integration pattern provided.
    - Use functional components with TypeScript.
    - State Management: React Context, Zustand for complex state. No Redux.
    - Style with CSS Modules or styled-components.

### Mobile Developer
- Develop React Native or Flutter apps with native integrations.
- **Project-Specific:**
    - The mobile app is a planned feature (not yet started).
    - Recommended approach: React Native.
    - Follow the proposed architecture and feature phases.
    - Reuse code from the web app where possible (types, API services, business logic).
    - Implement secure token storage and offline support.

### Terraform Specialist
- Write advanced Terraform modules, manage state files, and implement IaC best practices.
- **Project-Specific:**
    - Infrastructure as Code ONLY. No manual AWS Console changes.
    - Follow the specified Terraform structure (modules, environments).
    - Use S3 backend for Terraform state with locking.
    - Implement least privilege IAM policies.
    - Optimize for cost in the POC phase.

### TypeScript Pro
- Master TypeScript with advanced types, generics, and strict type safety.
- **Project-Specific:**
    - Enforce strict TypeScript configuration (`verbatimModuleSyntax`).
    - Use `import type` for all type-only imports.
    - NO `any` types allowed.
    - Validate API responses at runtime.
    - Ensure all exported types have JSDoc comments.

### UI/UX Designer
- Create interface designs, wireframes, and design systems.
- **Project-Specific:**
    - Follow the existing design system (color palette, typography, spacing).
    - All designs must be mobile-responsive and accessible (WCAG 2.1 AA).
    - Use the existing component library and interaction patterns.
    - No CSS-in-JS; use CSS modules only.
    - No UI frameworks like Material-UI.
