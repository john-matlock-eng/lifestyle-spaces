# Lifestyle Spaces - Terraform Infrastructure

This directory contains the Terraform infrastructure as code for the Lifestyle Spaces project.

## Structure

```
terraform/
├── modules/
│   ├── frontend/          # S3 + CloudFront for static website
│   ├── backend/           # Lambda + API Gateway for API
│   ├── database/          # DynamoDB single table design
│   └── security/          # IAM roles and policies
├── environments/
│   └── dev/               # Development environment
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── terraform.tfvars
└── backend.tf             # S3 backend configuration guide
```

## Prerequisites

1. **AWS CLI configured** with appropriate credentials
2. **Terraform >= 1.5** installed
3. **S3 bucket** for remote state storage
4. **DynamoDB table** for state locking

## Backend Setup (One-time setup)

1. Create S3 bucket for Terraform state:
```bash
aws s3 mb s3://your-terraform-state-bucket-name --region us-east-1
aws s3api put-bucket-versioning \
  --bucket your-terraform-state-bucket-name \
  --versioning-configuration Status=Enabled
```

2. Create DynamoDB table for state locking:
```bash
aws dynamodb create-table \
  --table-name terraform-state-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

3. Create backend config file:
```bash
# Create backend-config.hcl
cat > backend-config.hcl << EOF
bucket         = "your-terraform-state-bucket-name"
key            = "lifestyle-spaces/dev/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "terraform-state-locks"
encrypt        = true
EOF
```

## Deployment

### Development Environment

1. **Navigate to dev environment:**
```bash
cd terraform/environments/dev
```

2. **Update variables:**
```bash
# Edit terraform.tfvars with your specific values
vim terraform.tfvars
```

3. **Initialize Terraform:**
```bash
terraform init -backend-config="../../backend-config.hcl"
```

4. **Plan deployment:**
```bash
terraform plan
```

5. **Apply changes:**
```bash
terraform apply
```

### Important Notes

- **Cost Optimization**: Configuration is optimized for POC with minimal costs
- **Security**: Follows security-first design principles
- **Single Region**: Deployed to us-east-1 for simplicity
- **DynamoDB**: Uses PAY_PER_REQUEST billing for cost optimization
- **Lambda**: No provisioned concurrency to avoid costs
- **CloudFront**: Uses PriceClass_100 for cost optimization

## Outputs

After deployment, Terraform will output:

- **Website URL**: CloudFront distribution URL
- **API URL**: API Gateway URL
- **S3 Bucket**: Frontend static files bucket
- **DynamoDB Table**: Single table for all data
- **GitHub Actions Role**: IAM role for CI/CD

## GitHub Actions Integration

The security module creates an IAM role for GitHub Actions with permissions to:

- Deploy frontend static files to S3
- Update Lambda function code
- Invalidate CloudFront cache

Configure GitHub Actions secrets with:
- `AWS_REGION`: us-east-1
- `AWS_ROLE_ARN`: Output from terraform (github_actions_role_arn)

## Modules Documentation

### Frontend Module
- Creates S3 bucket with encryption and lifecycle policies
- Sets up CloudFront distribution with OAC
- Configures proper caching for SPA applications
- Cost-optimized with PriceClass_100

### Backend Module
- Creates Lambda function with FastAPI runtime
- Sets up API Gateway with proxy integration
- Configures IAM roles with least privilege
- Enables CloudWatch logging with short retention

### Database Module
- Creates DynamoDB table with single table design
- Supports composite keys (PK, SK) and GSIs
- Enables TTL for automatic data expiration
- Uses PAY_PER_REQUEST for cost optimization

### Security Module
- Creates GitHub Actions OIDC role
- Sets up minimal required permissions
- Optional WAF configuration (disabled for POC)
- Supports AWS Secrets Manager integration

## Troubleshooting

### Common Issues

1. **Backend bucket doesn't exist**: Create the S3 bucket first
2. **State locking fails**: Create the DynamoDB table
3. **Permission denied**: Check AWS credentials and IAM permissions
4. **Lambda deployment fails**: Ensure lambda-placeholder.zip exists

### Useful Commands

```bash
# Check Terraform version
terraform version

# Validate configuration
terraform validate

# Format code
terraform fmt -recursive

# Show state
terraform show

# List resources
terraform state list

# Import existing resources
terraform import <resource> <id>
```

## Cost Estimation

Estimated monthly costs for dev environment (us-east-1):

- **DynamoDB**: ~$0-5 (PAY_PER_REQUEST, minimal usage)
- **Lambda**: ~$0-2 (first 1M requests free)
- **API Gateway**: ~$0-5 (first 1M requests $3.50)
- **S3**: ~$0-1 (minimal storage)
- **CloudFront**: ~$0-5 (first 1TB free tier)

**Total**: ~$0-15/month for low usage development environment