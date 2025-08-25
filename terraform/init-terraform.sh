#!/bin/bash
# Simple Terraform initialization script
# Usage: ./init-terraform.sh [dev|prod]

set -e

# Default environment
ENV=${1:-dev}

# Validate environment
if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
    echo "Error: Environment must be 'dev' or 'prod'"
    echo "Usage: $0 [dev|prod]"
    exit 1
fi

echo "Initializing Terraform for $ENV environment..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "Error: AWS CLI is not configured or no valid credentials found."
    echo "Please run 'aws configure' first."
    exit 1
fi

# Navigate to environment directory
cd "environments/$ENV"

echo "Current directory: $(pwd)"
echo "Files in directory:"
ls -la

echo ""
echo "Initializing Terraform..."
terraform init

echo ""
echo "Validating configuration..."
terraform validate

echo ""
echo "Formatting files..."
terraform fmt

echo ""
echo "Terraform initialization complete for $ENV environment!"
echo ""
echo "Next steps:"
echo "1. terraform plan"
echo "2. terraform apply"
echo ""
echo "Or use the Makefile:"
echo "make plan ENV=$ENV"
echo "make apply ENV=$ENV"