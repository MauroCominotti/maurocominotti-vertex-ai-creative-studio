variable "gcp_project_id" {
  type        = string
  description = "The GCP Project ID for the development environment."
}

variable "gcp_region" {
  type        = string
  description = "The GCP region for the development environment."
}

variable "environment" {
  type        = string
  description = "The name of the environment, e.g., 'development'."
}

# --- Service Names ---
variable "backend_service_name" {
  type        = string
  description = "The full name of the backend Cloud Run service for this environment."
}

variable "frontend_service_name" {
  type        = string
  description = "The full name of the frontend Cloud Run service for this environment."
}

# --- GitHub Repo Details ---
variable "github_conn_name" {
  type        = string
  description = "The name of the Cloud Build GitHub connection."
}

variable "github_repo_owner" {
  type        = string
  description = "The owner of the GitHub repository."
}

variable "github_repo_name" {
  type        = string
  description = "The name of the GitHub repository."
}

variable "github_branch_name" {
  type        = string
  description = "The branch name to trigger builds from."
}

# --- Custom Audiences ---
variable "backend_custom_audiences" {
  type        = list(string)
  description = "List of custom audiences for the backend service."
}

variable "frontend_custom_audiences" {
  type        = list(string)
  description = "List of custom audiences for the frontend service."
}

# --- Service-Specific Environment Variables ---
variable "be_env_vars" {
  type        = map(map(string))
  description = "A map containing common and environment-specific variables for the backend."
}

# --- List of APIs to enable ---
variable "apis_to_enable" {
  type        = list(string)
  description = "A list of Google Cloud APIs to enable on the project."
  default = [
    "serviceusage.googleapis.com",     # Required to enable other APIs
    "iam.googleapis.com",              # Required for IAM management
    "cloudbuild.googleapis.com",       # Required for Cloud Build
    "artifactregistry.googleapis.com", # Required for Artifact Registry
    "run.googleapis.com"               # Required for Cloud Run
  ]
}
