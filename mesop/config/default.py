import os
from dataclasses import dataclass, field
import json
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import List, Optional, TypedDict

# from models.image_models import ImageModel # Remove this import

load_dotenv(override=True)


# Define ImageModel here
class ImageModel(TypedDict):
    """Defines Models For Image Generation."""

    display: str
    model_name: str

class NavItem(BaseModel):
    id: int
    display: str
    icon: str
    route: Optional[str] = None
    group: Optional[str] = None
    align: Optional[str] = None
    feature_flag: Optional[str] = None
    feature_flag_not: Optional[str] = None

class NavConfig(BaseModel):
    pages: List[NavItem]


@dataclass
class Default:
    """Defaults class"""

    # Gemini
    PROJECT_ID: str = os.environ.get("PROJECT_ID")
    LOCATION: str = os.environ.get("LOCATION", "us-central1")
    MODEL_ID: str = os.environ.get("MODEL_ID", "gemini-2.5-flash")
    INIT_VERTEX: bool = True
    GEMINI_AUDIO_ANALYSIS_MODEL_ID: str = os.environ.get("GEMINI_AUDIO_ANALYSIS_MODEL_ID", "gemini-2.5-flash")

    # Collections
    GENMEDIA_FIREBASE_DB: str = os.environ.get("GENMEDIA_FIREBASE_DB", "(default)")
    GENMEDIA_COLLECTION_NAME: str = os.environ.get(
        "GENMEDIA_COLLECTION_NAME", "genmedia"
    )

    # storage
    GENMEDIA_BUCKET: str = os.environ.get("GENMEDIA_BUCKET", f"{PROJECT_ID}-assets")
    VIDEO_BUCKET: str = os.environ.get("VIDEO_BUCKET", f"{PROJECT_ID}-assets/videos")
    IMAGE_BUCKET: str = os.environ.get("IMAGE_BUCKET", f"{PROJECT_ID}-assets/images")

    # Veo
    VEO_MODEL_ID: str = os.environ.get("VEO_MODEL_ID", "veo-2.0-generate-001")
    VEO_PROJECT_ID: str = os.environ.get("VEO_PROJECT_ID", PROJECT_ID)

    VEO_EXP_MODEL_ID: str = os.environ.get("VEO_EXP_MODEL_ID", "veo-3.0-generate-preview")
    VEO_EXP_FAST_MODEL_ID: str = os.environ.get("VEO_EXP_FAST_MODEL_ID", "veo-3.0-fast-generate-preview")
    VEO_EXP_PROJECT_ID: str = os.environ.get("VEO_EXP_PROJECT_ID", PROJECT_ID)

    # VTO
    VTO_MODEL_ID: str = os.environ.get("VTO_MODEL_ID", "virtual-try-on-exp-05-31")
    
    # Lyria
    LYRIA_MODEL_VERSION: str = os.environ.get("LYRIA_MODEL_VERSION", "lyria-002")
    LYRIA_PROJECT_ID: str = os.environ.get("LYRIA_PROJECT_ID")
    MEDIA_BUCKET: str = os.environ.get("MEDIA_BUCKET", f"{PROJECT_ID}-assets")
    
    # Imagen
    MODEL_IMAGEN2 = "imagegeneration@006"
    MODEL_IMAGEN_NANO = "imagegeneration@004"
    MODEL_IMAGEN_FAST = "imagen-3.0-fast-generate-001"
    MODEL_IMAGEN = "imagen-3.0-generate-002"
    MODEL_IMAGEN4 = "imagen-4.0-generate-preview-06-06"
    MODEL_IMAGEN4_FAST = "imagen-4.0-fast-generate-preview-06-06"
    MODEL_IMAGEN4_ULTRA = "imagen-4.0-ultra-generate-preview-06-06"
    MODEL_IMAGEN_EDITING = "imagen-3.0-capability-001"
    MODEL_IMAGEN_PRODUCT_RECONTEXT: str = os.environ.get("MODEL_IMAGEN_PRODUCT_RECONTEXT", "imagen-product-recontext-preview-06-30")

    IMAGEN_GENERATED_SUBFOLDER: str = os.environ.get("IMAGEN_GENERATED_SUBFOLDER", "generated_images")
    IMAGEN_EDITED_SUBFOLDER: str = os.environ.get("IMAGEN_EDITED_SUBFOLDER", "edited_images")
    
    IMAGEN_PROMPTS_JSON = "prompts/imagen_prompts.json"
    
  
    image_modifiers: list[str] = field(
        default_factory=lambda: [
            "aspect_ratio",
            "content_type",
            "color_tone",
            "lighting",
            "composition",
        ]
    )
    
    


def load_welcome_page_config():
    with open('config/navigation.json', 'r') as f:
        data = json.load(f)

    # This will raise a validation error if the JSON is malformed
    config = NavConfig(**data)

    def is_feature_enabled(page: NavItem):
        if page.feature_flag:
            return bool(getattr(Default, page.feature_flag, False))
        if page.feature_flag_not:
            return not bool(getattr(Default, page.feature_flag_not, False))
        return True

    filtered_pages = [page.model_dump(exclude_none=True) for page in config.pages if is_feature_enabled(page)]

    return sorted(filtered_pages, key=lambda x: x['id'])

WELCOME_PAGE = load_welcome_page_config()
