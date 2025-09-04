gcp_project_id = "creative-studio-arena"
gcp_region     = "southamerica-east1"
environment    = "development"

# --- Service Names ---
backend_service_name  = "creative-studio-backend-dev"
frontend_service_name = "creative-studio-frontend-dev"

# --- GitHub Repo Details ---
github_conn_name   = "gh-mauro-con"
github_repo_owner  = "MauroCominotti"
github_repo_name   = "maurocominotti-vertex-ai-creative-studio"
github_branch_name = "feature/add-angular-and-fastapi"

# --- Custom Audiences ---
backend_custom_audiences  = ["403537020690-005n69h4cl6hudk5ibipkdsim83r3hf5.apps.googleusercontent.com", "creative-studio-arena"]
frontend_custom_audiences = ["403537020690-005n69h4cl6hudk5ibipkdsim83r3hf5.apps.googleusercontent.com", "creative-studio-arena"]

# --- Service-Specific Environment Variables ---
be_env_vars = {
  common = {
    LOG_LEVEL = "INFO"
  }
  development = {
    ENVIRONMENT  = "development"
    IAP_AUDIENCE = "403537020690-005n69h4cl6hudk5ibipkdsim83r3hf5.apps.googleusercontent.com"
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
