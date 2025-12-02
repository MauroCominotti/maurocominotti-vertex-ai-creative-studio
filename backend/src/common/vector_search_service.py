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
)

from src.config.config_service import config_service

logger = logging.getLogger(__name__)


class VectorSearchService:
    """
    Service for interacting with Vertex AI Vector Search.
    Handles upserting vectors and performing hybrid searches.
    """

    def __init__(self):
        self.project_id = config_service.GOOGLE_CLOUD_PROJECT
        self.location = config_service.REGION
        self.index_id = config_service.VECTOR_SEARCH_INDEX_ID
        self.index_endpoint_id = config_service.VECTOR_SEARCH_INDEX_ENDPOINT_ID
        
        aiplatform.init(project=self.project_id, location=self.location)
        
        self.index = aiplatform.MatchingEngineIndex(index_name=self.index_id)
        self.index_endpoint = aiplatform.MatchingEngineIndexEndpoint(
            index_endpoint_name=self.index_endpoint_id
        )

    def upsert_vectors(
        self,
        vectors: List[Dict[str, Any]],
        namespace: str = "default",
    ):
        """
        Upserts vectors to the index.
        
        Args:
            vectors: List of dictionaries containing 'id', 'embedding', and 'restricts'.
            namespace: The namespace to upsert to.
        """
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
                datapoints.append(datapoint)

            self.index.upsert_datapoints(datapoints=datapoints)
            logger.info(f"Successfully upserted {len(vectors)} vectors to index {self.index_id}")
        except Exception as e:
            logger.error(f"Failed to upsert vectors: {e}")
            raise

    def search(
        self,
        query_embedding: List[float],
        num_neighbors: int = 5,
        restricts: Optional[List[Namespace]] = None,
    ) -> List[Any]:
        """
        Performs a search on the index.
        
        Args:
            query_embedding: The embedding vector to search for.
            num_neighbors: Number of neighbors to return.
            restricts: List of Namespace objects for filtering.
            
        Returns:
            List of search results.
        """
        try:
            response = self.index_endpoint.find_neighbors(
                deployed_index_id=config_service.VECTOR_SEARCH_DEPLOYED_INDEX_ID,
                queries=[query_embedding],
                num_neighbors=num_neighbors,
                filter=restricts,
            )
            return response
        except Exception as e:
            logger.error(f"Failed to search index: {e}")
            raise
