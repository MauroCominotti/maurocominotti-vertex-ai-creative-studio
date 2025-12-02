from typing import List, Optional
from google.adk.tools import BaseTool
from src.common.vector_search_service import VectorSearchService
from src.multimodal.gemini_service import GeminiService
from google.cloud.aiplatform.matching_engine.matching_engine_index_endpoint import Namespace

class VectorSearchTool(BaseTool):
    """
    Tool for searching branding guidelines using Vertex AI Vector Search.
    """
    
    def __init__(self, vector_search_service: VectorSearchService, gemini_service: GeminiService):
        super().__init__(
            name="search_branding_guidelines",
            description="Searches for branding guidelines and rules relevant to a query. Use this to find constraints like colors, fonts, and prohibited elements.",
            parameters={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query (e.g., 'logo rules', 'color palette for summer campaign')."
                    },
                    "workspace_id": {
                        "type": "string",
                        "description": "Optional workspace ID to filter results."
                    }
                },
                "required": ["query"]
            }
        )
        self.vector_search = vector_search_service
        self.gemini_service = gemini_service

    def run(self, query: str, workspace_id: Optional[str] = None) -> str:
        """
        Executes the search.
        """
        # 1. Generate embedding
        query_embedding = self.gemini_service.generate_embedding(query)
        if not query_embedding:
            return "Error: Failed to generate embedding for query."

        # 2. Search
        scope_filter = workspace_id or "Global"
        restricts = [Namespace("scope", [scope_filter])]
        
        search_results = self.vector_search.search(
            query_embedding=query_embedding,
            num_neighbors=5,
            restricts=restricts
        )
        
        # 3. Format results
        # Note: As discovered before, we need to fetch the actual text.
        # For this tool, we will assume the 'EnforcerAgent' logic of fetching from Firestore 
        # is either moved here or we return IDs and let the agent handle it.
        # To make the tool self-contained, we should fetch the content here.
        
        from src.brand_guidelines.repository.brand_guideline_repository import BrandGuidelineRepository
        repo = BrandGuidelineRepository()
        
        rules_found = []
        guidelines_cache = {}

        for result in search_results:
            rule_id_composite = result.id
            parts = rule_id_composite.split("_rule_")
            if len(parts) != 2:
                continue
                
            guideline_id = parts[0]
            rule_index = int(parts[1])
            
            if guideline_id not in guidelines_cache:
                guideline = repo.get_by_id(guideline_id)
                if guideline:
                    guidelines_cache[guideline_id] = guideline
            
            guideline = guidelines_cache.get(guideline_id)
            if guideline and guideline.brand_rules and rule_index < len(guideline.brand_rules):
                rules_found.append(guideline.brand_rules[rule_index])

        if not rules_found:
            return "No relevant branding rules found."

        return "Found the following branding rules:\n" + "\n".join(f"- {r}" for r in rules_found)
