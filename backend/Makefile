# Backend Makefile for Lifestyle Spaces

.PHONY: help install test coverage lint format clean run build deploy dev-setup

# Variables
PYTHON := python3
PIP := $(PYTHON) -m pip
PYTEST := $(PYTHON) -m pytest
BLACK := $(PYTHON) -m black
FLAKE8 := $(PYTHON) -m flake8
COVERAGE := $(PYTHON) -m coverage

# Default target
help:
	@echo "Lifestyle Spaces Backend - Available Commands:"
	@echo ""
	@echo "Setup & Development:"
	@echo "  make install      - Install dependencies"
	@echo "  make dev-setup    - Complete development setup"
	@echo "  make run          - Run local development server"
	@echo ""
	@echo "Testing & Quality:"
	@echo "  make test         - Run all tests"
	@echo "  make coverage     - Run tests with coverage report"
	@echo "  make lint         - Run linting checks"
	@echo "  make format       - Format code with black"
	@echo ""
	@echo "Deployment:"
	@echo "  make build        - Build Lambda deployment package"
	@echo "  make deploy       - Deploy to AWS (via CI/CD only)"
	@echo "  make clean        - Clean build artifacts"

# Install dependencies
install:
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt
	@echo "✓ Dependencies installed"

# Complete development setup
dev-setup: install
	cp .env.example .env
	@echo "✓ Development environment ready"
	@echo "  Edit .env file with your configuration"

# Run tests (TDD approach - always run tests first!)
test:
	$(PYTEST) tests/ -v --tb=short

# Run tests with coverage (must be 100% for backend)
coverage:
	$(COVERAGE) run -m pytest tests/
	$(COVERAGE) report -m --fail-under=100
	$(COVERAGE) html
	@echo "✓ Coverage report generated in htmlcov/index.html"

# Lint code
lint:
	$(FLAKE8) app/ tests/ --max-line-length=100 --exclude=__pycache__
	@echo "✓ Linting passed"

# Format code
format:
	$(BLACK) app/ tests/ lambda_handler.py build_lambda_package.py --line-length=100
	@echo "✓ Code formatted"

# Run development server
run:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Build Lambda deployment package
build: clean
	@echo "Building Lambda deployment package..."
	$(PYTHON) build_lambda_package.py
	@echo "✓ Lambda package ready: lambda-deployment.zip"

# Clean build artifacts
clean:
	rm -rf build_lambda/
	rm -rf dist/
	rm -rf *.egg-info
	rm -rf .pytest_cache/
	rm -rf .coverage
	rm -rf htmlcov/
	rm -rf __pycache__/
	rm -rf app/__pycache__/
	rm -rf tests/__pycache__/
	rm -f lambda-deployment.zip
	rm -f lambda-placeholder.zip
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	@echo "✓ Clean complete"

# Deploy to AWS (should only be run via GitHub Actions)
deploy:
	@echo "⚠️  Deployment should be done via GitHub Actions"
	@echo "   Use 'git push' to trigger automated deployment"

# Quick validation before committing
validate: lint test coverage
	@echo "✓ All validations passed - ready to commit!"

# Development workflow helpers
check: validate
	@echo "✓ Code is ready for PR"

# Watch tests (requires pytest-watch)
watch:
	$(PYTHON) -m pytest_watch tests/ --clear

# Create a new test file
new-test:
	@read -p "Enter test module name (e.g., test_new_feature): " name; \
	touch tests/unit/$$name.py; \
	echo "import pytest" > tests/unit/$$name.py; \
	echo "" >> tests/unit/$$name.py; \
	echo "# Write tests FIRST (TDD approach)" >> tests/unit/$$name.py; \
	echo "✓ Created tests/unit/$$name.py"

# Run specific test file
test-file:
	@read -p "Enter test file path: " file; \
	$(PYTEST) $$file -v

# Update dependencies
update-deps:
	$(PIP) list --outdated
	@echo ""
	@echo "To update a package: pip install --upgrade package_name"
	@echo "Don't forget to update requirements.txt"

# Security check
security:
	$(PIP) install safety
	safety check --json
	@echo "✓ Security check complete"

# Performance profiling
profile:
	$(PYTHON) -m cProfile -o profile.stats app/main.py
	$(PYTHON) -m pstats profile.stats
	@echo "✓ Profile saved to profile.stats"
