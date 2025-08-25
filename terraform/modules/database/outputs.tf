# Database Module Outputs

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  value       = aws_dynamodb_table.main.name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table"
  value       = aws_dynamodb_table.main.arn
}

output "dynamodb_table_id" {
  description = "ID of the DynamoDB table"
  value       = aws_dynamodb_table.main.id
}

output "dynamodb_table_hash_key" {
  description = "Hash key of the DynamoDB table"
  value       = aws_dynamodb_table.main.hash_key
}

output "dynamodb_table_range_key" {
  description = "Range key of the DynamoDB table"
  value       = aws_dynamodb_table.main.range_key
}

output "dynamodb_table_stream_arn" {
  description = "Stream ARN of the DynamoDB table"
  value       = aws_dynamodb_table.main.stream_arn
}

output "dynamodb_table_gsi1_name" {
  description = "Name of GSI1"
  value       = "GSI1"
}

output "dynamodb_table_gsi2_name" {
  description = "Name of GSI2"
  value       = "GSI2"
}