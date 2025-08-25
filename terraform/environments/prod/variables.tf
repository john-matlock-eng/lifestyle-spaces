# Production Environment Variables

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
  default     = "prod"
}

variable "github_repository" {
  description = "GitHub repository in the format 'owner/repo'"
  type        = string
  default     = "your-org/lifestyle-spaces"  # Update this with your actual repository
}

# Database Configuration
variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for DynamoDB table"
  type        = bool
  default     = true  # Enabled for production data protection
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for DynamoDB table"
  type        = bool
  default     = true  # Enabled for production data protection
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
  default     = "https://your-domain.com"  # Should be set to actual domain in prod
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 30  # Longer retention for production
}

# Frontend Configuration
variable "enable_s3_versioning" {
  description = "Enable S3 bucket versioning"
  type        = bool
  default     = true  # Enabled for production rollback capability
}

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_All"  # Best performance for production
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
  default     = true  # Enabled for production security
}

variable "waf_rate_limit" {
  description = "Rate limit for WAF (requests per 5-minute period)"
  type        = number
  default     = 2000  # Lower limit for production protection
}