# Claude Code Instructions: Fix CI/CD Pipeline

## 🚨 Priority 1: Fix Test Environment Variables

### Context
- Tests pass locally (96% coverage)
- Tests fail in GitHub Actions (13% coverage)
- Error: `jwt_secret_key Field required`
- OIDC authentication is already configured

## 📋 Agent Tasks

### Task 1: Fix Test Configuration
```markdown
@backend-architect update backend/tests/conftest.py to set default environment variables for testing:

1. Add these lines at the TOP of the file (before any app imports):
```python
import os
import sys

# Set test environment variables BEFORE importing app
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret-key-for-testing-only')
os.environ.setdefault('JWT_ALGORITHM', 'HS256')
os.environ.setdefault('JWT_EXPIRATION_MINUTES', '30')
os.environ.setdefault('DYNAMODB_TABLE_NAME', 'lifestyle-spaces-test')
os.environ.setdefault('CORS_ORIGINS', '*')
os.environ.setdefault('AWS_DEFAULT_REGION', 'us-east-1')
os.environ.setdefault('AWS_ACCESS_KEY_ID', 'test')
os.environ.setdefault('AWS_SECRET_ACCESS_KEY', 'test')
```

2. Ensure all test files that import app modules do so AFTER conftest is loaded
3. Mock AWS services properly to avoid real AWS calls during tests
```

### Task 2: Update Config for Test Mode
```markdown
@backend-architect modify backend/app/core/config.py to handle test environment:

1. Import os at the top
2. Update the Settings class to provide test defaults:

```python
from pydantic_settings import BaseSettings
from pydantic import Field
import os

class Settings(BaseSettings):
    # Provide defaults for test environment
    jwt_secret_key: str = Field(
        default="test-secret-key" if os.getenv("PYTEST_CURRENT_TEST") else ...,
        description="JWT secret key for token signing"
    )
    jwt_algorithm: str = Field(default="HS256")
    jwt_expiration_minutes: int = Field(default=30)
    dynamodb_table_name: str = Field(
        default="lifestyle-spaces-test" if os.getenv("PYTEST_CURRENT_TEST") else ...,
    )
    cors_origins: str = Field(default="*")
    
    class Config:
        env_file = ".env.test" if os.getenv("PYTEST_CURRENT_TEST") else ".env"
        env_file_encoding = 'utf-8'
```
```

### Task 3: Create Test Environment File
```markdown
@deployment-engineer create backend/.env.test with test values:

JWT_SECRET_KEY=test-secret-key-for-ci-only-do-not-use-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=30
DYNAMODB_TABLE_NAME=lifestyle-spaces-test
CORS_ORIGINS=*
AWS_DEFAULT_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

### Task 4: Update GitHub Actions Workflow
```markdown
@deployment-engineer update .github/workflows/backend-tests.yml:

1. Ensure OIDC permissions are set correctly
2. Add environment variables for tests
3. Use the existing OIDC role for deployment

```yaml
name: Backend Tests

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'backend/**'
      - '.github/workflows/backend-tests.yml'
  pull_request:
    branches: [ main ]
    paths:  
      - 'backend/**'

permissions:
  id-token: write
  contents: read
  pull-requests: write

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python 3.11
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        cd backend
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        pip install pytest-cov
    
    - name: Run tests with coverage
      env:
        PYTEST_CURRENT_TEST: true
        JWT_SECRET_KEY: test-secret-key-for-ci
        JWT_ALGORITHM: HS256
        JWT_EXPIRATION_MINUTES: 30
        DYNAMODB_TABLE_NAME: lifestyle-spaces-test
        CORS_ORIGINS: '*'
        AWS_DEFAULT_REGION: us-east-1
        AWS_ACCESS_KEY_ID: test
        AWS_SECRET_ACCESS_KEY: test
      run: |
        cd backend
        pytest --cov=app --cov-report=term-missing --cov-report=xml --cov-fail-under=95
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./backend/coverage.xml
        flags: backend
        fail_ci_if_error: false

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Build Lambda package
      run: |
        cd backend
        python build_lambda_package.py
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        role-to-assume: ${{ vars.AWS_DEPLOY_ROLE_ARN }}
        aws-region: us-east-1
    
    - name: Deploy Lambda
      run: |
        aws lambda update-function-code \
          --function-name lifestyle-spaces-api \
          --zip-file fileb://backend/lambda-deployment.zip
```
```

### Task 5: Fix Import Order Issues
```markdown
@backend-architect check these test files and fix import order:
- test_lambda_integration.py
- test_placeholder.py  
- tests/unit/test_database_coverage.py
- tests/unit/test_user_profile_service.py

Ensure they import conftest or set environment variables BEFORE importing any app modules:

```python
# FIRST: Set environment
import os
os.environ.setdefault('JWT_SECRET_KEY', 'test-key')
os.environ.setdefault('DYNAMODB_TABLE_NAME', 'test-table')

# THEN: Import app modules
from app.core.config import settings
from app.main import app
```
```

### Task 6: Mock AWS Services Properly
```markdown
@backend-architect ensure all tests mock AWS services:

1. Use moto for DynamoDB mocking
2. Use unittest.mock for Cognito
3. Never make real AWS calls in tests

Example pattern:
```python
import pytest
from moto import mock_dynamodb
from unittest.mock import patch, MagicMock

@mock_dynamodb
@patch('app.services.cognito.CognitoService')
def test_something(mock_cognito):
    mock_cognito.return_value.verify_token.return_value = {'sub': 'user123'}
    # test code here
```
```

## 🔄 Execution Order

1. **First**: Fix conftest.py and config.py (Tasks 1-2)
2. **Second**: Create .env.test (Task 3)
3. **Third**: Fix failing test files (Task 5)
4. **Fourth**: Update GitHub workflow (Task 4)
5. **Fifth**: Ensure all AWS calls are mocked (Task 6)
6. **Finally**: Commit and push to trigger CI

## ✅ Success Criteria

- [ ] All 305 tests collected without errors
- [ ] Coverage >= 95% in CI
- [ ] No real AWS calls during tests
- [ ] GitHub Actions workflow passes
- [ ] Lambda deploys successfully after tests

## 🚀 Quick Test Commands

```bash
# Test locally first
cd backend
export PYTEST_CURRENT_TEST=true
pytest --cov=app --cov-report=term-missing

# If passes, commit and push
git add -A
git commit -m "fix: CI/CD environment variables and test configuration"
git push origin main
```

## 📊 Expected Results

### Before Fix
- Errors: 4 during collection
- Coverage: 13%
- Status: ❌ FAILED

### After Fix
- Errors: 0
- Coverage: 96%
- Status: ✅ PASSING

---

**Copy these instructions to Claude Code and execute sequentially!**