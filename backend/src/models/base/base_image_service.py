import asyncio
import time
from abc import ABC
from abc import abstractmethod
from abc import abstractmethod
from abc import abstractmethod
from abc import abstractmethod
from abc import abstractmethod
from typing import List
from typing import List

from google.genai import Client
from google.genai import types
from google.genai import types
from tenacity import retry
from tenacity import retry_if_exception_type
from tenacity import stop_after_attempt
from tenacity import wait_exponential

from src.auth.iam_signer_credentials_service import IamSignerCredentials
from src.common.base_dto import MimeTypeEnum
from src.common.base_dto import MimeTypeEnum
from src.common.base_dto import MimeTypeEnum
from src.common.base_dto import MimeTypeEnum
from src.common.base_dto import MimeTypeEnum
from src.common.base_dto import MimeTypeEnum
from src.common.base_dto import MimeTypeEnum
from src.common.schema.genai_model_setup import GenAIModelSetup
from src.common.schema.media_item_model import JobStatusEnum
from src.common.schema.media_item_model import MediaItemModel
from src.common.storage_service import GcsService
from src.common.storage_service import GcsService
from src.config.config_service import ConfigService
from src.galleries.dto.gallery_response_dto import MediaItemResponse
from src.galleries.dto.gallery_response_dto import MediaItemResponse
from src.images.dto.create_imagen_dto import CreateImagenDto
from src.images.dto.create_imagen_dto import CreateImagenDto
from src.images.dto.edit_imagen_dto import EditImagenDto
from src.images.dto.image_dto import ImageWrapperDTO
from src.images.dto.upscale_imagen_dto import UpscaleImagenDto
from src.images.dto.upscale_imagen_dto import UpscaleImagenDto
from src.images.dto.upscale_imagen_dto import UpscaleImagenDto
from src.images.imagen_service import logger
from src.images.repository.media_item_repository import MediaRepository
from src.images.schema.imagen_result_model import ImageGenerationResult
from src.images.schema.imagen_result_model import ImageGenerationResult
from src.images.schema.imagen_result_model import ImageGenerationResult
from src.multimodal.gemini_service import GeminiService
from src.multimodal.gemini_service import PromptTargetEnum


class BaseImageService(ABC):
    def __init__(self):
        """Initializes the service with its dependencies."""
        self.iam_signer_credentials = IamSignerCredentials()
        self.media_repo = MediaRepository()
        self.gemini_service = GeminiService()
        self.gcs_service = GcsService()

    @retry(
        wait=wait_exponential(
            multiplier=1, min=1, max=10
        ),  # Exponential backoff (1s, 2s, 4s... up to 10s)
        stop=stop_after_attempt(3),  # Stop after 3 attempts
        retry=retry_if_exception_type(
            Exception
        ),  # Retry on all exceptions for robustness
        reraise=True,  # re-raise the last exception if all retries fail
    )
    async def generate_images(
        self, request_dto: CreateImagenDto, user_email: str
    ) -> MediaItemResponse | None:
        """
           Generates a batch of images and saves them as a single MediaItem document.
           """
        start_time = time.monotonic()

        client = GenAIModelSetup.init()
        cfg = ConfigService()
        gcs_output_directory = f"gs://{cfg.GENMEDIA_BUCKET}"

        original_prompt = request_dto.prompt
        rewritten_prompt = self.gemini_service.enhance_prompt_from_dto(
            dto=request_dto, target_type=PromptTargetEnum.IMAGE
        )
        request_dto.prompt = rewritten_prompt

        all_generated_images: List[types.GeneratedImage] = []

        try:
            all_generated_images = self._generate_images(
                genai_client=client,
                gcs_service=self.gcs_service,
                request_dto=request_dto,
                gcs_output_directory=gcs_output_directory,
            )

            if not all_generated_images:
                return None

            # --- UNIFIED PROCESSING AND SAVING ---
            # Create the list of permanent GCS URIs and the response for the frontend
            valid_generated_images = [
                img
                for img in all_generated_images
                if img.image and img.image.gcs_uri
            ]
            mime_type: MimeTypeEnum = (
                MimeTypeEnum.IMAGE_PNG
                if valid_generated_images[0].image
                   and valid_generated_images[0].image.mime_type
                   == MimeTypeEnum.IMAGE_PNG
                else MimeTypeEnum.IMAGE_JPEG
            )

            # 1. Upscale images if needed
            if request_dto.upscale_factor:
                upscale_dtos: list[UpscaleImagenDto] = [
                    UpscaleImagenDto(
                        generation_model=request_dto.generation_model,
                        user_image=img.image.gcs_uri or "",
                        mime_type=(
                            MimeTypeEnum.IMAGE_PNG
                            if img.image.mime_type
                               == MimeTypeEnum.IMAGE_PNG.value
                            else MimeTypeEnum.IMAGE_JPEG
                        ),
                        upscale_factor=request_dto.upscale_factor,
                    )
                    for img in valid_generated_images
                    if img.image
                ]
                upscale_images = []
                tasks = [
                    self.upscale_image(request_dto=dto) for dto in upscale_dtos
                ]
                upscale_images = await asyncio.gather(*tasks)

                permanent_gcs_uris = [
                    img.image.gcs_uri
                    for img in upscale_images
                    if img and img.image and img.image.gcs_uri
                ]
            else:
                permanent_gcs_uris = [
                    img.image.gcs_uri
                    for img in valid_generated_images
                    if img.image and img.image.gcs_uri
                ]

            # 2. Create and run tasks to generate all presigned URLs in parallel
            presigned_url_tasks = [
                asyncio.to_thread(
                    self.iam_signer_credentials.generate_presigned_url, uri
                )
                for uri in permanent_gcs_uris
            ]
            presigned_urls = await asyncio.gather(*presigned_url_tasks)

            end_time = time.monotonic()
            generation_time = end_time - start_time

            # Create and save a SINGLE MediaItem for the entire batch
            media_post_to_save = MediaItemModel(
                # Core Props
                user_email=user_email,
                mime_type=mime_type,
                model=request_dto.generation_model,
                # Common Props
                prompt=rewritten_prompt,
                original_prompt=original_prompt,
                num_media=len(permanent_gcs_uris),
                generation_time=generation_time,
                aspect_ratio=request_dto.aspect_ratio,
                gcs_uris=permanent_gcs_uris,
                status=JobStatusEnum.COMPLETED,
                # Styling props
                style=request_dto.style,
                lighting=request_dto.lighting,
                color_and_tone=request_dto.color_and_tone,
                composition=request_dto.composition,
                negative_prompt=request_dto.negative_prompt,
                add_watermark=request_dto.add_watermark,
            )
            self.media_repo.save(media_post_to_save)

            return MediaItemResponse(
                **media_post_to_save.model_dump(),
                presigned_urls=presigned_urls,
            )

        except Exception as e:
            logger.error(f"Image generation API call failed: {e}")
            raise

    @abstractmethod
    async def _generate_images(
        self,
        genai_client: Client,
        gcs_service: GcsService,
        request_dto: CreateImagenDto,
        gcs_output_directory: str,
        prompt: str,
    ) -> ImageWrapperDTO | types.GenerateImagesResponse | None:
        pass
