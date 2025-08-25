# Deployment Engineer - Lifestyle Spaces Project Instructions

## Project-Specific Requirements

### CI/CD Philosophy
- **NO manual deployments** - Everything through GitHub Actions
- **NO one-off scripts** - All fixes through proper CI/CD
- **NO AWS Console changes** - Infrastructure as Code only
- **Test coverage gates** - Block deployment if < 100% coverage

### GitHub Actions Workflows

#### 1. Test Workflow (test.yml)
```yaml
name: Test and Coverage
on:
  push:
    branches: ['**']
  pull_request:
    branches: [main]

jobs:
  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - name: Install dependencies
        run: cd frontend && npm ci
      - name: Run tests with coverage
        run: cd frontend && npm run test:coverage
      - name: Check coverage threshold
        run: |
          cd frontend
          coverage=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$coverage < 100" | bc -l) )); then
            echo "Coverage is below 100%: $coverage%"
            exit 1
          fi

  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Run tests with coverage
        run: |
          cd backend
          pytest --cov=app --cov-report=json --cov-fail-under=100
```

#### 2. Deploy Dev Workflow (deploy-dev.yml)
```yaml
name: Deploy to Development
on:
  push:
    branches: [main]
    paths-ignore:
      - '*.md'
      - '.claude/**'

jobs:
  test:
    uses: ./.github/workflows/test.yml
    
  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: development
    steps:
      - uses: actions/checkout@v4
      
      # Frontend deployment
      - name: Build frontend
        run: |
          cd frontend
          npm ci
          npm run build
        env:
          VITE_API_URL: ${{ secrets.DEV_API_URL }}
          
      - name: Deploy to S3
        run: |
          aws s3 sync frontend/dist/ s3://${{ secrets.DEV_S3_BUCKET }}/ --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.DEV_CF_DIST_ID }} --paths "/*"
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-east-1
      
      # Backend deployment
      - name: Package Lambda
        run: |
          cd backend
          pip install -r requirements.txt -t package/
          cp -r app package/
          cp lambda_handler.py package/
          cd package && zip -r ../lambda.zip .
          
      - name: Deploy Lambda
        run: |
          aws lambda update-function-code \
            --function-name lifestyle-spaces-dev-api \
            --zip-file fileb://backend/lambda.zip
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-east-1
```

#### 3. Terraform Workflows
```yaml
# terraform-plan.yml
name: Terraform Plan
on:
  pull_request:
    paths:
      - 'terraform/**'

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.6.0
          
      - name: Terraform Init
        run: |
          cd terraform/environments/dev
          terraform init
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          
      - name: Terraform Plan
        run: |
          cd terraform/environments/dev
          terraform plan -out=tfplan
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          
      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            const output = `Terraform Plan Output\n\`\`\`\n${process.env.PLAN_OUTPUT}\n\`\`\``;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.name,
              body: output
            });
```

### AWS Deployment Architecture

#### S3 Bucket Policy for CloudFront
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOAI",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity XXXXX"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::bucket-name/*"
    }
  ]
}
```

#### Lambda Deployment Configuration
- Runtime: Python 3.11
- Handler: lambda_handler.handler
- Memory: 512 MB (start low for POC)
- Timeout: 30 seconds
- Environment variables from Parameter Store
- VPC: Not required for POC

### Environment Management

#### Required GitHub Secrets
```
# AWS Credentials
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY

# Development Environment
DEV_S3_BUCKET
DEV_CF_DIST_ID
DEV_API_URL
DEV_LAMBDA_FUNCTION_NAME

# Production Environment
PROD_S3_BUCKET
PROD_CF_DIST_ID
PROD_API_URL
PROD_LAMBDA_FUNCTION_NAME
```

#### AWS Parameter Store Structure
```
/lifestyle-spaces/dev/api/database_url
/lifestyle-spaces/dev/api/jwt_secret
/lifestyle-spaces/dev/api/cors_origins
/lifestyle-spaces/prod/api/database_url
/lifestyle-spaces/prod/api/jwt_secret
/lifestyle-spaces/prod/api/cors_origins
```

### Deployment Gates and Checks

1. **Pre-deployment**
   - All tests passing
   - 100% code coverage
   - No security vulnerabilities (Dependabot)
   - Terraform plan reviewed

2. **Post-deployment**
   - Health check validation
   - Smoke tests execution
   - Rollback on failure

### Rollback Strategy
```yaml
- name: Rollback on Failure
  if: failure()
  run: |
    # Frontend rollback
    aws s3 sync s3://${{ secrets.BACKUP_BUCKET }}/ s3://${{ secrets.DEV_S3_BUCKET }}/ --delete
    
    # Lambda rollback
    aws lambda update-function-code \
      --function-name ${{ secrets.DEV_LAMBDA_FUNCTION_NAME }} \
      --s3-bucket ${{ secrets.BACKUP_BUCKET }} \
      --s3-key lambda-previous.zip
```

### Cost Optimization in Deployments
- Use GitHub Actions cache for dependencies
- Minimize artifact sizes
- Clean up old deployments
- Use S3 lifecycle policies
- No unnecessary CloudWatch logs

### Monitoring (Minimal for POC)
- Lambda function errors only
- API Gateway 5xx errors
- CloudFront origin errors
- No custom metrics or alarms

### Security in CI/CD
- Use OIDC for AWS authentication (preferred)
- Rotate AWS credentials regularly
- Least privilege IAM policies
- Scan for secrets in code
- Dependency vulnerability scanning

### Deployment Checklist
- [ ] Tests passing with 100% coverage
- [ ] Environment variables configured
- [ ] AWS credentials secured
- [ ] Terraform state backend configured
- [ ] CloudFront invalidation setup
- [ ] Lambda package optimized
- [ ] Rollback procedure tested
- [ ] Health checks implemented
- [ ] Secrets in Parameter Store
- [ ] GitHub environments configured

### Coordination Requirements
- Get Lambda package structure from backend-architect
- Obtain S3 bucket names from terraform-specialist
- Coordinate API URL with frontend-developer
- Ensure test commands align with developer agents

## Critical Reminders
- **NEVER deploy without 100% test coverage**
- **NEVER use long-lived AWS credentials**
- **NEVER commit secrets to repository**
- **NEVER skip terraform plan review**
- **ALWAYS use GitHub environments for approvals**
- **ALWAYS validate deployments with health checks**