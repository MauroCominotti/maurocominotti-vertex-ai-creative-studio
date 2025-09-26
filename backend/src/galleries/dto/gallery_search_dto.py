from typing import Optional

from pydantic import Field

from src.common.base_dto import BaseDto
from src.common.dto.base_search_dto import BaseSearchDto
from src.common.schema.media_item_model import JobStatusEnum
from src.galleries.dto.gallery_response_dto import MediaItemResponse


class GallerySearchDto(BaseSearchDto):
    user_email: Optional[str] = None
    mime_type: Optional[str] = None
    model: Optional[str] = None
    status: Optional[JobStatusEnum] = None
    workspace_id: str = Field(
        min_length=1, description="The ID of the workspace to search within."
    )
