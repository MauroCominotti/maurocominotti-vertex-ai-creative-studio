#!/bin/bash

# A script to securely update secrets in Google Secret Manager
# based on the terraform outputs in the current environment directory.
#
# USAGE:
# 1. cd into the environment you want to update (e.g., `cd environments/dev`)
# 2. Run this script from that directory (`../../update_secrets.sh`)

set -e
set -o pipefail

# --- Color Definitions ---
C_RESET='\033[0m'
C_RED='\033[0;31m'
C_GREEN='\033[0;32m'
C_YELLOW='\033[0;33m'
C_CYAN='\033[0;36m'

# --- Helper Functions ---
info() {
  echo -e "${C_CYAN}> $1${C_RESET}"
}

success() {
  echo -e "${C_GREEN}✅ $1${C_RESET}"
}

warn() {
  echo -e "${C_YELLOW}⚠️ $1${C_RESET}"
}

fail() {
  echo -e "${C_RED}❌ $1${C_RESET}" >&2
  exit 1
}

# --- Dependency Check ---
info "Checking for required tools (gcloud, jq, terraform)..."
command -v gcloud >/dev/null || fail "gcloud CLI not found. Please install it."
command -v jq >/dev/null || fail "jq is not installed. Please install it (e.g., 'brew install jq')."
command -v terraform >/dev/null || fail "Terraform not found. Please install it."
info "All tools found."

# --- Main Script ---

# 1. Fetch outputs from the Terraform state in the current directory
info "Fetching secrets from Terraform state..."
TERRAFORM_OUTPUTS=$(terraform output -json)

# 2. Parse the outputs using jq
PROJECT_ID=$(echo "$TERRAFORM_OUTPUTS" | jq -r .gcp_project_id.value)
FRONTEND_SECRETS=$(echo "$TERRAFORM_OUTPUTS" | jq -r .frontend_secrets.value[])
BACKEND_SECRETS=$(echo "$TERRAFORM_OUTPUTS" | jq -r .backend_secrets.value[])

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" == "null" ]; then
  fail "Could not find 'gcp_project_id' in Terraform outputs. Did you run 'terraform apply'?"
fi

# Combine, de-duplicate, and sort the secret lists
ALL_SECRETS=$(echo "${FRONTEND_SECRETS} ${BACKEND_SECRETS}" | tr ' ' '\n' | sort -u | grep .)

if [ -z "$ALL_SECRETS" ]; then
  success "No secrets listed in 'frontend_secrets' or 'backend_secrets' outputs. Nothing to do."
  exit 0
fi

info "Project: ${C_YELLOW}${PROJECT_ID}${C_RESET}"
warn "The following secrets will be updated:"
echo -e "${C_YELLOW}$ALL_SECRETS${C_RESET}"

# 3. Confirmation
read -p "Continue? (y/n): " -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  fail "Operation cancelled."
fi

# 4. Loop, Prompt, and Write
for SECRET_NAME in $ALL_SECRETS; do
  info "Updating secret: ${C_YELLOW}${SECRET_NAME}${C_RESET}"

  # Add reassurance for the user
  echo -e "${C_CYAN}  It is safe to paste your secret. The value is read securely, not displayed, and not stored in disk or history.${C_RESET}"
  
  # Securely prompt for the secret value (the -s flag hides the input)
  read -s -p "  Enter new value: " SECRET_VALUE
  echo # Add a newline after the prompt

  if [ -z "$SECRET_VALUE" ]; then
    warn "  No value provided. Skipping ${SECRET_NAME}."
    continue
  fi

  # Write the secret value from the variable directly to gcloud stdin
  # This avoids saving it to disk or command history.
  echo -n "$SECRET_VALUE" | gcloud secrets versions add "$SECRET_NAME" \
    --data-file="-" \
    --project="$PROJECT_ID" \
    --quiet

  success "  Successfully added new version for ${SECRET_NAME}."
done

success "All secrets updated."
