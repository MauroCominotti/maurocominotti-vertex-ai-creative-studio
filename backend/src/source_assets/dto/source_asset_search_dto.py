from typing import Optional

from src.common.base_dto import BaseDto
from src.source_assets.schema.source_asset_model import (
    AssetScopeEnum,
    AssetTypeEnum,
)


class SourceAssetSearchDto(BaseDto):
    """
    Defines the query parameters for paginated search of user assets.
    """

    limit: int = 20
    start_after: Optional[str] = None  # The document ID to start after
    mime_type: Optional[str] = None

    # This fields will ONLY be used if the requester is an ADMIN
    user_email: Optional[str] = None
    scope: Optional[AssetScopeEnum] = None
    asset_type: Optional[AssetTypeEnum] = None
    original_filename: Optional[str] = None
