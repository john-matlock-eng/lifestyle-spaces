# Import blocks for existing AWS resources
# These import existing manually-created resources into Terraform state

# Pinecone API Key secret (created manually before Terraform management)
import {
  to = module.backend.aws_secretsmanager_secret.pinecone_api_key
  id = "lifestyle-spaces/pinecone-api-key"
}
