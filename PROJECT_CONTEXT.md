# 📊 LIFESTYLE SPACES - PROJECT CONTEXT
*Last Updated: 2025-08-29*
*Session Manager: Executive Partner AI*

## 🚨 CURRENT STATUS: CI/CD Fix Required

### Critical Issue
- **Problem**: GitHub Actions tests failing (showing 13% instead of 96% coverage)
- **Root Cause**: Missing JWT_SECRET_KEY and other env vars in CI
- **Solution**: Claude Code instructions ready in `CLAUDE_CODE_CI_FIX.md`
- **OIDC**: Already configured (no AWS setup needed)

## 🎯 PROJECT OVERVIEW

**Project**: Lifestyle Spaces POC
**Backend Status**: 
- **Local**: 96% coverage, 341 tests ✅
- **CI/CD**: 13% coverage, 4 errors ❌
- **Package**: 28.43MB ready for deployment ✅

### Architecture Status
- **Frontend**: 98.38% tested ✅
- **Backend**: Complete locally, CI needs fix 🔧
- **Infrastructure**: Deployed with OIDC ✅
- **Agent System**: 10 agents configured ✅

## 📋 IMMEDIATE ACTION - Claude Code Tasks

### Copy to Claude Code Now:
```markdown
# Read CLAUDE_CODE_CI_FIX.md for detailed instructions

Priority Tasks:
1. @backend-architect fix backend/tests/conftest.py - set env vars BEFORE imports
2. @backend-architect update backend/app/core/config.py - handle test mode
3. @deployment-engineer create backend/.env.test with test values
4. @deployment-engineer update .github/workflows/backend-tests.yml
5. @backend-architect fix import order in failing test files
6. @backend-architect ensure all AWS services are mocked
```

## 🔴 Failing Tests Analysis

### Collection Errors (4 files):
1. `test_lambda_integration.py`
2. `test_placeholder.py`
3. `tests/unit/test_database_coverage.py`
4. `tests/unit/test_user_profile_service.py`

**All failing with**: `jwt_secret_key Field required`

### Coverage Drop Analysis:
```
Local:  96% (305 tests pass)
CI/CD:  13% (can't even load tests)
Issue:  Environment variables not set
```

## ✅ What's Actually Working

### Backend Implementation (Local)
- 341 tests written
- 96% coverage achieved
- All endpoints implemented
- Lambda package ready (28.43MB)
- API contracts documented

### Just Needs:
- Environment variables in CI
- Proper test configuration
- Mock AWS services

## 🚀 Once CI Fixed - Deployment Plan

### Automatic Deployment Pipeline:
1. Tests pass in CI (95%+ coverage)
2. Lambda package builds
3. OIDC authenticates to AWS
4. Lambda updates with new code
5. Smoke tests verify deployment

### Manual Steps Required:
- Monitor CloudWatch logs
- Verify API Gateway integration
- Test frontend integration
- Update production secrets

## 📊 Project Metrics

### Quality Metrics
```
Frontend Coverage:    98.38% ✅
Backend Coverage:     96.00% ✅ (local)
Total Tests:          341 backend + frontend tests
Package Size:         28.43MB (43% under limit)
```

### Implementation Status
```
User Profile API:     100% ✅
Space Management:     100% ✅
Invitation System:    100% ✅
Authentication:       100% ✅
Database Layer:       100% ✅
```

## 🔄 Session Continuity

### Current Session Tasks
1. Created `CLAUDE_CODE_CI_FIX.md` with detailed instructions
2. Prepared GitHub Actions workflow with OIDC
3. Identified exact test failures and root cause

### Next Session Checklist
1. Verify CI/CD fixes applied
2. Check GitHub Actions passing
3. Confirm Lambda deployment
4. Test API endpoints
5. Integration testing

## 🎯 Success Criteria

### Today's Goals
- [ ] Fix environment variables in CI
- [ ] All 305 tests collected successfully
- [ ] 95%+ coverage in GitHub Actions
- [ ] Lambda deploys automatically
- [ ] Smoke tests pass

### This Week
- [ ] Beta environment live
- [ ] Frontend-backend integration complete
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Beta users onboarded

## 📝 Quick Commands

### After Claude Code Fixes:
```bash
# Test locally first
cd backend
export PYTEST_CURRENT_TEST=true
pytest --cov=app

# Push to trigger CI
git add -A
git commit -m "fix: CI/CD environment configuration"
git push origin main

# Monitor deployment
gh run watch
```

## 🔗 Key Files

### CI/CD Fix Documentation
- `CLAUDE_CODE_CI_FIX.md` - Detailed agent instructions
- `.github/workflows/backend-tests.yml` - CI pipeline
- `backend/.env.test` - Test environment
- `backend/tests/conftest.py` - Test configuration

### Backend Status
- `backend/htmlcov/index.html` - Coverage report
- `backend/lambda-deployment.zip` - Ready package
- `backend/API_CONTRACTS.md` - API documentation

---

**STATUS**: Backend complete locally. CI/CD configuration fix in progress.

**NEXT**: Execute Claude Code instructions from `CLAUDE_CODE_CI_FIX.md`

*Once CI is fixed, deployment is automatic via GitHub Actions with OIDC*