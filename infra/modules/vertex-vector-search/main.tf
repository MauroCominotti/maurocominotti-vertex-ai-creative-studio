# --- Text Index (768 dimensions) ---
resource "google_vertex_ai_index" "text_index" {
  project      = var.project_id
  region       = var.region
  display_name = "${var.index_display_name}-text"
  description  = "Text Index for Creative Studio Brand Guidelines (768 dim)"
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

# --- Image Index (1408 dimensions) ---
resource "google_vertex_ai_index" "image_index" {
  project      = var.project_id
  region       = var.region
  display_name = "${var.index_display_name}-image"
  description  = "Image Index for Creative Studio Brand Guidelines (1408 dim)"
  metadata {
    config {
      dimensions                  = 1408
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

# --- Deploy Text Index ---
resource "google_vertex_ai_index_endpoint_deployed_index" "deployed_text_index" {
  index_endpoint = google_vertex_ai_index_endpoint.index_endpoint.id
  index          = google_vertex_ai_index.text_index.id
  deployed_index_id = "${var.deployed_index_id}_text"
  display_name   = "creative_studio_deployed_text_index"
  region         = var.region
}

# --- Deploy Image Index ---
resource "google_vertex_ai_index_endpoint_deployed_index" "deployed_image_index" {
  index_endpoint = google_vertex_ai_index_endpoint.index_endpoint.id
  index          = google_vertex_ai_index.image_index.id
  deployed_index_id = "${var.deployed_index_id}_image"
  display_name   = "creative_studio_deployed_image_index"
  region         = var.region
}
