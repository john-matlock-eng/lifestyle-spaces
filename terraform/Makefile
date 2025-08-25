# Makefile for Terraform operations
# Provides common commands for managing infrastructure

# Default environment
ENV ?= dev
BACKEND_CONFIG_FILE = backend-config.hcl

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

.PHONY: help init plan apply destroy validate format check-backend clean

help: ## Show this help message
	@echo "$(BLUE)Lifestyle Spaces Terraform Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Usage:$(NC)"
	@echo "  make <command> [ENV=dev|staging|prod]"
	@echo ""
	@echo "$(GREEN)Commands:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(BLUE)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(GREEN)Examples:$(NC)"
	@echo "  make plan ENV=dev"
	@echo "  make apply ENV=dev"

check-backend: ## Check if backend configuration exists
	@if [ ! -f $(BACKEND_CONFIG_FILE) ]; then \
		echo "$(RED)Error: $(BACKEND_CONFIG_FILE) not found!$(NC)"; \
		echo "$(YELLOW)Please create it with your S3 backend configuration.$(NC)"; \
		echo "$(YELLOW)See backend.tf for instructions.$(NC)"; \
		exit 1; \
	fi

init: check-backend ## Initialize Terraform with backend configuration
	@echo "$(GREEN)Initializing Terraform for $(ENV) environment...$(NC)"
	@cd environments/$(ENV) && \
		terraform init -backend-config="../../$(BACKEND_CONFIG_FILE)" -reconfigure

validate: ## Validate Terraform configuration
	@echo "$(GREEN)Validating Terraform configuration for $(ENV)...$(NC)"
	@cd environments/$(ENV) && terraform validate

format: ## Format Terraform files
	@echo "$(GREEN)Formatting Terraform files...$(NC)"
	@terraform fmt -recursive .

plan: init validate ## Plan Terraform changes
	@echo "$(GREEN)Planning Terraform changes for $(ENV)...$(NC)"
	@cd environments/$(ENV) && \
		terraform plan -var-file="terraform.tfvars" -out="terraform.plan"

apply: init validate ## Apply Terraform changes
	@echo "$(GREEN)Applying Terraform changes for $(ENV)...$(NC)"
	@cd environments/$(ENV) && \
		terraform apply -var-file="terraform.tfvars" -auto-approve

apply-plan: ## Apply a previously created plan
	@echo "$(GREEN)Applying Terraform plan for $(ENV)...$(NC)"
	@cd environments/$(ENV) && \
		terraform apply "terraform.plan"

destroy: init ## Destroy Terraform resources (use with caution!)
	@echo "$(RED)WARNING: This will destroy all resources in $(ENV)!$(NC)"
	@echo "$(YELLOW)Are you sure? [y/N]$(NC)"
	@read confirm && [ "$$confirm" = "y" ] || exit 1
	@cd environments/$(ENV) && \
		terraform destroy -var-file="terraform.tfvars" -auto-approve

output: ## Show Terraform outputs
	@echo "$(GREEN)Terraform outputs for $(ENV):$(NC)"
	@cd environments/$(ENV) && terraform output

state-list: ## List resources in Terraform state
	@echo "$(GREEN)Resources in $(ENV) state:$(NC)"
	@cd environments/$(ENV) && terraform state list

refresh: init ## Refresh Terraform state
	@echo "$(GREEN)Refreshing Terraform state for $(ENV)...$(NC)"
	@cd environments/$(ENV) && \
		terraform refresh -var-file="terraform.tfvars"

clean: ## Clean Terraform artifacts
	@echo "$(GREEN)Cleaning Terraform artifacts...$(NC)"
	@find . -name ".terraform" -type d -exec rm -rf {} + 2>/dev/null || true
	@find . -name "terraform.tfstate*" -type f -delete 2>/dev/null || true
	@find . -name "terraform.plan" -type f -delete 2>/dev/null || true
	@find . -name ".terraform.lock.hcl" -type f -delete 2>/dev/null || true

# Backend management commands
create-backend: ## Create S3 bucket and DynamoDB table for backend
	@echo "$(GREEN)Creating Terraform backend resources...$(NC)"
	@echo "$(YELLOW)Make sure to update BUCKET_NAME and TABLE_NAME variables$(NC)"
	@read -p "S3 Bucket Name: " bucket_name; \
	read -p "DynamoDB Table Name (default: terraform-state-locks): " table_name; \
	table_name=$${table_name:-terraform-state-locks}; \
	aws s3 mb s3://$$bucket_name --region us-east-1 && \
	aws s3api put-bucket-versioning \
		--bucket $$bucket_name \
		--versioning-configuration Status=Enabled && \
	aws dynamodb create-table \
		--table-name $$table_name \
		--attribute-definitions AttributeName=LockID,AttributeType=S \
		--key-schema AttributeName=LockID,KeyType=HASH \
		--billing-mode PAY_PER_REQUEST \
		--region us-east-1

create-config: ## Create backend configuration file
	@echo "$(GREEN)Creating backend configuration file...$(NC)"
	@read -p "S3 Bucket Name: " bucket_name; \
	read -p "DynamoDB Table Name (default: terraform-state-locks): " table_name; \
	table_name=$${table_name:-terraform-state-locks}; \
	cat > $(BACKEND_CONFIG_FILE) << EOF && \
bucket         = "$$bucket_name" \
key            = "lifestyle-spaces/$(ENV)/terraform.tfstate" \
region         = "us-east-1" \
dynamodb_table = "$$table_name" \
encrypt        = true \
EOF
	echo "$(GREEN)Backend configuration created: $(BACKEND_CONFIG_FILE)$(NC)"

# CI/CD helper commands
ci-init: ## Initialize for CI/CD (non-interactive)
	@cd environments/$(ENV) && \
		terraform init -backend-config="../../$(BACKEND_CONFIG_FILE)" -input=false

ci-plan: ci-init ## Plan for CI/CD (non-interactive)
	@cd environments/$(ENV) && \
		terraform plan -var-file="terraform.tfvars" -input=false -out="terraform.plan"

ci-apply: ci-init ## Apply for CI/CD (non-interactive)
	@cd environments/$(ENV) && \
		terraform apply -input=false -auto-approve "terraform.plan"

# Development helpers
dev-all: format validate plan ## Run full development workflow
	@echo "$(GREEN)Development workflow completed for $(ENV)$(NC)"

check-costs: ## Estimate costs (requires infracost)
	@if command -v infracost >/dev/null 2>&1; then \
		echo "$(GREEN)Estimating costs for $(ENV)...$(NC)"; \
		cd environments/$(ENV) && \
		infracost breakdown --path . --terraform-var-file terraform.tfvars; \
	else \
		echo "$(YELLOW)infracost not installed. Install from https://www.infracost.io/docs/$(NC)"; \
	fi

# Security scanning (requires tfsec)
security-scan: ## Run security scan
	@if command -v tfsec >/dev/null 2>&1; then \
		echo "$(GREEN)Running security scan...$(NC)"; \
		tfsec .; \
	else \
		echo "$(YELLOW)tfsec not installed. Install from https://github.com/aquasecurity/tfsec$(NC)"; \
	fi