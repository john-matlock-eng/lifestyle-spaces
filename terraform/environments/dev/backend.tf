# Backend configuration for Development environment
# This file configures S3 backend for storing Terraform state remotely

terraform {
  backend "s3" {
    bucket         = "lifestyle-spaces-terraform-state-070561229936"
    key            = "lifestyle-spaces/dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "lifestyle-spaces-terraform-locks"
    encrypt        = true
    
    # Using AWS managed encryption (AES256) for cost optimization in POC
    # Custom KMS key not required for development environment
  }
}

# Note: Before running terraform init, ensure the S3 bucket and DynamoDB table exist:
#
# 1. Create S3 bucket:
#    aws s3 mb s3://lifestyle-spaces-terraform-state-070561229936 --region us-east-1
#
# 2. Enable versioning:
#    aws s3api put-bucket-versioning \
#      --bucket lifestyle-spaces-terraform-state-070561229936 \
#      --versioning-configuration Status=Enabled
#
# 3. Enable server-side encryption:
#    aws s3api put-bucket-encryption \
#      --bucket lifestyle-spaces-terraform-state-070561229936 \
#      --server-side-encryption-configuration '{
#        "Rules": [
#          {
#            "ApplyServerSideEncryptionByDefault": {
#              "SSEAlgorithm": "AES256"
#            }
#          }
#        ]
#      }'
#
# 4. Create DynamoDB table:
#    aws dynamodb create-table \
#      --table-name lifestyle-spaces-terraform-locks \
#      --attribute-definitions AttributeName=LockID,AttributeType=S \
#      --key-schema AttributeName=LockID,KeyType=HASH \
#      --billing-mode PAY_PER_REQUEST \
#      --region us-east-1