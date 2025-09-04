variable "gcp_project_id" { type = string }
variable "gcp_region" { type = string }
variable "environment" { type = string }

variable "firebase_db_name" {
  type = string
  default = "cstudio"
}

# Backend specific variables
variable "backend_service_name" { type = string }
variable "backend_custom_audiences" { type = list(string) }
variable "be_env_vars" { type = map(map(string)) }

# Frontend specific variables
variable "frontend_service_name" { type = string }
variable "frontend_custom_audiences" { type = list(string) }

# Common GitHub variables
variable "github_conn_name" { type = string }
variable "github_repo_owner" { type = string }
variable "github_repo_name" { type = string }
variable "github_branch_name" { type = string }

variable "be_cpu" {
  type = string
  default = "2000m"
}

variable "be_memory" {
  type = string
  default = "2048Mi"
}

variable "fe_cpu" {
  type = string
  default = "2000m"
}

variable "fe_memory" {
  type = string
  default = "2048Mi"
}
