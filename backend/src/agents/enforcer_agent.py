import logging
from typing import List, Optional, Tuple
from google.adk.agents.llm_agent import Agent as LlmAgent
from google.adk.tools import FunctionTool
from src.tools.vector_search_tool import VectorSearchTool
from src.common.vector_search_service import VectorSearchService
from src.multimodal.gemini_service import GeminiService

logger = logging.getLogger(__name__)

class EnforcerAgent(LlmAgent):
    """
    The Branding Guideline Enforcer Agent (ADK Version).
    Retrieves rules and constructs compliant prompts.
    """

    def __init__(self, vector_search_service: VectorSearchService, gemini_service: GeminiService):
        
        # Create the tool instance
        self.vector_search_tool = VectorSearchTool(vector_search_service, gemini_service)
        
        # Define the instruction
        instruction = """
        You are the Branding Guideline Enforcer. Your goal is to ensure all generated content adheres to the organization's branding guidelines.
        
        When you receive a user query:
        1.  Analyze the query to understand the desired content.
        2.  Use the `search_branding_guidelines` tool to find relevant branding rules and constraints. Pass the user's query as the search query.
        3.  Synthesize an "Enhanced Prompt" that incorporates the user's original intent AND the retrieved branding rules.
        4.  Output the Enhanced Prompt clearly.
        5.  Also output the list of specific rules you found and applied.
        
        Your final response should be a JSON object with the following structure:
        {
            "enhanced_prompt": "The rewritten prompt...",
            "applied_rules": ["Rule 1", "Rule 2", ...]
        }
        """
        
        super().__init__(
            name="EnforcerAgent",
            model="gemini-3-pro-preview", # Using a capable model for reasoning
            instruction=instruction,
            tools=[self.vector_search_tool],
            description="Enforces branding guidelines by retrieving rules and enhancing prompts."
        )
