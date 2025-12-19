# Secrets Manager for Claude API Key
resource "aws_secretsmanager_secret" "claude_api_key" {
  name        = "${var.project_name}/${var.environment}/claude-api-key"
  description = "Claude LLM API Key for journal AI features"

  # Lifecycle policy to ignore changes to secret value
  # This allows manual updates through AWS Console or CLI without Terraform overwriting
  lifecycle {
    ignore_changes = [
      name_prefix,
    ]
  }

  tags = merge(
    var.tags,
    {
      Name      = "Claude API Key"
      Purpose   = "LLM Integration"
      ManagedBy = "Terraform"
      UpdatedBy = "Manual"
    }
  )
}

# Secrets Manager for Pinecone API Key
# Import existing secret: terraform import module.backend.aws_secretsmanager_secret.pinecone_api_key lifestyle-spaces/pinecone-api-key
import {
  to = aws_secretsmanager_secret.pinecone_api_key
  id = "lifestyle-spaces/pinecone-api-key"
}

resource "aws_secretsmanager_secret" "pinecone_api_key" {
  name        = "${var.project_name}/pinecone-api-key"
  description = "Pinecone API Key for vector search"

  lifecycle {
    ignore_changes = [
      name_prefix,
      description,
      tags,
    ]
  }

  tags = merge(
    var.tags,
    {
      Name      = "Pinecone API Key"
      Purpose   = "Vector Search"
      ManagedBy = "Terraform"
      UpdatedBy = "Manual"
    }
  )
}

# Placeholder secret value (to be manually updated after creation)
resource "aws_secretsmanager_secret_version" "claude_api_key" {
  secret_id = aws_secretsmanager_secret.claude_api_key.id
  secret_string = jsonencode({
    api_key = "PLACEHOLDER_UPDATE_MANUALLY"
  })

  # Lifecycle policy to ignore changes to secret value
  # This prevents Terraform from reverting manual updates
  lifecycle {
    ignore_changes = [
      secret_string,
      version_stages,
    ]
  }
}

# Note: Pinecone secret version is managed manually, not by Terraform
# The secret was created manually and imported into Terraform state

# IAM Policy for Lambda to access secrets
resource "aws_iam_policy" "lambda_secrets_policy" {
  name        = "${var.project_name}-${var.environment}-lambda-secrets-policy"
  description = "IAM policy for Lambda to access Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.claude_api_key.arn,
          aws_secretsmanager_secret.pinecone_api_key.arn
        ]
      }
    ]
  })

  tags = var.tags
}

# Attach secrets policy to Lambda role
resource "aws_iam_role_policy_attachment" "lambda_secrets" {
  policy_arn = aws_iam_policy.lambda_secrets_policy.arn
  role       = aws_iam_role.lambda_role.name
}
