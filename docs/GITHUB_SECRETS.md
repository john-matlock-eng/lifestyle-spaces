# GitHub Secrets Configuration

This document lists all the GitHub secrets that need to be configured for the CI/CD pipelines to work correctly.

## Required Secrets

### AWS Configuration

1. **`AWS_ROLE_ARN`** (Required)
   - Description: The ARN of the IAM role that GitHub Actions will assume via OIDC
   - Format: `arn:aws:iam::123456789012:role/github-actions-role`
   - Used in: All deployment workflows
   - How to get: Created during initial AWS setup for OIDC authentication

### JWT Configuration

2. **`JWT_SECRET_KEY`** (Required for Dev/Test)
   - Description: Secret key for JWT token signing in development and test environments
   - Format: Strong random string (minimum 32 characters)
   - Used in: 
     - Backend tests
     - Dev environment deployments
     - PR deployments
   - Example generation: `openssl rand -hex 32`
   - Note: This is used for local JWT validation in tests, NOT for Cognito tokens in production

3. **`JWT_SECRET_KEY_PROD`** (Required for Production)
   - Description: Secret key for JWT token signing in production environment
   - Format: Strong random string (minimum 64 characters recommended)
   - Used in: Production deployments only
   - Example generation: `openssl rand -hex 64`
   - **IMPORTANT**: Must be different from the dev/test key and kept highly secure

## How to Add Secrets to GitHub

1. Navigate to your repository on GitHub
2. Go to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret with the exact name shown above
5. Paste the secret value
6. Click "Add secret"

## Security Best Practices

1. **Never commit secrets to code**: All sensitive values should be stored as GitHub secrets
2. **Use different values for different environments**: Production secrets should be different from dev/test
3. **Rotate secrets regularly**: Update JWT secrets periodically (recommended every 90 days for production)
4. **Limit access**: Only repository admins should have access to production secrets
5. **Use strong values**: Generate cryptographically secure random values for secrets

## Environment Variables Set by Workflows

The following environment variables are automatically set in the Lambda function by the CI/CD pipelines:

### From Terraform Variables
- `ENVIRONMENT`: Environment name (dev/prod)
- `DYNAMODB_TABLE_NAME`: DynamoDB table name
- `CORS_ORIGINS`: Allowed CORS origins
- `COGNITO_USER_POOL_ID`: Cognito User Pool ID (from Cognito module)
- `COGNITO_USER_POOL_CLIENT_ID`: Cognito client ID (from Cognito module)
- `JWT_SECRET_KEY`: JWT secret key (from GitHub secret)
- `JWT_ALGORITHM`: HS256 (hardcoded)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: 30 (hardcoded)

## Verifying Configuration

After setting up the secrets, you can verify they're working by:

1. Running the "Terraform Plan" workflow - it should complete without errors
2. Creating a PR - the deploy-pr workflow should run successfully
3. Checking the Lambda environment variables in AWS Console (values will be hidden for sensitive variables)

## Troubleshooting

If you see errors like:
- `Error: No value for required variable` - The JWT_SECRET_KEY secret is missing
- `401 Unauthorized` in Lambda logs - Cognito environment variables may not be set correctly
- `Invalid token` errors - JWT secret may be misconfigured or different between environments