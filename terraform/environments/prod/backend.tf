# Backend configuration for Production environment
# This file configures S3 backend for storing Terraform state remotely

terraform {
  backend "s3" {
    bucket         = "lifestyle-spaces-terraform-state-070561229936"
    key            = "lifestyle-spaces/prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "lifestyle-spaces-terraform-locks"
    encrypt        = true
    
    # Using AWS managed encryption (AES256) for cost optimization in POC
    # Custom KMS key not required for production environment
  }
}

# Note: The S3 bucket and DynamoDB table are shared between environments
# but each environment uses a different state file key path for isolation.
# 
# State file locations:
# - Dev: lifestyle-spaces/dev/terraform.tfstate
# - Prod: lifestyle-spaces/prod/terraform.tfstate
#
# This ensures complete isolation between environments while using
# the same backend infrastructure for cost optimization.