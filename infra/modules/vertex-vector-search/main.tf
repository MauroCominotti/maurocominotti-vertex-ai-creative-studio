resource "google_vertex_ai_index" "index" {
  project      = var.project_id
  region       = var.region
  display_name = var.index_display_name
  description  = "Index for Creative Studio Brand Guidelines"
  metadata {
    config {
      dimensions                  = 768
      approximate_neighbors_count = 150
      distance_measure_type       = "DOT_PRODUCT_DISTANCE"
      algorithm_config {
        tree_ah_config {
          leaf_node_embedding_count    = 500
          leaf_nodes_to_search_percent = 7
        }
      }
    }
  }
  index_update_method = "STREAM_UPDATE"
}

resource "google_vertex_ai_index_endpoint" "index_endpoint" {
  project      = var.project_id
  region       = var.region
  display_name = var.index_endpoint_display_name
  public_endpoint_enabled = true
}

resource "google_vertex_ai_index_endpoint_deployed_index" "deployed_index" {
  index_endpoint = google_vertex_ai_index_endpoint.index_endpoint.id
  index          = google_vertex_ai_index.index.id
  deployed_index_id = var.deployed_index_id
  display_name   = "creative_studio_deployed_index"
}
