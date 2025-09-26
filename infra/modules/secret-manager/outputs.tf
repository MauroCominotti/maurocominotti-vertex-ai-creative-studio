output "secrets" {
  description = "A map of the created secret resources, keyed by their secret_id."
  value = {
    for secret in google_secret_manager_secret.this : secret.secret_id => secret
  }
}
