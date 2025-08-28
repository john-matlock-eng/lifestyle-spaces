# Cognito Module - User Authentication
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.4"
    }
  }
}

# Data source for current AWS region
data "aws_region" "current" {}

# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.environment}-user-pool"

  # Allow self sign-up
  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  # Auto-verified attributes (none for POC as per requirements)
  auto_verified_attributes = []

  # Username configuration - allow email as username
  username_attributes = ["email"]

  # Username configuration
  username_configuration {
    case_sensitive = false
  }

  # Password policy
  password_policy {
    minimum_length                   = var.password_minimum_length
    require_lowercase                = var.password_require_lowercase
    require_numbers                  = var.password_require_numbers
    require_symbols                  = var.password_require_symbols
    require_uppercase                = var.password_require_uppercase
    temporary_password_validity_days = var.temporary_password_validity_days
  }

  # Custom attributes for userId and username
  schema {
    attribute_data_type      = "String"
    name                     = "userId"
    required                 = false
    mutable                  = true
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    attribute_data_type      = "String"
    name                     = "username"
    required                 = false
    mutable                  = true
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 1
      max_length = 128
    }
  }

  schema {
    attribute_data_type      = "String"
    name                     = "displayName"
    required                 = false
    mutable                  = true
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  # Email configuration (no verification for POC)
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Verification message template (disabled for POC)
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_message        = "Your verification code is {####}"
    email_subject        = "Your verification code"
  }

  # MFA configuration (disabled for POC)
  mfa_configuration = "OFF"

  # Device configuration (remember devices disabled for POC)
  device_configuration {
    challenge_required_on_new_device      = false
    device_only_remembered_on_user_prompt = false
  }

  # Account recovery setting
  account_recovery_setting {
    recovery_mechanism {
      name     = "admin_only"
      priority = 1
    }
  }

  # Lambda triggers for auto-confirmation
  lambda_config {
    pre_sign_up = aws_lambda_function.pre_signup.arn
  }

  tags = var.tags

  lifecycle {
    prevent_destroy = true
  }
}

# Cognito User Pool Client (for web application)
resource "aws_cognito_user_pool_client" "web" {
  name         = "${var.project_name}-${var.environment}-web-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # Client settings for SPA (no client secret)
  generate_secret = false

  # OAuth flows
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH" # Allow for development/testing
  ]

  # Token validity periods (POC-optimized)
  access_token_validity  = var.access_token_validity_minutes
  id_token_validity      = var.id_token_validity_minutes
  refresh_token_validity = var.refresh_token_validity_days

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # Prevent user existence errors for security
  prevent_user_existence_errors = "ENABLED"

  # Read and write attributes
  read_attributes = [
    "email",
    "email_verified",
    "custom:userId",
    "custom:username",
    "custom:displayName"
  ]

  write_attributes = [
    "email",
    "custom:userId",
    "custom:username",
    "custom:displayName"
  ]

  # OAuth settings (for future expansion)
  supported_identity_providers = ["COGNITO"]

  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  # Enable SRP protocol
  enable_token_revocation = true

  depends_on = [aws_cognito_user_pool.main]
}

# Cognito User Pool Domain (for hosted UI if needed)
resource "aws_cognito_user_pool_domain" "main" {
  count        = var.create_domain ? 1 : 0
  domain       = "${var.project_name}-${var.environment}-${random_string.domain_suffix[0].result}"
  user_pool_id = aws_cognito_user_pool.main.id

  depends_on = [aws_cognito_user_pool.main]
}

# Random string for domain suffix to ensure uniqueness
resource "random_string" "domain_suffix" {
  count   = var.create_domain ? 1 : 0
  length  = 6
  special = false
  upper   = false
}

# Lambda function for pre-signup auto-confirmation
resource "aws_lambda_function" "pre_signup" {
  filename         = data.archive_file.pre_signup_zip.output_path
  function_name    = "${var.project_name}-${var.environment}-pre-signup"
  role            = aws_iam_role.lambda_role.arn
  handler         = "pre-signup.handler"
  runtime         = "nodejs18.x"
  timeout         = 30

  source_code_hash = data.archive_file.pre_signup_zip.output_base64sha256

  tags = var.tags
}

# Create ZIP file for Lambda function
data "archive_file" "pre_signup_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda/pre-signup.js"
  output_path = "${path.module}/lambda/pre-signup.zip"
}

# IAM role for Lambda function
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-${var.environment}-cognito-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# IAM policy for Lambda function
resource "aws_iam_role_policy" "lambda_policy" {
  name = "${var.project_name}-${var.environment}-cognito-lambda-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${data.aws_region.current.name}:*:*"
      }
    ]
  })
}

# Permission for Cognito to invoke Lambda function
resource "aws_lambda_permission" "cognito_invoke_lambda" {
  statement_id  = "AllowExecutionFromCognito"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pre_signup.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}