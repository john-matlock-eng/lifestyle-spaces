# Cognito Module Variables

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
}

# Password policy variables
variable "password_minimum_length" {
  description = "Minimum length of passwords"
  type        = number
  default     = 8
}

variable "password_require_lowercase" {
  description = "Require lowercase characters in passwords"
  type        = bool
  default     = true
}

variable "password_require_numbers" {
  description = "Require numbers in passwords"
  type        = bool
  default     = true
}

variable "password_require_symbols" {
  description = "Require symbols in passwords"
  type        = bool
  default     = false # Disabled for better UX in POC
}

variable "password_require_uppercase" {
  description = "Require uppercase characters in passwords"
  type        = bool
  default     = true
}

variable "temporary_password_validity_days" {
  description = "Number of days temporary passwords are valid"
  type        = number
  default     = 7
}

# Token validity variables
variable "access_token_validity_minutes" {
  description = "Access token validity in minutes"
  type        = number
  default     = 60 # 1 hour for POC
}

variable "id_token_validity_minutes" {
  description = "ID token validity in minutes"
  type        = number
  default     = 60 # 1 hour for POC
}

variable "refresh_token_validity_days" {
  description = "Refresh token validity in days"
  type        = number
  default     = 30 # 30 days for POC
}

# OAuth callback URLs
variable "callback_urls" {
  description = "List of allowed callback URLs for OAuth"
  type        = list(string)
  default     = ["http://localhost:3000", "https://localhost:3000"]
}

variable "logout_urls" {
  description = "List of allowed logout URLs for OAuth"
  type        = list(string)
  default     = ["http://localhost:3000", "https://localhost:3000"]
}

# Domain configuration
variable "create_domain" {
  description = "Create a Cognito domain for hosted UI"
  type        = bool
  default     = false # Disabled for POC to reduce complexity
}

variable "tags" {
  description = "A map of tags to assign to the resources"
  type        = map(string)
  default     = {}
}