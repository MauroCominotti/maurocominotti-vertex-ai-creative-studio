import os
import logging
from typing import List, Optional, Tuple
from google.adk.agents.llm_agent import Agent
from google.adk.tools import FunctionTool
from src.tools.vector_search_tool import create_search_branding_guidelines_tool, create_fetch_guideline_tool
from src.common.vector_search_service import VectorSearchService
from src.multimodal.gemini_service import GeminiService
from src.config.config_service import config_service


logger = logging.getLogger(__name__)

class EnforcerAgent(Agent):
    """
    Enforces branding guidelines by retrieving rules and enhancing prompts.
    Retrieves rules and constructs compliant prompts.
    """

    def __init__(self, vector_search_service: VectorSearchService, gemini_service: GeminiService):
        
        os.environ["GOOGLE_CLOUD_PROJECT"] = config_service.PROJECT_ID
        os.environ["GOOGLE_CLOUD_LOCATION"] = config_service.LOCATION
        os.environ["ADK_LOG_LEVEL"] = "DEBUG"
            
        # Set this to ensure the SDK uses Vertex AI path, not AI Studio path
        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "true" 

        # Create the tool instances
        search_tool_func = create_search_branding_guidelines_tool(vector_search_service, gemini_service)
        fetch_tool_func = create_fetch_guideline_tool()
        
        # --- FIXED INSTRUCTION BELOW ---
        instruction = """
        You are the Branding Guideline Enforcer. Your goal is to ensure all generated content adheres to the organization's branding guidelines.
        
        CRITICAL TOOL USE INSTRUCTIONS:
        1. You MUST use the `search_branding_guidelines` tool for EVERY request to find relevant rules.
        2. If the search results are insufficient or reference a specific guideline ID, use `fetch_full_guideline` to get more details.
        3. **DO NOT write Python code.** 
        4. **DO NOT use `print()` or `my_tools.`.**
        5. Simply generate a standard function call for the tool.
        
        Step-by-Step Logic:
        1. **Analyze**: Understand the user's core intent (e.g., "social media ad for Product X") and **IDENTIFY the Workspace ID** from the context.
        2. **Retrieve**: Call `search_branding_guidelines(query=..., workspace_id=...)`. **ALWAYS** pass the Workspace ID from the context.
        3. **Deep Dive (Optional)**: If needed, call `fetch_full_guideline(guideline_id=...)`.
        4. **Synthesize**: Construct an "Enhanced Prompt" that combines user intent with strict branding constraints.
        5. **Execute**: Output the final response as a JSON object.
        
        Your final response MUST be a valid JSON object with the following structure:
        {
            "enhanced_prompt": "The fully rewritten prompt ready for image/video generation...",
            "applied_rules": ["Rule 1: Logo must be bottom-right", "Rule 2: Use Hex #F4F4F4", ...],
            "reference_image_uris": ["gs://bucket/path/to/image1.png", ...]
        }
        """

        super().__init__(
            name="EnforcerAgent",
            model="gemini-2.5-pro", 
            instruction=instruction,
            tools=[search_tool_func, fetch_tool_func],
            description="Enforces branding guidelines by retrieving rules and enhancing prompts.",
        )
        
        tool_names = []
        for t in self.tools:
            if hasattr(t, 'name'):
                tool_names.append(t.name)
            elif hasattr(t, '__name__'):
                tool_names.append(t.__name__)
            else:
                tool_names.append(str(t))
        logger.info(f"EnforcerAgent initialized with tools: {tool_names}")