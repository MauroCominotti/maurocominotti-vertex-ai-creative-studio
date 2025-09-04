# --- Shared Platform Resources ---

resource "google_storage_bucket" "genmedia" {
  name                        = "${var.gcp_project_id}-cs-${var.environment}-bucket"
  location                    = var.gcp_region
  uniform_bucket_level_access = true
}

resource "google_service_account" "bucket_reader_sa" {
  account_id   = "cs-${var.environment}-read"
  display_name = "SA for reading GenMedia (${var.environment}) bucket"
}

resource "google_storage_bucket_iam_member" "bucket_viewer_binding" {
  bucket = google_storage_bucket.genmedia.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.bucket_reader_sa.email}"
}

# --- Predictable URLs & Environment Variables ---
locals {
  region_code  = join("", [for s in split("-", var.gcp_region) : substr(s, 0, 1)])
  backend_url  = "https://${var.backend_service_name}--${var.gcp_project_id}-${local.region_code}.run.app"
  frontend_url = "https://${var.frontend_service_name}--${var.gcp_project_id}-${local.region_code}.run.app"

  backend_env_vars = merge(
    lookup(var.be_env_vars, "common", {}),
    lookup(var.be_env_vars, var.environment, {}),
    {
      "CORS_ORIGINS"     = "[\"${local.frontend_url}\"]"
      "GENMEDIA_BUCKET"  = google_storage_bucket.genmedia.name
      "SIGNING_SA_EMAIL" = google_service_account.bucket_reader_sa.email
    }
  )
}

resource "google_firestore_database" "default" {
  project       = var.gcp_project_id
  name          = "${var.firebase_db_name}-${var.environment}"
  location_id   = var.gcp_region
  
  # IMPORTANT: This choice is permanent for the project.
  # Choose FIRESTORE_NATIVE for modern applications.
  type          = "FIRESTORE_NATIVE" 
}

# --- Firestore Indexes ---

# Index for: media_library by mime_type, created_at
resource "google_firestore_index" "media_library_mime_type" {
  project    = var.gcp_project_id
  database   = google_firestore_database.default.name
  collection = "media_library"

  fields {
    field_path = "mime_type"
    order      = "ASCENDING"
  }
  fields {
    field_path = "created_at"
    order      = "ASCENDING"
  }
}

# Index for: media_library by model, created_at
resource "google_firestore_index" "media_library_model" {
  project    = var.gcp_project_id
  database   = google_firestore_database.default.name
  collection = "media_library"

  fields {
    field_path = "model"
    order      = "ASCENDING"
  }
  fields {
    field_path = "created_at"
    order      = "ASCENDING"
  }
}

# Index for: media_library by user_email, created_at
resource "google_firestore_index" "media_library_user_email" {
  project    = var.gcp_project_id
  database   = google_firestore_database.default.name
  collection = "media_library"

  fields {
    field_path = "user_email"
    order      = "ASCENDING"
  }
  fields {
    field_path = "created_at"
    order      = "ASCENDING"
  }
}

# Index for: users by email, created_at
resource "google_firestore_index" "users_email" {
  project    = var.gcp_project_id
  database   = google_firestore_database.default.name
  collection = "users"

  fields {
    field_path = "email"
    order      = "ASCENDING"
  }
  fields {
    field_path = "created_at"
    order      = "ASCENDING"
  }
}

# Index for: users by role, created_at
resource "google_firestore_index" "users_role" {
  project    = var.gcp_project_id
  database   = google_firestore_database.default.name
  collection = "users"

  fields {
    field_path = "role"
    order      = "ASCENDING"
  }
  fields {
    field_path = "created_at"
    order      = "ASCENDING"
  }
}

# --- Cloud Build Repository Connection ---
resource "google_cloudbuildv2_repository" "source_repo" {
  provider          = google-beta
  name              = var.github_repo_name
  location          = var.gcp_region
  parent_connection = "projects/${var.gcp_project_id}/locations/${var.gcp_region}/connections/${var.github_conn_name}"
  remote_uri        = "https://github.com/${var.github_repo_owner}/${var.github_repo_name}.git"
}

# --- Service Module Calls ---
module "backend_service" {
  source = "../cloud-run-service"

  gcp_project_id        = var.gcp_project_id
  gcp_region            = var.gcp_region
  environment           = var.environment
  service_name          = var.backend_service_name
  resource_prefix       = "cs-be"
  github_conn_name      = var.github_conn_name
  github_repo_owner     = var.github_repo_owner
  github_repo_name      = var.github_repo_name
  github_branch_name    = var.github_branch_name
  cloudbuild_yaml_path  = "backend/cloudbuild.yaml"
  included_files_glob   = ["backend/**"]
  container_env_vars    = local.backend_env_vars
  custom_audiences      = var.backend_custom_audiences
  scaling_min_instances = 1
  source_repository_id = google_cloudbuildv2_repository.source_repo.id
  cpu = var.be_cpu
  memory = var.be_memory
}

module "frontend_service" {
  source = "../cloud-run-service"

  gcp_project_id        = var.gcp_project_id
  gcp_region            = var.gcp_region
  environment           = var.environment
  service_name          = var.frontend_service_name
  resource_prefix       = "cs-fe"
  github_conn_name      = var.github_conn_name
  github_repo_owner     = var.github_repo_owner
  github_repo_name      = var.github_repo_name
  github_branch_name    = var.github_branch_name
  cloudbuild_yaml_path  = "frontend/cloudbuild.yaml"
  included_files_glob   = ["frontend/**"]
  custom_audiences      = var.frontend_custom_audiences
  scaling_min_instances = 1
  source_repository_id = google_cloudbuildv2_repository.source_repo.id
  cpu = var.fe_cpu
  memory = var.fe_memory

  build_substitutions = {
    _BACKEND_URL = local.backend_url
  }
}
