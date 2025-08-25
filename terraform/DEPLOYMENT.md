# Terraform Deployment Guide

This guide provides step-by-step instructions for deploying the Lifestyle Spaces infrastructure to AWS.

## Prerequisites

1. **AWS CLI configured** with appropriate credentials
2. **Terraform >= 1.5** installed
3. **AWS Account ID**: 070561229936
4. **Region**: us-east-1
5. **Repository**: lifestyle-spaces

## Quick Start

### 1. Set up Backend Infrastructure

First, create the S3 bucket and DynamoDB table for Terraform state:

```bash
# Run the setup script
./setup-backend.sh
```

Or create manually:
```bash
# Create S3 bucket
aws s3 mb s3://lifestyle-spaces-terraform-state-070561229936 --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket lifestyle-spaces-terraform-state-070561229936 \
  --versioning-configuration Status=Enabled

# Create DynamoDB table
aws dynamodb create-table \
  --table-name lifestyle-spaces-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 2. Initialize and Deploy

**For Development Environment:**
```bash
# Option 1: Use the init script
./init-terraform.sh dev

# Then deploy
cd environments/dev
terraform plan
terraform apply

# Option 2: Use Makefile
make plan ENV=dev
make apply ENV=dev
```

**For Production Environment:**
```bash
# Option 1: Use the init script
./init-terraform.sh prod

# Then deploy
cd environments/prod
terraform plan
terraform apply

# Option 2: Use Makefile
make plan ENV=prod
make apply ENV=prod
```

## Infrastructure Components

The Terraform configuration creates the following AWS resources:

### Core Infrastructure
- **DynamoDB Table**: Single table design for application data
- **Lambda Function**: FastAPI application handler
- **API Gateway**: REST API with proxy integration
- **S3 Bucket**: Static website hosting
- **CloudFront**: Global CDN distribution

### Security & IAM
- **Lambda IAM Role**: With DynamoDB access permissions
- **GitHub Actions Role**: For CI/CD deployments (if enabled)
- **WAF Web ACL**: Rate limiting and security rules (prod only)

### Monitoring
- **CloudWatch Log Groups**: For Lambda function logs
- **Log Retention**: 7 days (dev), 30 days (prod)

## Environment Configurations

### Development Environment
- **Cost Optimized**: Minimal resources, short log retention
- **Permissive CORS**: Allows all origins for development
- **No WAF**: Disabled for cost savings
- **No S3 Versioning**: Disabled for cost savings
- **CloudFront Price Class**: 100 (cheapest option)

### Production Environment
- **Production Ready**: Full security features enabled
- **Enhanced Security**: WAF enabled, strict CORS
- **Data Protection**: S3 versioning, DynamoDB protection
- **CloudFront Price Class**: All (global performance)
- **Extended Logging**: 30-day retention

## File Structure

```
terraform/
├── environments/
│   ├── dev/
│   │   ├── backend.tf          # S3 backend configuration
│   │   ├── main.tf             # Environment-specific config
│   │   ├── variables.tf        # Variable declarations
│   │   ├── terraform.tfvars    # Environment values
│   │   └── outputs.tf          # Output definitions
│   └── prod/
│       ├── backend.tf          # S3 backend configuration
│       ├── main.tf             # Environment-specific config
│       ├── variables.tf        # Variable declarations
│       ├── terraform.tfvars    # Environment values
│       └── outputs.tf          # Output definitions
├── modules/
│   ├── backend/                # Lambda + API Gateway
│   ├── database/               # DynamoDB
│   ├── frontend/               # S3 + CloudFront
│   └── security/               # IAM + WAF
├── setup-backend.sh            # Backend setup script
├── init-terraform.sh           # Initialization script
├── Makefile                    # Common operations
└── DEPLOYMENT.md               # This guide
```

## Important Configuration Details

### Backend State Configuration
- **S3 Bucket**: `lifestyle-spaces-terraform-state-070561229936`
- **DynamoDB Table**: `lifestyle-spaces-terraform-locks`
- **State Paths**:
  - Dev: `lifestyle-spaces/dev/terraform.tfstate`
  - Prod: `lifestyle-spaces/prod/terraform.tfstate`

### Lambda Configuration
- **Runtime**: Python 3.11
- **Handler**: `lambda_handler.handler`
- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Environment Variables**:
  - `ENVIRONMENT`: dev/prod
  - `DYNAMODB_TABLE_NAME`: Auto-generated table name
  - `CORS_ORIGINS`: Configured per environment

### API Gateway
- **Type**: REST API with proxy integration
- **Stage**: Matches environment name (dev/prod)
- **CORS**: Configured in Lambda function
- **Deployment**: Automatic with triggers for updates

## Outputs

After deployment, Terraform provides these key outputs:

```bash
# View all outputs
terraform output

# Key outputs include:
api_gateway_url           # API Gateway URL
api_gateway_invoke_url    # Full invoke URL
website_url              # CloudFront URL
s3_bucket_name           # S3 bucket name
lambda_function_name     # Lambda function name
dynamodb_table_name      # DynamoDB table name
```

## Troubleshooting

### Common Issues

1. **Backend bucket doesn't exist**:
   ```bash
   ./setup-backend.sh
   ```

2. **Lambda handler error**:
   - Ensure `lambda-placeholder.zip` exists in `backend/` directory
   - Handler is configured as `lambda_handler.handler`

3. **API Gateway not accessible**:
   - Check deployment and stage configuration
   - Verify Lambda permissions

4. **State locking issues**:
   - Ensure DynamoDB table exists
   - Check AWS credentials and permissions

### Validation Commands

```bash
# Validate configuration
terraform validate

# Check plan
terraform plan

# Format files
terraform fmt -recursive

# Check costs (if infracost installed)
make check-costs ENV=dev

# Security scan (if tfsec installed)
make security-scan
```

## Cost Optimization

### Development
- DynamoDB: On-demand pricing
- Lambda: Pay per request
- S3: Standard storage
- CloudFront: PriceClass_100
- WAF: Disabled
- Logs: 7-day retention

### Production
- Enhanced security features
- Extended log retention
- Global CloudFront distribution
- Data protection features enabled

## CI/CD Integration

The configuration is designed to work with GitHub Actions:

```yaml
# Example workflow step
- name: Terraform Plan
  run: |
    cd terraform/environments/dev
    terraform plan

- name: Terraform Apply
  run: |
    cd terraform/environments/dev
    terraform apply -auto-approve
```

## Security Considerations

1. **State File Security**: Stored in encrypted S3 bucket
2. **IAM Least Privilege**: Minimal required permissions
3. **Encryption**: At rest and in transit
4. **Network Security**: WAF rules in production
5. **Access Control**: GitHub Actions OIDC integration

## Next Steps

After successful deployment:

1. Update frontend environment variables with API Gateway URL
2. Deploy application code to Lambda function
3. Upload frontend build to S3 bucket
4. Configure custom domain (if needed)
5. Set up monitoring and alerting
6. Configure backup and disaster recovery

For ongoing management, use the provided Makefile commands or the scripts for common operations.