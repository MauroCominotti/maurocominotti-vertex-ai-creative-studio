output "url" {
  description = "The default URL of the Firebase Hosting site."
  value       = google_firebase_hosting_site.this.default_url
}

output "site_id" {
  description = "The ID of the Firebase Hosting site."
  value       = google_firebase_hosting_site.this.site_id
}

output "trigger_sa_email" {
  description = "The email of the service account used by the build trigger."
  value       = google_service_account.trigger_sa.email
}
