#!/bin/bash
# Setup script for Terraform backend infrastructure
# Run this script to create the S3 bucket and DynamoDB table for Terraform state

set -e

# Configuration
BUCKET_NAME="lifestyle-spaces-terraform-state-070561229936"
DYNAMODB_TABLE="lifestyle-spaces-terraform-locks"
REGION="us-east-1"

echo "Setting up Terraform backend infrastructure..."
echo "Bucket: $BUCKET_NAME"
echo "DynamoDB Table: $DYNAMODB_TABLE"
echo "Region: $REGION"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "Error: AWS CLI is not configured or no valid credentials found."
    echo "Please run 'aws configure' first."
    exit 1
fi

# Create S3 bucket
echo "Creating S3 bucket for Terraform state..."
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo "S3 bucket $BUCKET_NAME already exists"
else
    aws s3 mb "s3://$BUCKET_NAME" --region "$REGION"
    echo "S3 bucket $BUCKET_NAME created successfully"
fi

# Enable versioning
echo "Enabling versioning on S3 bucket..."
if aws s3api get-bucket-versioning --bucket "$BUCKET_NAME" | grep -q '"Status": "Enabled"'; then
    echo "Versioning is already enabled on S3 bucket"
else
    aws s3api put-bucket-versioning \
        --bucket "$BUCKET_NAME" \
        --versioning-configuration Status=Enabled
    echo "Versioning enabled on S3 bucket"
fi

# Enable server-side encryption with AWS managed keys
echo "Configuring server-side encryption with AWS managed keys on S3 bucket..."
if aws s3api get-bucket-encryption --bucket "$BUCKET_NAME" > /dev/null 2>&1; then
    echo "Server-side encryption is already configured on S3 bucket"
else
    aws s3api put-bucket-encryption \
        --bucket "$BUCKET_NAME" \
        --server-side-encryption-configuration '{
            "Rules": [
                {
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "aws:kms",
                        "KMSMasterKeyID": "alias/aws/s3"
                    }
                }
            ]
        }'
    echo "Server-side encryption with AWS managed keys enabled on S3 bucket"
fi

# Block public access
echo "Configuring public access block on S3 bucket..."
if aws s3api get-public-access-block --bucket "$BUCKET_NAME" > /dev/null 2>&1; then
    echo "Public access block is already configured on S3 bucket"
else
    aws s3api put-public-access-block \
        --bucket "$BUCKET_NAME" \
        --public-access-block-configuration \
        "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
    echo "Public access blocked on S3 bucket"
fi

# Create DynamoDB table for state locking
echo "Creating DynamoDB table for state locking..."
if aws dynamodb describe-table --table-name "$DYNAMODB_TABLE" --region "$REGION" > /dev/null 2>&1; then
    echo "DynamoDB table $DYNAMODB_TABLE already exists"
else
    aws dynamodb create-table \
        --table-name "$DYNAMODB_TABLE" \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region "$REGION"
    echo "DynamoDB table $DYNAMODB_TABLE created successfully"
    
    # Wait for table to be active
    echo "Waiting for table to be active..."
    aws dynamodb wait table-exists --table-name "$DYNAMODB_TABLE" --region "$REGION"
fi

echo ""
echo "============================================"
echo "Backend infrastructure setup complete!"
echo "============================================"
echo ""
echo "Resources created/verified:"
echo "• S3 Bucket: $BUCKET_NAME"
echo "  - Versioning: Enabled"
echo "  - Encryption: AWS KMS with aws/s3 key"
echo "  - Public Access: Blocked"
echo "• DynamoDB Table: $DYNAMODB_TABLE"
echo "  - Primary Key: LockID (String)"
echo "  - Billing Mode: Pay per request"
echo "• Region: $REGION"
echo ""
echo "Next steps:"
echo "1. cd terraform/environments/dev (or prod)"
echo "2. terraform init"
echo "3. terraform plan"
echo "4. terraform apply"
echo ""
echo "Note: Ensure your AWS credentials have appropriate permissions for:"
echo "- S3: s3:CreateBucket, s3:PutBucketVersioning, s3:PutBucketEncryption, s3:PutPublicAccessBlock"
echo "- DynamoDB: dynamodb:CreateTable, dynamodb:DescribeTable"