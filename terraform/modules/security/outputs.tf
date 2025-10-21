# Security Module Outputs

output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions IAM role"
  value       = aws_iam_role.github_actions.arn
}

output "github_actions_role_name" {
  description = "Name of the GitHub Actions IAM role"
  value       = aws_iam_role.github_actions.name
}

output "lambda_security_policy_arn" {
  description = "ARN of the Lambda security policy"
  value       = var.create_lambda_security_policy ? aws_iam_policy.lambda_security[0].arn : null
}

output "waf_web_acl_id" {
  description = "ID of the WAF Web ACL"
  value       = var.create_waf ? aws_wafv2_web_acl.main[0].id : null
}

output "waf_web_acl_arn" {
  description = "ARN of the WAF Web ACL"
  value       = var.create_waf ? aws_wafv2_web_acl.main[0].arn : null
}