# environments/dev/backend.tf
terraform {
  backend "gcs" {
    bucket = "cstudio-tf-state"
    prefix = "infra/dev/state"
  }
}
