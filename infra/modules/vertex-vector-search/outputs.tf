output "index_id" {
  value = google_vertex_ai_index.index.name
}

output "index_endpoint_id" {
  value = google_vertex_ai_index_endpoint.index_endpoint.name
}

output "index_endpoint_public_domain_name" {
    value = google_vertex_ai_index_endpoint.index_endpoint.public_endpoint_domain_name
}
