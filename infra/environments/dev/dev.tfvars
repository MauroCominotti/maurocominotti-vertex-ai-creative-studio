# environments/dev/dev.tfvars
gcp_project_id = "dojo-creativestudio"
gcp_region     = "us-central1"
environment    = "development"

# --- Service Names ---
backend_service_name  = "creative-studio-backend-dev"
frontend_service_name = "creative-studio-frontend-dev"

# --- GitHub Repo Details ---
github_conn_name   = "gh-cstudio"
github_repo_owner  = "sanspace"
github_repo_name   = "maurocominotti-vertex-ai-creative-studio"
github_branch_name = "feat/tfenvs"

# --- Custom Audiences ---
backend_custom_audiences  = ["703756029283-assivi1rbjtn0qab4m01gtg4ednev0p3.apps.googleusercontent.com", "creative-studio-dev"]
frontend_custom_audiences = ["703756029283-assivi1rbjtn0qab4m01gtg4ednev0p3.apps.googleusercontent.com", "creative-studio-dev"]

# --- Service-Specific Environment Variables ---
be_env_vars = {
  common = {
    LOG_LEVEL = "INFO"
  }
  development = {
    ENVIRONMENT  = "development"
    IAP_AUDIENCE = "703756029283-assivi1rbjtn0qab4m01gtg4ednev0p3.apps.googleusercontent.com"
  }
  production = {} # Not used in dev, but defined to match the variable type
}

apis_to_enable = [
  "serviceusage.googleapis.com",     # Required to enable other APIs
  "iam.googleapis.com",              # Required for IAM management
  "cloudbuild.googleapis.com",       # Required for Cloud Build
  "artifactregistry.googleapis.com", # Required for Artifact Registry
  "run.googleapis.com",              # Required for Cloud Run

  "cloudresourcemanager.googleapis.com",


  "compute.googleapis.com",
  "cloudfunctions.googleapis.com",
  "iamcredentials.googleapis.com",
  "aiplatform.googleapis.com",
  "firestore.googleapis.com",
]
