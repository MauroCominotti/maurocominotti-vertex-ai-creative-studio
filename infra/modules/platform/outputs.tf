# modules/platform/outputs.tf

output "backend_service_url" {
  description = "The URL of the deployed backend service."
  value       = module.backend_service.service_url # This one is correct
}

output "frontend_service_url" {
  description = "The URL of the deployed frontend service."
  value       = module.frontend_service.url
}