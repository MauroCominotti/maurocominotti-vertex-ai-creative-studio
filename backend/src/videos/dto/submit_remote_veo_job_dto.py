from fastapi import Query
from pydantic import Field
from pydantic import field_validator

from src.common.base_dto import (BaseDto, )
from src.videos.dto.create_veo_dto import CreateVeoDto


class SubmitRemoteVeoJobDto(BaseDto):
    media_item_id: str = Field(description="Submitted media item id")
    request_dto: CreateVeoDto = Field(description="Submitted request dto")
