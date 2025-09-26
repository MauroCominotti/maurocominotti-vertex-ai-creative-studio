variable "gcp_project_id" {
  type        = string
  description = "The GCP Project ID where the secrets will be created."
}

variable "secret_names" {
  type        = list(string)
  description = "A list of secret IDs to create (e.g., [\"FIREBASE_API_KEY\", \"GOOGLE_CLIENT_ID\"])."
}

variable "accessor_sa_email" {
  type        = string
  description = "The email of the service account that will be granted accessor permission."
}
