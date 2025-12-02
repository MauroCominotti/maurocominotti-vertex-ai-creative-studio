variable "project_id" {
  description = "The ID of the project in which to provision resources."
  type        = string
}

variable "region" {
  description = "The region in which to provision resources."
  type        = string
}

variable "index_display_name" {
  description = "The display name of the Index."
  type        = string
  default     = "creative-studio-index"
}

variable "index_endpoint_display_name" {
  description = "The display name of the Index Endpoint."
  type        = string
  default     = "creative-studio-index-endpoint"
}

variable "deployed_index_id" {
  description = "The user specified ID of the DeployedIndex."
  type        = string
  default     = "creative_studio_deployed_index"
}
