# AWS Cognito User Pool Module

This Terraform module creates an AWS Cognito User Pool with App Client for user authentication in the Lifestyle Spaces application.

## Features

- **No Email Verification**: Configured for POC simplicity (users can sign up without email verification)
- **Self Sign-up**: Users can register themselves without admin intervention
- **Custom Attributes**: Supports `userId` and `username` custom attributes
- **Flexible Password Policy**: Configurable password requirements
- **No MFA**: Disabled for POC phase
- **Cost-Optimized**: Configured for minimal AWS costs during development
- **SPA-Ready**: App client configured for Single Page Applications (no client secret)

## Architecture

The module creates:
- Cognito User Pool with specified configuration
- User Pool Client for web applications
- Optional hosted UI domain (configurable)

## Usage

```hcl
module "cognito" {
  source = "../../modules/cognito"

  project_name = "lifestyle-spaces"
  environment  = "dev"
  
  # Password policy
  password_minimum_length    = 8
  password_require_lowercase = true
  password_require_numbers   = true
  password_require_symbols   = false
  password_require_uppercase = true
  
  # Token validity (dev-friendly)
  access_token_validity_minutes = 60  # 1 hour
  id_token_validity_minutes     = 60  # 1 hour
  refresh_token_validity_days   = 30  # 30 days
  
  # OAuth URLs
  callback_urls = ["http://localhost:3000", "https://your-domain.com"]
  logout_urls   = ["http://localhost:3000", "https://your-domain.com"]
  
  # Optional hosted UI
  create_domain = false  # Set to true to enable Cognito hosted UI
  
  tags = {
    Project     = "lifestyle-spaces"
    Environment = "dev"
    ManagedBy   = "Terraform"
  }
}
```

## Configuration

### Password Policy

The module allows flexible password policy configuration:

- `password_minimum_length`: Minimum password length (default: 8)
- `password_require_lowercase`: Require lowercase letters (default: true)
- `password_require_numbers`: Require numbers (default: true)
- `password_require_symbols`: Require special characters (default: false for POC)
- `password_require_uppercase`: Require uppercase letters (default: true)

### Token Validity

Token validity periods are configurable:

- `access_token_validity_minutes`: Access token lifetime (default: 60 minutes)
- `id_token_validity_minutes`: ID token lifetime (default: 60 minutes)  
- `refresh_token_validity_days`: Refresh token lifetime (default: 30 days)

### OAuth Configuration

- `callback_urls`: List of allowed callback URLs for OAuth flows
- `logout_urls`: List of allowed logout URLs
- `create_domain`: Whether to create a Cognito domain for hosted UI

## Outputs

The module provides these outputs:

- `user_pool_id`: Cognito User Pool ID
- `user_pool_arn`: Cognito User Pool ARN
- `user_pool_client_id`: App Client ID for frontend integration
- `cognito_config`: Complete configuration object for frontend use
- `user_pool_authorizer_config`: Configuration for API Gateway authorizer

## Environment-Specific Configurations

### Development
- Relaxed password requirements (no symbols required)
- Longer token validity for development convenience
- Localhost URLs supported
- No hosted UI domain (reduced complexity)

### Production
- Stricter password requirements (symbols required)
- Shorter token validity for security
- Production domain URLs only
- Optional hosted UI domain enabled

## Integration with Other Modules

This module integrates with:
- **Backend Module**: API Gateway can use Cognito as authorizer
- **Frontend Module**: Frontend receives Cognito configuration via outputs
- **Security Module**: IAM policies can reference Cognito resources

## Cost Optimization

The module is designed for cost optimization during POC phase:
- No unnecessary features enabled
- Minimal token validity periods
- No advanced security features that incur costs

## Security Considerations

While optimized for POC, the module still maintains essential security:
- Proper password policies
- Secure token handling
- CORS configuration
- Prevention of user existence errors