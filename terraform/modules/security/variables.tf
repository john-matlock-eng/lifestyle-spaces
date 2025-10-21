# Security Module Variables

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
}

variable "github_repository" {
  description = "GitHub repository in the format 'owner/repo'"
  type        = string
}

variable "s3_bucket_arn" {
  description = "ARN of the S3 bucket for frontend"
  type        = string
  default     = ""
}

variable "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution"
  type        = string
  default     = ""
}

variable "lambda_function_arn" {
  description = "ARN of the Lambda function"
  type        = string
  default     = ""
}

variable "lambda_role_name" {
  description = "Name of the Lambda IAM role"
  type        = string
  default     = ""
}

variable "create_lambda_security_policy" {
  description = "Create additional security policy for Lambda"
  type        = bool
  default     = true
}

variable "create_waf" {
  description = "Create WAF Web ACL for additional security"
  type        = bool
  default     = false
}

variable "waf_rate_limit" {
  description = "Rate limit for WAF (requests per 5-minute period)"
  type        = number
  default     = 10000
}

variable "tags" {
  description = "A map of tags to assign to the resources"
  type        = map(string)
  default     = {}
}