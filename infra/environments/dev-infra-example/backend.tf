terraform {
  backend "gcs" {
    bucket = "cstudio-infra-example-cstudio-dev-tfstate"
    prefix = "infra/dev/state"
  }
}
