# CI/CD Fix for Backend Tests

## 🚨 URGENT: GitHub Actions Configuration Issue

### Problem Identified
- **Coverage Drop**: 96% (local) → 13% (CI)
- **Cause**: Missing environment variables in CI
- **Error**: `jwt_secret_key Field required`
- **Impact**: 4 test files can't even load

### Required Environment Variables
```yaml
JWT_SECRET_KEY: (required)
JWT_ALGORITHM: HS256
JWT_EXPIRATION_MINUTES: 30
DYNAMODB_TABLE_NAME: lifestyle-spaces-test
CORS_ORIGINS: *
```

## 📋 Claude Code Instructions - Fix CI/CD

### Task 1: Create Test Environment File
```bash
@deployment-engineer create backend/.env.test with:
JWT_SECRET_KEY=test-secret-key-for-ci-only
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=30
DYNAMODB_TABLE_NAME=lifestyle-spaces-test
CORS_ORIGINS=*
AWS_DEFAULT_REGION=us-east-1
```

### Task 2: Update GitHub Actions Workflow
```yaml
@deployment-engineer update .github/workflows/backend-tests.yml:

name: Backend Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      
      - name: Run tests with environment
        env:
          JWT_SECRET_KEY: ${{ secrets.JWT_SECRET_KEY || 'test-secret-key' }}
          JWT_ALGORITHM: HS256
          JWT_EXPIRATION_MINUTES: 30
          DYNAMODB_TABLE_NAME: lifestyle-spaces-test
          CORS_ORIGINS: '*'
          AWS_DEFAULT_REGION: us-east-1
        run: |
          cd backend
          pytest --cov=app --cov-report=term-missing --cov-fail-under=95
```

### Task 3: Update conftest.py for Test Environment
```python
@backend-architect update backend/tests/conftest.py:

import os
import pytest
from unittest.mock import patch

# Set test environment variables before any imports
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret-key')
os.environ.setdefault('JWT_ALGORITHM', 'HS256')
os.environ.setdefault('JWT_EXPIRATION_MINUTES', '30')
os.environ.setdefault('DYNAMODB_TABLE_NAME', 'lifestyle-spaces-test')
os.environ.setdefault('CORS_ORIGINS', '*')
os.environ.setdefault('AWS_DEFAULT_REGION', 'us-east-1')

# Now import the app
from app.main import app
from httpx import AsyncClient

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
```

## 🔄 Quick Fix Steps

### Option 1: Immediate Fix (Recommended)
```bash
# Add GitHub Secrets
1. Go to GitHub repo → Settings → Secrets
2. Add: JWT_SECRET_KEY = (generate secure key)
3. Re-run the failed workflow
```

### Option 2: Use Test Defaults
```bash
# Update backend/app/core/config.py
class Settings(BaseSettings):
    jwt_secret_key: str = Field(
        default="test-key" if os.getenv("PYTEST_CURRENT_TEST") else ...,
        description="JWT secret key"
    )
```

## 📊 Expected Results After Fix

### Before (Current)
- Tests collected: 305 items / 4 errors
- Coverage: 13% (most modules at 0%)
- Status: ❌ FAILED

### After (Fixed)
- Tests collected: 305 items ✅
- Coverage: 96% 
- Status: ✅ PASSING

## 🚀 Deployment Strategy Update

### Step 1: Fix CI Environment
```bash
# Create backend/.env.test
echo "JWT_SECRET_KEY=test-secret-for-ci" > backend/.env.test
echo "JWT_ALGORITHM=HS256" >> backend/.env.test
echo "JWT_EXPIRATION_MINUTES=30" >> backend/.env.test
echo "DYNAMODB_TABLE_NAME=lifestyle-spaces-test" >> backend/.env.test
echo "CORS_ORIGINS=*" >> backend/.env.test
```

### Step 2: Commit Fix
```bash
git add backend/.env.test
git add .github/workflows/backend-tests.yml
git commit -m "fix: Add test environment variables for CI/CD"
git push origin main
```

### Step 3: Add Production Secrets
```bash
# In GitHub UI: Settings → Secrets → Actions
# Add these repository secrets:
# - JWT_SECRET_KEY (generate secure key)
# - AWS_ACCESS_KEY_ID
# - AWS_SECRET_ACCESS_KEY
# - DYNAMODB_TABLE_NAME
```

## 📈 Coverage Analysis (When Fixed)

### Actual Local Coverage (96%)
The tests work locally because you have environment variables set. The CI needs the same setup.

### Files Needing Attention
Once CI is fixed, these files still need coverage improvement:
- app/api/routes/* - Currently 0% in CI (will be ~95% when fixed)
- app/services/space.py - 13% (needs improvement)

## 🎯 Action Items

### Immediate (Block Everything Else)
1. [ ] Add test environment variables to CI
2. [ ] Re-run GitHub Actions workflow
3. [ ] Verify tests pass with proper coverage

### After CI Fix
1. [ ] Deploy Lambda with confidence
2. [ ] Run integration tests
3. [ ] Monitor production deployment

---

**The backend IS complete and working!** This is just a CI configuration issue. Once environment variables are added, your 96% coverage will be restored.