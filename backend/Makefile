.PHONY: help install test test-cov test-unit test-integration run clean lint format setup

help:
	@echo "Available commands:"
	@echo "  make setup          - Set up development environment"
	@echo "  make install        - Install dependencies"
	@echo "  make test           - Run all tests"
	@echo "  make test-cov       - Run tests with coverage"
	@echo "  make test-unit      - Run unit tests only"
	@echo "  make test-integration - Run integration tests only"
	@echo "  make run            - Run development server"
	@echo "  make clean          - Clean up cache files"
	@echo "  make lint           - Run linting"
	@echo "  make format         - Format code with black"

setup:
	python setup.py

install:
	pip install -r requirements.txt

test:
	pytest

test-cov:
	pytest --cov --cov-report=term-missing --cov-report=html

test-unit:
	pytest tests/unit -v

test-integration:
	pytest tests/integration -v

run:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf .coverage

lint:
	flake8 app tests --max-line-length=120 --exclude=__pycache__

format:
	black app tests --line-length=120