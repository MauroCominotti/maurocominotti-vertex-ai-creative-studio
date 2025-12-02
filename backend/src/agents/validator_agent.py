import logging
from typing import List, Dict, Any
from google.adk.agents.llm_agent import Agent as LlmAgent
from src.multimodal.gemini_service import GeminiService

logger = logging.getLogger(__name__)

class ValidatorAgent(LlmAgent):
    """
    The Validator Agent (ADK Version).
    Audits generated assets against branding rules using Gemini Vision.
    """

    def __init__(self, gemini_service: GeminiService):
        
        # Note: For the Validator, we might not need a tool if we pass the image URI in the prompt 
        # and let the multimodal model handle it directly.
        # However, ADK's LlmAgent handles text-based interaction. 
        # To handle images, we need to ensure the `Runner` or the agent can accept multimodal content.
        # The ADK `Runner.run` accepts `types.Content`, which can include image parts.
        
        instruction = """
        You are a strict Brand Compliance Auditor.
        Your task is to verify if the provided image strictly adheres to the branding rules provided in the context.
        
        Input Context:
        - You will receive an image (or a reference to it).
        - You will receive a list of "Applied Rules" that the image must follow.
        
        Task:
        1. Analyze the image visually.
        2. Check each rule one by one.
        3. Determine if the image is compliant.
        
        Output a JSON object:
        {
            "is_compliant": boolean,
            "reasoning": "Detailed explanation of which rules passed and which failed."
        }
        """
        
        super().__init__(
            name="ValidatorAgent",
            model="gemini-2.5-flash", # Vision capable model
            instruction=instruction,
            description="Visually audits images against branding rules."
        )
