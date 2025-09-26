gcp_project_id = "creative-studio"
gcp_region     = "us-central1"
environment    = "development"

# --- Service Names ---
backend_service_name  = "cstudio-backend-dev"
frontend_service_name = "cstudio-frontend-dev"

# --- GitHub Repo Details ---
github_conn_name   = "gh-repo-owner-con"
github_repo_owner  = "RepoOwnerName"
github_repo_name   = "repo-owner-vertex-ai-creative-studio"
github_branch_name = "develop"

# --- Custom Audiences ---
backend_custom_audiences  = ["your-custom-audience.apps.googleusercontent.com", "creative-studio"]
frontend_custom_audiences = ["your-custom-audience.apps.googleusercontent.com", "creative-studio"]

# --- Service-Specific Environment Variables ---
be_env_vars = {
  common = {
    LOG_LEVEL = "INFO"
  }
  development = {
    ENVIRONMENT  = "development"
    FIREBASE_DB = "cstudio-development"
    IDENTITY_PLATFORM_ALLOWED_ORGS = "" # If empty then any org is allowed
  }
  production = {
    ENVIRONMENT  = "production"
    FIREBASE_DB = "cstudio-development"
    IDENTITY_PLATFORM_ALLOWED_ORGS = "" # If empty then any org is allowed
  }
}

fe_build_substitutions = {
  _ANGULAR_BUILD_COMMAND = "build-dev"
}

frontend_secrets = [
  "FIREBASE_API_KEY",
  "FIREBASE_AUTH_DOMAIN",
  "GOOGLE_CLIENT_ID",
]

backend_secrets = [
  "GOOGLE_TOKEN_AUDIENCE",
]

backend_runtime_secrets = {
  "GOOGLE_TOKEN_AUDIENCE" = "GOOGLE_TOKEN_AUDIENCE"
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
