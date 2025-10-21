# Terraform Backend Configuration for Remote State
# This file configures S3 backend for storing Terraform state remotely

# Instructions for setting up the backend:
#
# 1. Create an S3 bucket for Terraform state:
#    aws s3 mb s3://your-terraform-state-bucket-name --region us-east-1
#
# 2. Enable versioning on the bucket:
#    aws s3api put-bucket-versioning \
#      --bucket your-terraform-state-bucket-name \
#      --versioning-configuration Status=Enabled
#
# 3. Create a DynamoDB table for state locking:
#    aws dynamodb create-table \
#      --table-name terraform-state-locks \
#      --attribute-definitions AttributeName=LockID,AttributeType=S \
#      --key-schema AttributeName=LockID,KeyType=HASH \
#      --billing-mode PAY_PER_REQUEST \
#      --region us-east-1
#
# 4. Initialize Terraform with backend configuration:
#    terraform init -backend-config="backend-config.hcl"
#
# 5. Or use the configuration below directly in terraform block

# Example backend configuration - uncomment and modify as needed:
#
# terraform {
#   backend "s3" {
#     bucket         = "your-terraform-state-bucket-name"
#     key            = "lifestyle-spaces/dev/terraform.tfstate"
#     region         = "us-east-1"
#     dynamodb_table = "terraform-state-locks"
#     encrypt        = true
#   }
# }

# Alternative: Create a backend-config.hcl file with these contents:
# bucket         = "your-terraform-state-bucket-name"
# key            = "lifestyle-spaces/dev/terraform.tfstate" 
# region         = "us-east-1"
# dynamodb_table = "terraform-state-locks"
# encrypt        = true
#
# Then run: terraform init -backend-config="backend-config.hcl"

# Backend Configuration Template for different environments:

# Development
# key = "lifestyle-spaces/dev/terraform.tfstate"

# Staging  
# key = "lifestyle-spaces/staging/terraform.tfstate"

# Production
# key = "lifestyle-spaces/prod/terraform.tfstate"

# Security Best Practices for Backend:
# - Use a dedicated AWS account for Terraform state if possible
# - Enable MFA delete on the S3 bucket
# - Restrict access to the S3 bucket and DynamoDB table
# - Enable AWS CloudTrail for audit logging
# - Consider using AWS S3 bucket policy for additional security

# Example S3 Bucket Policy for Terraform State (apply to your state bucket):
#
# {
#   "Version": "2012-10-17",
#   "Statement": [
#     {
#       "Sid": "DenyInsecureConnections",
#       "Effect": "Deny",
#       "Principal": "*",
#       "Action": "s3:*",
#       "Resource": [
#         "arn:aws:s3:::your-terraform-state-bucket-name",
#         "arn:aws:s3:::your-terraform-state-bucket-name/*"
#       ],
#       "Condition": {
#         "Bool": {
#           "aws:SecureTransport": "false"
#         }
#       }
#     }
#   ]
# }