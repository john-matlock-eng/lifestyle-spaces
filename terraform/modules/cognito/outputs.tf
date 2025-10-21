# Cognito Module Outputs

output "user_pool_id" {
  description = "The ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  description = "The ARN of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.arn
}

output "user_pool_name" {
  description = "The name of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.name
}

output "user_pool_endpoint" {
  description = "The endpoint of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.endpoint
}

output "user_pool_client_id" {
  description = "The ID of the Cognito User Pool Client"
  value       = aws_cognito_user_pool_client.web.id
}

output "user_pool_client_name" {
  description = "The name of the Cognito User Pool Client"
  value       = aws_cognito_user_pool_client.web.name
}

output "user_pool_domain" {
  description = "The domain of the Cognito User Pool (if created)"
  value       = var.create_domain ? aws_cognito_user_pool_domain.main[0].domain : null
}

output "user_pool_domain_cloudfront_distribution" {
  description = "The CloudFront distribution ARN for the Cognito domain (if created)"
  value       = var.create_domain ? aws_cognito_user_pool_domain.main[0].cloudfront_distribution : null
}

# Useful for frontend configuration
output "cognito_config" {
  description = "Complete Cognito configuration for frontend use"
  value = {
    region           = data.aws_region.current.name
    userPoolId       = aws_cognito_user_pool.main.id
    userPoolClientId = aws_cognito_user_pool_client.web.id
    domain           = var.create_domain ? aws_cognito_user_pool_domain.main[0].domain : null
  }
  sensitive = false
}

# For API Gateway authorizer integration
output "user_pool_authorizer_config" {
  description = "Configuration for API Gateway Cognito authorizer"
  value = {
    user_pool_arn = aws_cognito_user_pool.main.arn
    audience      = [aws_cognito_user_pool_client.web.id]
  }
}