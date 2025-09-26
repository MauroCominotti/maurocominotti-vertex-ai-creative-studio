# 1. Create the "shell" for each secret in the list
resource "google_secret_manager_secret" "this" {
  provider = google-beta
  for_each = toset(var.secret_names) # Loop over the list of names

  project   = var.gcp_project_id
  secret_id = each.key # Use the name from the list as the secret_id

  replication {
    auto {}
  }
}

# 2. Grant the accessor role for each secret to the specified service account
resource "google_secret_manager_secret_iam_member" "accessor" {
  provider = google-beta
  for_each = toset(var.secret_names) # Loop over the same list

  project   = google_secret_manager_secret.this[each.key].project
  secret_id = google_secret_manager_secret.this[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.accessor_sa_email}"
}
