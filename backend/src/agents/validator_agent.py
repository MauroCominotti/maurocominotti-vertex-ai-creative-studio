import os
import logging
from typing import List, Dict, Any
from google.adk.agents.llm_agent import Agent as LlmAgent
from src.multimodal.gemini_service import GeminiService
from src.config.config_service import config_service

logger = logging.getLogger(__name__)

class ValidatorAgent(LlmAgent):
    """
    The Validator Agent (ADK Version).
    Audits generated assets against branding rules using Gemini Vision.
    """

    def __init__(self):
        
        # Note: For the Validator, we rely on the multimodal model's native capabilities.
        # The ADK `Runner.run` accepts `types.Content`, which can include image/audio parts.

        os.environ["GOOGLE_CLOUD_PROJECT"] = config_service.PROJECT_ID
        os.environ["GOOGLE_CLOUD_LOCATION"] = config_service.LOCATION
        os.environ["ADK_LOG_LEVEL"] = "DEBUG"
            
        # Set this to ensure the SDK uses Vertex AI path, not AI Studio path
        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "true" 
        
        instruction = """
        You are a strict Brand Compliance Auditor.
        Your task is to verify if the provided media asset (image or audio) strictly adheres to the branding rules provided in the context.
        
        Input Context:
        - You will receive a media asset (image or audio).
        - You will receive a list of "Applied Rules" that the asset must follow.
        
        Task:
        1. **Visual/Audio Inspection**: Analyze the asset thoroughly.
        2. **Rule Verification**: Check each rule one by one against the asset.
           - Example: If rule says "Logo bottom-right", check if logo is actually there.
           - Example: If rule says "No people", check if people are present.
        3. **Decision**: Determine if the asset is compliant.
        
        Output a JSON object:
        {
            "is_compliant": boolean,
            "reasoning": "Detailed explanation of which rules passed and which failed. Be specific."
        }
        """        

        super().__init__(
            name="ValidatorAgent",
            model="gemini-2.5-flash", # Multimodal capable model
            instruction=instruction,
            description="Audits media assets against branding rules."
        )
