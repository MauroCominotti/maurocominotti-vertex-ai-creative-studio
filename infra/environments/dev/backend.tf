terraform {
  backend "gcs" {
    bucket = "creative-studio-arena-cstudio-dev-tfstate"
    prefix = "infra/dev/state"
  }
}
