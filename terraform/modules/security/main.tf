# Security Module - IAM Roles and Policies
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}

# Data source for current AWS region
data "aws_region" "current" {}

# IAM Role for GitHub Actions
resource "aws_iam_role" "github_actions" {
  name = "${var.project_name}-${var.environment}-github-actions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:*"
          }
        }
      }
    ]
  })

  tags = var.tags
}

# IAM Policy for GitHub Actions - S3 deployment
resource "aws_iam_policy" "github_actions_s3" {
  name        = "${var.project_name}-${var.environment}-github-actions-s3-policy"
  description = "Policy for GitHub Actions to deploy to S3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.s3_bucket_arn,
          "${var.s3_bucket_arn}/*"
        ]
      }
    ]
  })

  tags = var.tags
}

# IAM Policy for GitHub Actions - CloudFront invalidation
resource "aws_iam_policy" "github_actions_cloudfront" {
  name        = "${var.project_name}-${var.environment}-github-actions-cloudfront-policy"
  description = "Policy for GitHub Actions to invalidate CloudFront"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation",
          "cloudfront:ListInvalidations"
        ]
        Resource = var.cloudfront_distribution_arn
      }
    ]
  })

  tags = var.tags
}

# IAM Policy for GitHub Actions - Lambda deployment
resource "aws_iam_policy" "github_actions_lambda" {
  name        = "${var.project_name}-${var.environment}-github-actions-lambda-policy"
  description = "Policy for GitHub Actions to deploy Lambda functions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:GetFunction",
          "lambda:PublishVersion"
        ]
        Resource = var.lambda_function_arn
      }
    ]
  })

  tags = var.tags
}

# Attach policies to GitHub Actions role
resource "aws_iam_role_policy_attachment" "github_actions_s3" {
  policy_arn = aws_iam_policy.github_actions_s3.arn
  role       = aws_iam_role.github_actions.name
}

resource "aws_iam_role_policy_attachment" "github_actions_cloudfront" {
  policy_arn = aws_iam_policy.github_actions_cloudfront.arn
  role       = aws_iam_role.github_actions.name
}

resource "aws_iam_role_policy_attachment" "github_actions_lambda" {
  policy_arn = aws_iam_policy.github_actions_lambda.arn
  role       = aws_iam_role.github_actions.name
}

# IAM Role for Lambda execution (additional security policies)
resource "aws_iam_policy" "lambda_security" {
  count       = var.create_lambda_security_policy ? 1 : 0
  name        = "${var.project_name}-${var.environment}-lambda-security-policy"
  description = "Additional security policy for Lambda function"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${var.environment}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "arn:aws:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:${var.project_name}/${var.environment}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = "arn:aws:kms:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:key/*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = [
              "secretsmanager.${data.aws_region.current.name}.amazonaws.com",
              "ssm.${data.aws_region.current.name}.amazonaws.com"
            ]
          }
        }
      }
    ]
  })

  tags = var.tags
}

# Attach additional security policy to Lambda role (if created)
resource "aws_iam_role_policy_attachment" "lambda_security" {
  count      = var.create_lambda_security_policy ? 1 : 0
  policy_arn = aws_iam_policy.lambda_security[0].arn
  role       = var.lambda_role_name
}

# WAF Web ACL for additional security (optional for POC)
resource "aws_wafv2_web_acl" "main" {
  count = var.create_waf ? 1 : 0
  name  = "${var.project_name}-${var.environment}-web-acl"
  scope = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = false  # Cost optimization
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = false  # Cost optimization
    }
  }

  # AWS Managed Rules - Core Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    override_action {
      none {}
    }

    visibility_config {
      cloudwatch_metrics_enabled = false  # Cost optimization
      metric_name                = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = false  # Cost optimization
    }
  }

  tags = var.tags

  visibility_config {
    cloudwatch_metrics_enabled = false  # Cost optimization
    metric_name                = "${var.project_name}-${var.environment}-web-acl"
    sampled_requests_enabled   = false  # Cost optimization
  }
}