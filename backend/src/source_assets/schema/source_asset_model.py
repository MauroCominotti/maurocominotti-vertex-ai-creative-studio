from enum import Enum
from typing import Optional

from pydantic import Field

from src.common.base_dto import AspectRatioEnum, MimeTypeEnum
from src.common.base_repository import BaseDocument


class AssetScopeEnum(str, Enum):
    """Defines who can access an asset."""

    PRIVATE = "private"  # Belongs to a single user
    SYSTEM = "system"  # Available to all users (e.g., VTO models)


class AssetTypeEnum(str, Enum):
    """Defines the purpose of an asset for easier filtering."""

    GENERIC_IMAGE = "generic_image"
    GENERIC_VIDEO = "generic_video"
    VTO_PRODUCT = "vto_product"
    VTO_PERSON_FEMALE = "vto_person_female"
    VTO_PERSON_MALE = "vto_person_male"
    VTO_TOP = "vto_top"
    VTO_BOTTOM = "vto_bottom"
    VTO_DRESS = "vto_dress"
    VTO_SHOE = "vto_shoe"


class SourceAssetModel(BaseDocument):
    """
    Represents any uploaded asset, from a user's photo to a system-wide VTO model.
    It MUST belong to a workspace.
    Its visibility is controlled by its 'scope'.
    """
    workspace_id: str = Field(
        description="Foreign key (ID) to the 'workspaces' collection."
    )
    user_id: str = Field(
        description="User ID of the person who uploaded this specific file."
    )
    gcs_uri: str
    original_filename: str
    mime_type: MimeTypeEnum
    aspect_ratio: AspectRatioEnum = AspectRatioEnum.RATIO_1_1
    file_hash: str  # SHA-256 hash of the original file for de-duplication
    scope: AssetScopeEnum = AssetScopeEnum.PRIVATE
    asset_type: AssetTypeEnum = AssetTypeEnum.GENERIC_IMAGE
    thumbnail_gcs_uri: Optional[str] = None  # In case of uploading a video
    """
    Describes the asset's intrinsic IDENTITY. It answers the question "What IS this file?".
    This is for categorizing the asset library (e.g., for an admin to find all 'VTO_PERSON' models).
    Think of this as the actor's real name (e.g., "Tom Hanks").
    """
