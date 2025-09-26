from typing import Optional

from pydantic import Field

from src.common.dto.base_search_dto import BaseSearchDto


class BrandGuidelineSearchDto(BaseSearchDto):
    """Data Transfer Object for searching brand guidelines."""

    workspace_id: str = Field(
        min_length=1, description="The ID of the workspace to search within.")
