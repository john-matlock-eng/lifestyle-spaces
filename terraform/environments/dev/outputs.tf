# Development Environment Outputs

# Database Outputs
output "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  value       = module.database.dynamodb_table_name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table"
  value       = module.database.dynamodb_table_arn
}

# Backend Outputs
output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = module.backend.lambda_function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = module.backend.lambda_function_arn
}

output "api_gateway_url" {
  description = "URL of the API Gateway"
  value       = module.backend.api_gateway_url
}

output "api_gateway_id" {
  description = "ID of the API Gateway"
  value       = module.backend.api_gateway_id
}

# Frontend Outputs
output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = module.frontend.s3_bucket_name
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = module.frontend.s3_bucket_arn
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = module.frontend.cloudfront_distribution_id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = module.frontend.cloudfront_domain_name
}

output "website_url" {
  description = "URL of the website"
  value       = module.frontend.website_url
}

# Security Outputs
output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions IAM role"
  value       = module.security.github_actions_role_arn
}

output "waf_web_acl_id" {
  description = "ID of the WAF Web ACL (if created)"
  value       = module.security.waf_web_acl_id
}

# Cognito Outputs
output "cognito_user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = module.cognito.user_pool_id
}

output "cognito_user_pool_client_id" {
  description = "ID of the Cognito User Pool Client"
  value       = module.cognito.user_pool_client_id
}

output "cognito_user_pool_arn" {
  description = "ARN of the Cognito User Pool"
  value       = module.cognito.user_pool_arn
}

output "cognito_config" {
  description = "Complete Cognito configuration for frontend use"
  value       = module.cognito.cognito_config
}

# Useful Information for Developers
# Additional API Gateway Outputs
output "api_gateway_stage_name" {
  description = "Stage name of the API Gateway deployment"
  value       = module.backend.api_gateway_stage_name
}

output "api_gateway_invoke_url" {
  description = "Full invoke URL for the API Gateway"
  value       = module.backend.api_gateway_invoke_url
}

# Additional Frontend Outputs
output "cloudfront_distribution_domain" {
  description = "CloudFront distribution domain name (AWS-generated URL)"
  value       = module.frontend.cloudfront_distribution_domain
}

output "cloudfront_distribution_status" {
  description = "Status of the CloudFront distribution"
  value       = module.frontend.cloudfront_distribution_status
}

output "deployment_info" {
  description = "Important deployment information"
  value = {
    # Website URLs
    website_url       = module.frontend.website_url
    cloudfront_domain = module.frontend.cloudfront_distribution_domain

    # API URLs
    api_url        = module.backend.api_gateway_url
    api_invoke_url = module.backend.api_gateway_invoke_url
    api_stage      = module.backend.api_gateway_stage_name

    # Authentication
    cognito_user_pool_id = module.cognito.user_pool_id
    cognito_client_id    = module.cognito.user_pool_client_id
    cognito_config       = module.cognito.cognito_config

    # Resource Names for Deployment
    s3_bucket_name       = module.frontend.s3_bucket_name
    cloudfront_id        = module.frontend.cloudfront_distribution_id
    lambda_function_name = module.backend.lambda_function_name
    api_gateway_id       = module.backend.api_gateway_id
    dynamodb_table_name  = module.database.dynamodb_table_name

    # Security
    github_actions_role_arn = module.security.github_actions_role_arn
  }
}