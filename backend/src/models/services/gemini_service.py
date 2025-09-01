import logging
import uuid
from typing import List

from src.common.base_dto import GenerationModelEnum
from src.common.storage_service import GcsService
from src.images.dto.create_imagen_dto import CreateImagenDto
from src.images.dto.image_dto import ImageDTO
from src.images.dto.image_dto import ImageWrapperDTO
from src.models.base.base_image_service import BaseImageService

from google.genai import types
from google.genai.types import Client


class GeminiService(BaseImageService):
    def _generate_images(
        self,
        genai_client: Client,
        gcs_service: GcsService,
        request_dto: CreateImagenDto,
        gcs_output_directory: str,
        prompt: str,
    ) -> ImageWrapperDTO | types.GenerateImagesResponse | None:
        """
        Generates an image using the Gemini API and returns the image data in a buffer.
        This is a blocking function.

        Returns:
            A tuple containing the BytesIO buffer and the content type, or (None, None) if failed.
        """
        model = GenerationModelEnum.GEMINI_25_FLASH_IMAGE_PREVIEW
        contents = [types.Content(role="user", parts=[types.Part.from_text(text=prompt)])]
        generate_content_config = types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"]
        )

        logging.debug(f"Generating image for prompt: '{prompt}'...")
        stream = genai_client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=generate_content_config,
        )

        for chunk in stream:
            for candidate in chunk.candidates:
                for part in candidate.content.parts:
                    if part.inline_data:
                        # The API returns image data as a base64 encoded string
                        image_data_base64 = part.inline_data.data
                        content_type = part.inline_data.mime_type

                        # Upload using our GCS service
                        image_url = gcs_service.store_to_gcs(
                            folder="gemini_images",
                            file_name=str(uuid.uuid4()),
                            mime_type=content_type,
                            contents=image_data_base64,
                            bucket_name=gcs_output_directory,
                        )
                        return ImageWrapperDTO(
                            image=ImageDTO(
                                gcs_uri=image_url,
                                mime_type=content_type,
                            )
                        )

        logging.debug("No image data found in the API response stream.")
        return None  # Return None if no image was found