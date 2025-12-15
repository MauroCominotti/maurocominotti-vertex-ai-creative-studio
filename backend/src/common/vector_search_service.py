# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import logging
from typing import List, Optional, Dict, Any

from google.cloud import aiplatform
from google.cloud.aiplatform.matching_engine.matching_engine_index_endpoint import (
    Namespace,
    HybridQuery,
)

from src.config.config_service import config_service

logger = logging.getLogger(__name__)


class VectorSearchService:
    """
    Service for interacting with Vertex AI Vector Search.
    Handles upserting vectors and performing hybrid searches.
    """

    def __init__(self):
        self.project_id = config_service.PROJECT_ID
        self.location = config_service.LOCATION
        
        # Text Index Config
        self.text_index_id = config_service.VECTOR_SEARCH_TEXT_INDEX_ID
        self.text_deployed_index_id = config_service.VECTOR_SEARCH_DEPLOYED_TEXT_INDEX_ID
        
        # Image Index Config
        self.image_index_id = config_service.VECTOR_SEARCH_IMAGE_INDEX_ID
        self.image_deployed_index_id = config_service.VECTOR_SEARCH_DEPLOYED_IMAGE_INDEX_ID
        
        self.index_endpoint_id = config_service.VECTOR_SEARCH_INDEX_ENDPOINT_ID
        
        self.text_index = None
        self.image_index = None
        self.index_endpoint = None

        if self.project_id and self.location and self.index_endpoint_id:
            try:
                aiplatform.init(project=self.project_id, location=self.location)
                
                self.index_endpoint = aiplatform.MatchingEngineIndexEndpoint(
                    index_endpoint_name=self.index_endpoint_id
                )
                
                # Initialize Text Index
                if self.text_index_id and "PLACEHOLDER" not in self.text_index_id:
                    try:
                        self.text_index = aiplatform.MatchingEngineIndex(index_name=self.text_index_id)
                    except Exception as e:
                        logger.warning(f"Failed to initialize Text Index: {e}")

                # Initialize Image Index
                if self.image_index_id and "PLACEHOLDER" not in self.image_index_id:
                    try:
                        self.image_index = aiplatform.MatchingEngineIndex(index_name=self.image_index_id)
                    except Exception as e:
                        logger.warning(f"Failed to initialize Image Index: {e}")
                        
            except Exception as e:
                logger.error(f"Failed to initialize Vector Search Endpoint: {e}")
        else:
            logger.warning("Vector Search configuration missing. Service disabled.")

    def upsert_vectors(
        self,
        vectors: List[Dict[str, Any]],
        index_type: str = "text", # "text" or "image"
        namespace: str = "default",
    ):
        """
        Upserts vectors to the specified index.
        
        Args:
            vectors: List of dictionaries containing 'id', 'embedding', and 'restricts'.
            index_type: "text" or "image" to select the target index.
            namespace: The namespace to upsert to.
        """
        target_index = self.text_index if index_type == "text" else self.image_index
        target_index_id = self.text_index_id if index_type == "text" else self.image_index_id

        if not target_index:
            logger.warning(f"Vector Search {index_type} index not initialized. Skipping upsert.")
            return

        try:
            # Convert to expected format for upsert
            datapoints = []
            for v in vectors:
                datapoint = {
                    "datapoint_id": v["id"],
                    "feature_vector": v["embedding"],
                }
                if "restricts" in v:
                    datapoint["restricts"] = v["restricts"]
                if "sparse_embedding" in v:
                    datapoint["sparse_embedding"] = v["sparse_embedding"]
                datapoints.append(datapoint)

            target_index.upsert_datapoints(datapoints=datapoints)
            logger.info(f"Successfully upserted {len(vectors)} vectors to {index_type} index {target_index_id}")
        except Exception as e:
            logger.error(f"Failed to upsert vectors to {index_type} index: {e}")
            raise

    def search(
        self,
        query_embedding: List[float],
        num_neighbors: int = 5,
        restricts: Optional[List[Namespace]] = None,
        sparse_embedding: Optional[Dict[str, List[Any]]] = None,
        rrf_ranking_alpha: float = 0.5,
        index_type: str = "text", # "text" or "image"
    ) -> List[Any]:
        """
        Performs a search on the specified index.
        
        Args:
            query_embedding: The embedding vector to search for.
            num_neighbors: Number of neighbors to return.
            restricts: List of Namespace objects for filtering.
            index_type: "text" or "image" to select the target index.
            
        Returns:
            List of search results.
        """
        if not self.index_endpoint:
            logger.warning("Vector Search Endpoint not initialized. Skipping search.")
            return []
            
        deployed_index_id = self.text_deployed_index_id if index_type == "text" else self.image_deployed_index_id
            
        try:
            # Construct queries list
            queries = []
            if sparse_embedding:
                # Hybrid Query
                queries = [
                    HybridQuery(
                        dense_embedding=query_embedding,
                        sparse_embedding_dimensions=sparse_embedding["dimensions"],
                        sparse_embedding_values=sparse_embedding["values"],
                        rrf_ranking_alpha=rrf_ranking_alpha,
                    )
                ]
            else:
                # Dense only
                queries = [query_embedding]

            response = self.index_endpoint.find_neighbors(
                deployed_index_id=deployed_index_id,
                queries=queries,
                num_neighbors=num_neighbors,
                filter=restricts,
            )
            return response
        except Exception as e:
            logger.error(f"Failed to search {index_type} index: {e}")
            raise

    def delete_vectors(self, vector_ids: List[str], index_type: str = "text"):
        """
        Deletes vectors from the specified index by their IDs.
        
        Args:
            vector_ids: List of vector IDs to delete.
            index_type: "text" or "image".
        """
        target_index = self.text_index if index_type == "text" else self.image_index
        target_index_id = self.text_index_id if index_type == "text" else self.image_index_id

        if not target_index:
            logger.warning(f"Vector Search {index_type} index not initialized. Skipping deletion.")
            return

        try:
            target_index.remove_datapoints(datapoint_ids=vector_ids)
            logger.info(f"Successfully deleted {len(vector_ids)} vectors from {index_type} index {target_index_id}")
        except Exception as e:
            logger.error(f"Failed to delete vectors from {index_type} index: {e}")
            raise
