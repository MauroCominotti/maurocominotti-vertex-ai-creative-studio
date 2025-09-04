terraform {
  required_providers {
    google      = { source = "hashicorp/google" }
    google-beta = { source = "hashicorp/google-beta" }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

provider "google-beta" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

# --- Enable the required Google Cloud APIs ---
resource "google_project_service" "apis" {
  # Use a for_each loop to enable each API from the variable list
  for_each = toset(var.apis_to_enable)

  project = var.gcp_project_id
  service = each.key

  # This prevents Terraform from disabling APIs when you run `terraform destroy`
  disable_on_destroy = false
}

# Call the platform module, passing in all the required variables.
module "creative_studio_platform" {
  source = "../../modules/platform"

  gcp_project_id            = var.gcp_project_id
  gcp_region                = var.gcp_region
  environment               = var.environment
  backend_service_name      = var.backend_service_name
  backend_custom_audiences  = var.backend_custom_audiences
  be_env_vars               = var.be_env_vars
  frontend_service_name     = var.frontend_service_name
  frontend_custom_audiences = var.frontend_custom_audiences
  github_conn_name          = var.github_conn_name
  github_repo_owner         = var.github_repo_owner
  github_repo_name          = var.github_repo_name
  github_branch_name        = var.github_branch_name

  depends_on = [ google_project_service.apis ]
}