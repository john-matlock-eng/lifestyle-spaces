# Development Environment Variables

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "lifestyle-spaces"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "github_repository" {
  description = "GitHub repository in the format 'owner/repo'"
  type        = string
  default     = "your-org/lifestyle-spaces" # Update this with your actual repository
}

# Database Configuration
variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for DynamoDB table"
  type        = bool
  default     = false # Disabled for cost optimization in dev
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for DynamoDB table"
  type        = bool
  default     = false # Disabled for flexibility in dev
}

variable "create_health_check_item" {
  description = "Create a health check item in the DynamoDB table"
  type        = bool
  default     = true
}

# Backend Configuration
variable "cors_origins" {
  description = "CORS origins for the API"
  type        = string
  default     = "*" # Permissive for dev, should be restrictive in prod
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 7 # Short retention for cost optimization
}

variable "jwt_secret_key" {
  description = "JWT secret key for token signing (use a strong secret in production)"
  type        = string
  sensitive   = true
  default     = "dev-secret-key-change-in-production-please"
}

# Frontend Configuration
variable "enable_s3_versioning" {
  description = "Enable S3 bucket versioning"
  type        = bool
  default     = false # Disabled for cost optimization in dev
}

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100" # Cheapest option for dev
  validation {
    condition = contains([
      "PriceClass_All",
      "PriceClass_200",
      "PriceClass_100"
    ], var.cloudfront_price_class)
    error_message = "CloudFront price class must be PriceClass_All, PriceClass_200, or PriceClass_100."
  }
}

# Security Configuration
variable "create_lambda_security_policy" {
  description = "Create additional security policy for Lambda"
  type        = bool
  default     = true
}

variable "create_waf" {
  description = "Create WAF Web ACL for additional security"
  type        = bool
  default     = false # Disabled for cost optimization in dev
}

variable "waf_rate_limit" {
  description = "Rate limit for WAF (requests per 5-minute period)"
  type        = number
  default     = 10000
}

# Cognito Configuration
variable "cognito_password_minimum_length" {
  description = "Minimum length of passwords for Cognito"
  type        = number
  default     = 8
}

variable "cognito_password_require_lowercase" {
  description = "Require lowercase characters in Cognito passwords"
  type        = bool
  default     = true
}

variable "cognito_password_require_numbers" {
  description = "Require numbers in Cognito passwords"
  type        = bool
  default     = true
}

variable "cognito_password_require_symbols" {
  description = "Require symbols in Cognito passwords"
  type        = bool
  default     = false # Disabled for better UX in POC
}

variable "cognito_password_require_uppercase" {
  description = "Require uppercase characters in Cognito passwords"
  type        = bool
  default     = true
}

variable "cognito_temporary_password_validity_days" {
  description = "Number of days temporary passwords are valid in Cognito"
  type        = number
  default     = 7
}

variable "cognito_access_token_validity_minutes" {
  description = "Access token validity in minutes for Cognito"
  type        = number
  default     = 60 # 1 hour for dev
}

variable "cognito_id_token_validity_minutes" {
  description = "ID token validity in minutes for Cognito"
  type        = number
  default     = 60 # 1 hour for dev
}

variable "cognito_refresh_token_validity_days" {
  description = "Refresh token validity in days for Cognito"
  type        = number
  default     = 30 # 30 days for dev
}

variable "cognito_callback_urls" {
  description = "List of allowed callback URLs for Cognito OAuth"
  type        = list(string)
  default     = ["http://localhost:3000", "https://localhost:3000"] # Dev-friendly defaults
}

variable "cognito_logout_urls" {
  description = "List of allowed logout URLs for Cognito OAuth"
  type        = list(string)
  default     = ["http://localhost:3000", "https://localhost:3000"] # Dev-friendly defaults
}

variable "cognito_create_domain" {
  description = "Create a Cognito domain for hosted UI"
  type        = bool
  default     = false # Disabled for POC to reduce complexity
}