import logging
import os
from typing import Annotated, Optional

from fastapi import Header, HTTPException
from google import genai
from google.genai import types
from httpx import Client as RestClient

from src.common.schema.genai_model_setup import GenAIModelSetup
from src.workflows_executor.dto.workflows_executor_dto import (
    GenerateTextRequest,
    GenerateImageRequest,
    EditImageRequest,
    GenerateVideoRequest,
    CropImageRequest,
    VirtualTryOnRequest,
)
from src.config.config_service import config_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WorkflowsExecutorService:
    def __init__(self):
        self.backend_url = config_service.BACKEND_URL
        self.rest_client = RestClient(timeout=300)
        self.genai_client = GenAIModelSetup.init()

    async def generate_text(self, request: GenerateTextRequest):
        generate_content_config = types.GenerateContentConfig(
            temperature=request.config.temperature,
            top_p=0.95,
            max_output_tokens=65535,
            safety_settings=[
                types.SafetySetting(
                    category="HARM_CATEGORY_HATE_SPEECH", threshold="OFF"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="OFF"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="OFF"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_HARASSMENT", threshold="OFF"
                ),
            ],
        )

        text = ""
        # Note: The original code used a stream but returned the full text at the end.
        # Keeping this behavior for now.
        for chunk in self.genai_client.models.generate_content_stream(
            model=request.config.model,
            contents=request.inputs.prompt,
            config=generate_content_config,
        ):
            if chunk.text:
                text += chunk.text
        return {"generated_text": text}

    async def generate_image(self, request: GenerateImageRequest, authorization: str | None = None):
        logger.info(f"Generate image execution")

        url = self.backend_url + "/api/images/generate-images"

        body = {
            "prompt": request.inputs.prompt,
            "workspace_id": request.workspace_id,
            "generation_model": request.config.model,
            "aspect_ratio": request.config.aspect_ratio,
            "use_brand_guidelines": request.config.brand_guidelines,
            "number_of_media": 1,
        }

        headers = {"Authorization": authorization} if authorization else {}

        logger.info(
            f"Call backend with url: {url}, body: {body}, headers: {headers}"
        )

        response = self.rest_client.post(url, json=body, headers=headers)
        
        if response.status_code != 200:
             logger.error(f"Backend error: {response.text}")
             raise HTTPException(status_code=response.status_code, detail=f"Backend error: {response.text}")

        dict_response = response.json()
        image_id = dict_response.get("id", None)
        if not image_id:
            raise HTTPException(status_code=500, detail="Couldn't create image")
        return {"generated_image": image_id}

    async def edit_image(self, request: EditImageRequest, authorization: str | None = None):
        logger.info(f"Edit image execution")

        url = self.backend_url + "/api/images/generate-images"

        input_images = request.inputs.input_images
        source_media_items = []
        
        # Handle different input types for input_images
        if isinstance(input_images, str):
            source_media_items = [
                {"media_item_id": input_images, "media_index": 0, "role": "input"}
            ]
        elif isinstance(input_images, list):
            source_media_items = [
                {"media_item_id": image, "media_index": 0, "role": "input"}
                for image in input_images
            ]

        body = {
            "prompt": request.inputs.prompt,
            "workspace_id": request.workspace_id,
            "generation_model": request.config.model,
            "aspect_ratio": request.config.aspect_ratio,
            "use_brand_guidelines": request.config.brand_guidelines,
            "number_of_media": 1,
            "source_media_items": source_media_items,
        }

        headers = {"Authorization": authorization} if authorization else {}

        logger.info(
            f"Call backend with url: {url}, body: {body}, headers: {headers}"
        )

        response = self.rest_client.post(url, json=body, headers=headers)
        
        if response.status_code != 200:
             logger.error(f"Backend error: {response.text}")
             raise HTTPException(status_code=response.status_code, detail=f"Backend error: {response.text}")
             
        return response.json()

    async def generate_video(self, request: GenerateVideoRequest):
        # logic here
        return {"generated_video": "https://example.com/dummy_video.mp4"}

    async def crop_image(self, request: CropImageRequest):
        # logic here
        return {"cropped_image": "https://example.com/cropped_image.png"}

    async def virtual_try_on(self, request: VirtualTryOnRequest):
        # logic here
        return {"vto_image": "https://example.com/vto_image.png"}
