# Terraform Specialist - Lifestyle Spaces Project Instructions

## Project-Specific Requirements

### Infrastructure Philosophy
- **Infrastructure as Code ONLY** - No manual AWS Console changes
- **Cost optimization for POC** - Minimal resources, no redundancy
- **Security-first design** - Least privilege, encryption everywhere
- **Single region deployment** - us-east-1 for POC

### Terraform Structure
```
terraform/
├── modules/
│   ├── frontend/          # S3 + CloudFront
│   ├── backend/           # Lambda + API Gateway
│   ├── database/          # DynamoDB
│   └── security/          # IAM roles and policies
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── terraform.tfvars
│   └── prod/
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── terraform.tfvars
└── backend.tf             # S3 backend configuration
```

### Backend Configuration
```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "lifestyle-spaces-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

### Module: Frontend Infrastructure
```hcl
# modules/frontend/main.tf
resource "aws_s3_bucket" "frontend" {
  bucket = "${var.project_name}-${var.environment}-frontend"
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_identity" "oai" {
  comment = "${var.project_name}-${var.environment}-oai"
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled    = true
  default_root_object = "index.html"
  price_class        = "PriceClass_100"  # POC cost optimization

  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.frontend.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.frontend.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
```

### Module: Backend Infrastructure
```hcl
# modules/backend/main.tf
resource "aws_lambda_function" "api" {
  function_name = "${var.project_name}-${var.environment}-api"
  role         = aws_iam_role.lambda_exec.arn
  handler      = "lambda_handler.handler"
  runtime      = "python3.11"
  timeout      = 30
  memory_size  = 512  # Start small for POC

  environment {
    variables = {
      ENVIRONMENT     = var.environment
      DYNAMODB_TABLE = var.dynamodb_table_name
      CORS_ORIGINS   = var.cors_origins
    }
  }

  # Placeholder for deployment package
  filename = "lambda_placeholder.zip"
  
  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

resource "aws_api_gateway_rest_api" "api" {
  name = "${var.project_name}-${var.environment}-api"
  
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"  # Add Cognito later
}

resource "aws_api_gateway_integration" "lambda" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.proxy.resource_id
  http_method = aws_api_gateway_method.proxy.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.api.invoke_arn
}
```

### Module: Database Infrastructure
```hcl
# modules/database/main.tf
resource "aws_dynamodb_table" "main" {
  name           = "${var.project_name}-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"  # POC cost optimization
  hash_key       = "PK"
  range_key      = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = false  # POC cost optimization
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}
```

### IAM Policies (Least Privilege)
```hcl
# modules/security/lambda_role.tf
resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-${var.environment}-lambda-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_dynamodb" {
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.main.arn,
          "${aws_dynamodb_table.main.arn}/index/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_ssm" {
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = "arn:aws:ssm:${var.region}:${var.account_id}:parameter/lifestyle-spaces/${var.environment}/*"
      }
    ]
  })
}
```

### Environment Variables
```hcl
# environments/dev/terraform.tfvars
project_name = "lifestyle-spaces"
environment  = "dev"
region       = "us-east-1"

# Cost optimization settings
lambda_memory_size = 512
lambda_timeout     = 30
enable_monitoring  = false
enable_alarms      = false
```

### Cost Optimization Configurations
```hcl
# Cost-saving defaults
variable "cost_optimization" {
  default = {
    cloudfront_price_class        = "PriceClass_100"
    lambda_reserved_concurrency   = null  # No reserved concurrency
    dynamodb_billing_mode         = "PAY_PER_REQUEST"
    enable_point_in_time_recovery = false
    enable_cloudwatch_alarms      = false
    s3_lifecycle_days            = 7
  }
}
```

### Outputs for GitHub Actions
```hcl
# environments/dev/outputs.tf
output "s3_bucket_name" {
  value = module.frontend.s3_bucket_name
}

output "cloudfront_distribution_id" {
  value = module.frontend.cloudfront_distribution_id
}

output "api_gateway_url" {
  value = module.backend.api_gateway_url
}

output "lambda_function_name" {
  value = module.backend.lambda_function_name
}

output "dynamodb_table_name" {
  value = module.database.table_name
}
```

### GitHub Actions IAM Policy
```hcl
resource "aws_iam_policy" "github_actions" {
  name = "${var.project_name}-github-actions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.project_name}-*/*",
          "arn:aws:s3:::${var.project_name}-*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:UpdateFunctionCode",
          "lambda:GetFunction"
        ]
        Resource = "arn:aws:lambda:*:*:function:${var.project_name}-*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation"
        ]
        Resource = "*"
      }
    ]
  })
}
```

### Terraform Commands
```bash
# Initialize
terraform init

# Plan changes
terraform plan -var-file=terraform.tfvars -out=tfplan

# Apply changes
terraform apply tfplan

# Destroy (only for dev cleanup)
terraform destroy -var-file=terraform.tfvars
```

### State Management
- Use S3 backend with encryption
- Enable state locking with DynamoDB
- Separate state files per environment
- Regular state backups

### Security Checklist
- [ ] S3 buckets private with OAI
- [ ] Lambda with least privilege IAM
- [ ] DynamoDB encryption enabled
- [ ] API Gateway with rate limiting
- [ ] Secrets in Parameter Store
- [ ] No hardcoded credentials
- [ ] CloudFront security headers
- [ ] VPC not required for POC

### Cost Monitoring
```hcl
# Optional: Basic cost alert (only if needed)
resource "aws_budgets_budget" "poc" {
  count = var.enable_cost_alerts ? 1 : 0
  
  name         = "${var.project_name}-poc-budget"
  budget_type  = "COST"
  limit_amount = "50"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
}
```

## Critical Reminders
- **NO manual AWS Console changes**
- **NO production changes without plan review**
- **NO over-provisioning for POC**
- **ALWAYS use least privilege IAM**
- **ALWAYS encrypt sensitive data**
- **COORDINATE resource names with other agents**