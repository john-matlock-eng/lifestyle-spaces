# Frontend Module Outputs

output "s3_bucket_id" {
  description = "ID of the S3 bucket"
  value       = aws_s3_bucket.website.id
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket (same as ID for S3)"
  value       = aws_s3_bucket.website.bucket
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.website.arn
}

output "s3_bucket_domain_name" {
  description = "Domain name of the S3 bucket"
  value       = aws_s3_bucket.website.bucket_domain_name
}

output "s3_bucket_regional_domain_name" {
  description = "Regional domain name of the S3 bucket"
  value       = aws_s3_bucket.website.bucket_regional_domain_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.website.id
}

output "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.website.arn
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.website.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "Hosted zone ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.website.hosted_zone_id
}

output "website_url" {
  description = "URL of the website"
  value       = "https://${aws_cloudfront_distribution.website.domain_name}"
}

output "cloudfront_distribution_domain" {
  description = "CloudFront distribution domain name (AWS-generated URL)"
  value       = aws_cloudfront_distribution.website.domain_name
}

output "cloudfront_distribution_status" {
  description = "Status of the CloudFront distribution"
  value       = aws_cloudfront_distribution.website.status
}

# Secondary CloudFront Distribution outputs
output "secondary_cloudfront_distribution_id" {
  description = "ID of the secondary CloudFront distribution"
  value       = var.enable_secondary_distribution ? aws_cloudfront_distribution.secondary[0].id : null
}

output "secondary_cloudfront_domain_name" {
  description = "Domain name of the secondary CloudFront distribution"
  value       = var.enable_secondary_distribution ? aws_cloudfront_distribution.secondary[0].domain_name : null
}

output "secondary_website_url" {
  description = "URL of the secondary website"
  value       = var.enable_secondary_distribution ? "https://${aws_cloudfront_distribution.secondary[0].domain_name}" : null
}