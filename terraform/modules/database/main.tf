# Database Module - DynamoDB Single Table Design
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# DynamoDB Table with Single Table Design
resource "aws_dynamodb_table" "main" {
  name           = "${var.project_name}-${var.environment}-table"
  billing_mode   = "PAY_PER_REQUEST"  # Cost optimization for POC
  hash_key       = "PK"
  range_key      = "SK"

  # Primary Key Schema
  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # GSI1 for additional access patterns
  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  # GSI2 for time-based queries
  attribute {
    name = "GSI2PK"
    type = "S"
  }

  attribute {
    name = "GSI2SK"
    type = "S"
  }

  # Global Secondary Index 1
  global_secondary_index {
    name     = "GSI1"
    hash_key = "GSI1PK"
    range_key = "GSI1SK"
    projection_type = "ALL"
  }

  # Global Secondary Index 2 for time-based queries
  global_secondary_index {
    name     = "GSI2"
    hash_key = "GSI2PK"
    range_key = "GSI2SK"
    projection_type = "ALL"
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  # Point-in-time recovery for data protection
  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  # Deletion protection
  deletion_protection_enabled = var.enable_deletion_protection

  # TTL attribute for automatic item expiration
  ttl {
    attribute_name = "TTL"
    enabled        = true
  }

  tags = var.tags

  lifecycle {
    prevent_destroy = true
  }
}

# DynamoDB Table Item example for testing (optional)
resource "aws_dynamodb_table_item" "health_check" {
  count      = var.create_health_check_item ? 1 : 0
  table_name = aws_dynamodb_table.main.name
  hash_key   = aws_dynamodb_table.main.hash_key
  range_key  = aws_dynamodb_table.main.range_key

  item = jsonencode({
    PK = {
      S = "HEALTH"
    }
    SK = {
      S = "CHECK"
    }
    status = {
      S = "OK"
    }
    created_at = {
      S = timestamp()
    }
    entity_type = {
      S = "health_check"
    }
  })

  lifecycle {
    ignore_changes = [item]
  }
}