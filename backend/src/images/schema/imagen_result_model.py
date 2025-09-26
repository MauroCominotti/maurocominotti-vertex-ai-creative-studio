from typing import Optional

from src.common.base_dto import BaseDto


class CustomImagenResult(BaseDto):
    gcs_uri: Optional[str]
    mime_type: str
    encoded_image: str
    presigned_url: str


class ImageGenerationResult(BaseDto):
    enhanced_prompt: Optional[str]
    rai_filtered_reason: Optional[str]
    image: CustomImagenResult
