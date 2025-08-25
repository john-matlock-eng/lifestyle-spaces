# Production Environment Main Configuration
terraform {
  required_version = ">= 1.5"

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

  # Backend configuration is in backend.tf
}

# Configure AWS Provider
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      Repository  = var.github_repository
    }
  }
}

# Configure Random Provider
provider "random" {}

# Local values for common configurations
locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Repository  = var.github_repository
  }

  lambda_zip_path = "${path.root}/../../../backend/lambda-placeholder.zip"
}

# Database Module
module "database" {
  source = "../../modules/database"

  project_name                  = var.project_name
  environment                   = var.environment
  enable_point_in_time_recovery = var.enable_point_in_time_recovery
  enable_deletion_protection    = var.enable_deletion_protection
  create_health_check_item      = var.create_health_check_item

  tags = local.common_tags
}

# Backend Module
module "backend" {
  source = "../../modules/backend"

  project_name        = var.project_name
  environment         = var.environment
  region              = var.aws_region
  lambda_zip_path     = local.lambda_zip_path
  dynamodb_table_name = module.database.dynamodb_table_name
  dynamodb_table_arn  = module.database.dynamodb_table_arn
  cors_origins        = var.cors_origins
  log_retention_days  = var.log_retention_days

  tags = local.common_tags

  depends_on = [module.database]
}

# Frontend Module
module "frontend" {
  source = "../../modules/frontend"

  project_name           = var.project_name
  environment            = var.environment
  region                 = var.aws_region
  api_gateway_url        = module.backend.api_gateway_url
  enable_versioning      = var.enable_s3_versioning
  cloudfront_price_class = var.cloudfront_price_class

  tags = local.common_tags

  depends_on = [module.backend]
}

# Cognito Module
module "cognito" {
  source = "../../modules/cognito"

  project_name                     = var.project_name
  environment                      = var.environment
  password_minimum_length          = var.cognito_password_minimum_length
  password_require_lowercase       = var.cognito_password_require_lowercase
  password_require_numbers         = var.cognito_password_require_numbers
  password_require_symbols         = var.cognito_password_require_symbols
  password_require_uppercase       = var.cognito_password_require_uppercase
  temporary_password_validity_days = var.cognito_temporary_password_validity_days
  access_token_validity_minutes    = var.cognito_access_token_validity_minutes
  id_token_validity_minutes        = var.cognito_id_token_validity_minutes
  refresh_token_validity_days      = var.cognito_refresh_token_validity_days
  callback_urls                    = var.cognito_callback_urls
  logout_urls                      = var.cognito_logout_urls
  create_domain                    = var.cognito_create_domain

  tags = local.common_tags
}

# Security Module
module "security" {
  source = "../../modules/security"

  project_name                  = var.project_name
  environment                   = var.environment
  github_repository             = var.github_repository
  s3_bucket_arn                 = module.frontend.s3_bucket_arn
  cloudfront_distribution_arn   = module.frontend.cloudfront_distribution_arn
  lambda_function_arn           = module.backend.lambda_function_arn
  lambda_role_name              = split("/", module.backend.lambda_role_arn)[1]
  create_lambda_security_policy = var.create_lambda_security_policy
  create_waf                    = var.create_waf
  waf_rate_limit                = var.waf_rate_limit

  tags = local.common_tags

  depends_on = [module.frontend, module.backend]
}