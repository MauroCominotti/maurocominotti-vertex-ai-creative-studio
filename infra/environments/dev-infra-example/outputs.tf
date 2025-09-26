output "gcp_project_id" {
  description = "The GCP project ID for this environment."
  value       = var.gcp_project_id
}

output "frontend_secrets" {
  description = "A list of frontend secret names."
  value       = var.frontend_secrets
}

output "backend_secrets" {
  description = "A list of backend secret names."
  value       = var.backend_secrets
}
