import logging
import os
import asyncio

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
from src.workflows.schema.workflow_model import ReferenceImage
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

    async def _poll_job_status(self, media_id: int, authorization: str | None = None):
        """
        Polls the gallery endpoint until the job is completed or failed.
        """
        
        url = f"{self.backend_url}/api/gallery/item/{media_id}"
        headers = {"Authorization": authorization} if authorization else {}
        
        # Poll configuration
        initial_delay = 2
        poll_interval = 5
        timeout = 300  # 5 minutes timeout
        
        await asyncio.sleep(initial_delay)
        
        start_time = asyncio.get_event_loop().time()
        
        while True:
            current_time = asyncio.get_event_loop().time()
            if current_time - start_time > timeout:
                raise HTTPException(status_code=504, detail="Image generation timed out")
                
            try:
                response = self.rest_client.get(url, headers=headers)
                if response.status_code != 200:
                    logger.warning(f"Polling failed with status {response.status_code}: {response.text}")
                    # Don't raise immediately on transient errors, maybe? 
                    # But 404 or 403 might be permanent. 
                    # For now, let's assume if we can't get status, we should probably fail or retry carefully.
                    # If it's 404, maybe it's not ready yet? But it should be created immediately.
                    if response.status_code == 404:
                         # Maybe eventual consistency?
                         pass
                    else:
                        raise HTTPException(status_code=response.status_code, detail=f"Polling error: {response.text}")
                else:
                    data = response.json()
                    status = data.get("status")
                    
                    if status == "completed":
                        return True
                    elif status == "failed":
                        error_message = data.get("error_message") or data.get("errorMessage") or "Unknown error"
                        raise HTTPException(status_code=500, detail=f"Image generation failed: {error_message}")
            except Exception as e:
                # If it's already an HTTPException, re-raise it
                if isinstance(e, HTTPException):
                    raise e
                logger.error(f"Error during polling: {e}")
                # Continue polling? Or fail? 
                # If we can't check status, we might be blind.
            
            await asyncio.sleep(poll_interval)

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
            
        # Poll for completion
        await self._poll_job_status(image_id, authorization)
        
        return {"generated_image": image_id}

    async def edit_image(self, request: EditImageRequest, authorization: str | None = None):
        logger.info(f"Edit image execution")

        url = self.backend_url + "/api/images/generate-images"

        input_images = request.inputs.input_images
        source_media_items = []
        source_asset_ids = []
        
        # Handle different input types for input_images
        if isinstance(input_images, int):
            source_media_items = [
                {"media_item_id": input_images, "media_index": 0, "role": "input"}
            ]
        elif isinstance(input_images, list):
            for image in input_images:
                if isinstance(image, int):
                    source_media_items.append({"media_item_id": image, "media_index": 0, "role": "input"})
                elif isinstance(image, ReferenceImage):
                    if image.sourceMediaItem:
                        source_media_items.append({
                            "media_item_id": image.sourceMediaItem.mediaItemId,
                            "media_index": image.sourceMediaItem.mediaIndex,
                            "role": image.sourceMediaItem.role
                        })
                    elif image.sourceAssetId:
                        source_asset_ids.append(image.sourceAssetId)

        body = {
            "prompt": request.inputs.prompt,
            "workspace_id": request.workspace_id,
            "generation_model": request.config.model,
            "aspect_ratio": request.config.aspect_ratio,
            "use_brand_guidelines": request.config.brand_guidelines,
            "number_of_media": 1,
            "source_media_items": source_media_items,
            "source_asset_ids": source_asset_ids,
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
            raise HTTPException(status_code=500, detail="Couldn't edit image")
        
        # Poll for completion
        await self._poll_job_status(image_id, authorization)
        
        return {"edited_image": image_id}

    async def generate_video(self, request: GenerateVideoRequest):
        # logic here
        return {"generated_video": "https://example.com/dummy_video.mp4"}

    async def crop_image(self, request: CropImageRequest):
        # logic here
        return {"cropped_image": "https://example.com/cropped_image.png"}

    def _map_to_vto_input_link(self, input_data: int | list | ReferenceImage) -> Optional[dict]:
        if not input_data:
            return None
            
        # If input is a list, take the first element
        if isinstance(input_data, list):
            if len(input_data) == 0:
                return None
            input_data = input_data[0]
            
        # Handle ReferenceImage
        if isinstance(input_data, ReferenceImage):
            if input_data.sourceMediaItem:
                return {
                    "source_media_item": {
                        "media_item_id": input_data.sourceMediaItem.mediaItemId,
                        "media_index": input_data.sourceMediaItem.mediaIndex,
                    }
                }
            elif input_data.sourceAssetId:
                return {"source_asset_id": input_data.sourceAssetId}
                
        if isinstance(input_data, int):
            return {
                "source_media_item": {
                    "media_item_id": input_data,
                    "media_index": 0,
                }
            }
            
        return None

    async def virtual_try_on(self, request: VirtualTryOnRequest, authorization: str | None = None):
        logger.info(f"Virtual Try On execution")
        
        url = self.backend_url + "/api/images/generate-images-for-vto"
        
        # Map inputs
        person_image = self._map_to_vto_input_link(request.inputs.model_image)
        top_image = self._map_to_vto_input_link(request.inputs.top_image)
        bottom_image = self._map_to_vto_input_link(request.inputs.bottom_image)
        dress_image = self._map_to_vto_input_link(request.inputs.dress_image)
        shoes_image = self._map_to_vto_input_link(request.inputs.shoes_image)
        
        # Ensure person_image is present (it's required in VtoDto)
        if not person_image:
             raise HTTPException(status_code=400, detail="Person image is required for Virtual Try-On")

        body = {
            "workspace_id": request.workspace_id,
            "number_of_media": 1, # Default to 1 as per other methods or config? VtoDto defaults to 1.
            "person_image": person_image,
            "top_image": top_image,
            "bottom_image": bottom_image,
            "dress_image": dress_image,
            "shoe_image": shoes_image,
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
            raise HTTPException(status_code=500, detail="Couldn't create VTO image")
        
        # Poll for completion
        await self._poll_job_status(image_id, authorization)
        
        return {"generated_image": image_id}
