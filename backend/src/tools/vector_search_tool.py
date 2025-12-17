from typing import List, Optional
from google.adk.tools import BaseTool
from src.common.vector_search_service import VectorSearchService
from src.multimodal.gemini_service import GeminiService
from google.cloud.aiplatform.matching_engine.matching_engine_index_endpoint import Namespace
import logging

logger = logging.getLogger(__name__)

def create_search_branding_guidelines_tool(vector_search_service: VectorSearchService, gemini_service: GeminiService):
    """
    Creates a function tool for searching branding guidelines.
    """
    
    def search_branding_guidelines(query: str, workspace_id: str = "Global") -> str:
        """
        Searches for branding guidelines and rules relevant to a query.
        
        Use this tool to find specific constraints, allowed colors, fonts, prohibited elements, 
        and other branding rules that must be followed.

        Args:
            query (str): The search query to find relevant branding rules (e.g., "logo usage", "colors for banners").
            workspace_id (str, optional): The ID of the workspace to scope the search. Defaults to "Global".

        Returns:
            str: A formatted string containing the found branding rules or a message indicating no rules were found.
        """
        logger.info(f"search_branding_guidelines tool called - Query: {query}, Workspace: {workspace_id}")
        
        # 1. Generate embeddings (Text and Multimodal)
        text_query_embedding = gemini_service.generate_embedding(query, model_type="text")
        multimodal_query_embedding = gemini_service.generate_embedding(query, model_type="multimodal")
        
        if not text_query_embedding and not multimodal_query_embedding:
            return "Error: Failed to generate embeddings for query."

        # 2. Search
        scope_filter = workspace_id or "Global"
        
        # Fetch active guidelines to filter out "zombie" vectors
        from src.brand_guidelines.repository.brand_guideline_repository import BrandGuidelineRepository
        from google.cloud.firestore_v1.base_query import FieldFilter
        
        repo = BrandGuidelineRepository()
        
        # Determine Firestore filter for workspace
        try:
            query_ref = repo.collection_ref
            if scope_filter == "Global":
                query_ref = query_ref.where(filter=FieldFilter("workspace_id", "==", None))
            else:
                # Ensure workspace_id is an integer for Firestore if possible
                try:
                    scope_val = int(scope_filter)
                except ValueError:
                    scope_val = scope_filter
                query_ref = query_ref.where(filter=FieldFilter("workspace_id", "==", scope_val))
                
            docs = list(query_ref.stream())
            active_guideline_ids = [doc.id for doc in docs]
            
            logger.info(f"search_branding_guidelines - Found {len(active_guideline_ids)} active guidelines for scope {scope_filter}")
            
        except Exception as e:
            logger.error(f"Failed to fetch active guidelines: {e}")
            active_guideline_ids = []

        if not active_guideline_ids:
            logger.info("search_branding_guidelines - No active guidelines found. Returning empty.")
            return "No branding guidelines found for this workspace."

        restricts = [
            Namespace("scope", [scope_filter]),
            Namespace("guideline_id", active_guideline_ids)
        ]
        
        search_results = []
        
        # Search Text Index
        if text_query_embedding:
            try:
                text_results = vector_search_service.search(
                    query_embedding=text_query_embedding,
                    num_neighbors=5,
                    restricts=restricts,
                    index_type="text"
                )
                if text_results and isinstance(text_results[0], list):
                    search_results.extend(text_results[0])
            except Exception as e:
                logger.error(f"Text index search failed: {e}")

        # Search Image Index
        if multimodal_query_embedding:
            try:
                image_results = vector_search_service.search(
                    query_embedding=multimodal_query_embedding,
                    num_neighbors=3, # Fewer images needed
                    restricts=restricts,
                    index_type="image"
                )
                if image_results and isinstance(image_results[0], list):
                    search_results.extend(image_results[0])
            except Exception as e:
                logger.error(f"Image index search failed: {e}")
        
        logger.info(f"search_branding_guidelines - Found {len(search_results)} total results")
        
        # 3. Format results
        relevant_text_chunks = []
        relevant_images = []
        guidelines_cache = {}
        
        from src.common.storage_service import GcsService
        import json
        gcs_service = GcsService()

        for result in search_results:
            # ID format: {guideline_id}_{type}_{index}
            if "_text_" in result.id:
                guideline_id, index_str = result.id.split("_text_")
                type_ = "text"
            elif "_image_" in result.id:
                guideline_id, index_str = result.id.split("_image_")
                type_ = "image"
            else:
                continue
            
            try:
                index = int(index_str)
            except ValueError:
                continue
            
            if guideline_id not in guidelines_cache:
                guideline = repo.get_by_id(guideline_id)
                if guideline:
                    guidelines_cache[guideline_id] = guideline
            
            guideline = guidelines_cache.get(guideline_id)
            if not guideline:
                continue

            if type_ == "text":
                # Fetch chunk from GCS
                blob_path = f"brand-guidelines/{guideline.workspace_id or 'global'}/processed/{guideline_id}/text/chunk_{index}.json"
                try:
                    full_uri = f"gs://{gcs_service.bucket_name}/{blob_path}"
                    content_bytes = gcs_service.download_bytes_from_gcs(full_uri)
                    if content_bytes:
                        chunk_data = json.loads(content_bytes)
                        text = chunk_data.get("guideline_text") or "\n".join(chunk_data.get("brand_rules", []))
                        if text:
                            snippet = text[:1000] + "..." if len(text) > 1000 else text
                            relevant_text_chunks.append(f"- [Source: {guideline.name}] {snippet}")
                except Exception as e:
                    logger.error(f"Failed to fetch chunk {blob_path}: {e}")

            elif type_ == "image":
                if guideline.reference_image_uris and index < len(guideline.reference_image_uris):
                    uri = guideline.reference_image_uris[index]
                    relevant_images.append(f"- [Source: {guideline.name}] {uri}")

        if not relevant_text_chunks and not relevant_images:
            logger.info("search_branding_guidelines - No relevant content found after filtering/fetching.")
            return "No relevant branding rules or images found."

        response_parts = []
        if relevant_text_chunks:
            response_parts.append("Found the following relevant branding rules/text:")
            response_parts.extend(relevant_text_chunks)
        
        if relevant_images:
            response_parts.append("\nFound the following relevant reference images:")
            response_parts.extend(relevant_images)

        logger.info(f"search_branding_guidelines - Returning {len(relevant_text_chunks)} text chunks and {len(relevant_images)} images.")
        return "\n".join(response_parts)

    return search_branding_guidelines

def create_fetch_guideline_tool():
    """
    Creates a function tool for fetching full branding guideline details.
    """
    def fetch_full_guideline(guideline_id: str) -> str:
        """
        Retrieves the full text and details of a specific branding guideline.
        
        Use this tool when you need more context than what the search tool provides, 
        or when a rule references a specific guideline ID.

        Args:
            guideline_id (str): The ID of the guideline to fetch.

        Returns:
            str: The full guideline text and metadata.
        """
        logger.info(f"fetch_full_guideline tool called - ID: {guideline_id}")
        
        from src.brand_guidelines.repository.brand_guideline_repository import BrandGuidelineRepository
        repo = BrandGuidelineRepository()
        
        try:
            guideline = repo.get_by_id(guideline_id)
            if not guideline:
                return f"Error: Guideline with ID {guideline_id} not found."
                
            # Construct a detailed string
            details = [
                f"Guideline: {guideline.name}",
                f"Tone of Voice: {guideline.tone_of_voice_summary or 'N/A'}",
                f"Visual Style: {guideline.visual_style_summary or 'N/A'}",
                f"Full Text: {guideline.guideline_text or 'N/A'}",
                f"Reference Images: {', '.join(guideline.reference_image_uris) if guideline.reference_image_uris else 'None'}"
            ]
            return "\n\n".join(details)
            
        except Exception as e:
            logger.error(f"Failed to fetch guideline {guideline_id}: {e}")
            return f"Error fetching guideline: {str(e)}"

    return fetch_full_guideline
