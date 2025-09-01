from dataclasses import dataclass, field
from os import getenv
import google.auth

@dataclass
class ConfigService:
    """ConfigService class"""

    # Google Identity Platform Auth
    IAP_AUDIENCE = getenv("IAP_AUDIENCE", "")

    # Gemini
    _, project_id = google.auth.default()
    PROJECT_ID: str = getenv("PROJECT_ID", project_id or "")
    LOCATION: str = getenv("LOCATION", "global")
    GEMINI_MODEL_ID: str = getenv("GEMINI_MODEL_ID", "gemini-2.5-flash")
    INIT_VERTEX: bool = True
    GEMINI_AUDIO_ANALYSIS_MODEL_ID: str = getenv(
        "GEMINI_AUDIO_ANALYSIS_MODEL_ID", "gemini-2.5-flash"
    )

    # Collections
    GENMEDIA_FIREBASE_DB: str = getenv("GENMEDIA_FIREBASE_DB", "(default)")
    GENMEDIA_COLLECTION_NAME: str = getenv(
        "GENMEDIA_COLLECTION_NAME", "genmedia"
    )

    # storage
    GENMEDIA_BUCKET: str = getenv("GENMEDIA_BUCKET", f"{PROJECT_ID}-assets")
    VIDEO_BUCKET: str = getenv("VIDEO_BUCKET", f"{PROJECT_ID}-assets/videos")
    IMAGE_BUCKET: str = getenv("IMAGE_BUCKET", f"{PROJECT_ID}-assets/images")

    # Veo
    VEO_MODEL_ID: str = getenv("VEO_MODEL_ID", "veo-2.0-generate-001")
    VEO_PROJECT_ID: str = getenv("VEO_PROJECT_ID", PROJECT_ID)

    VEO_EXP_MODEL_ID: str = getenv("VEO_EXP_MODEL_ID", "veo-3.0-generate-preview")
    VEO_EXP_FAST_MODEL_ID: str = getenv("VEO_EXP_FAST_MODEL_ID", "veo-3.0-fast-generate-preview")
    VEO_EXP_PROJECT_ID: str = getenv("VEO_EXP_PROJECT_ID", PROJECT_ID)

    # VTO
    VTO_MODEL_ID: str = getenv("VTO_MODEL_ID", "virtual-try-on-exp-05-31")

    # Lyria
    LYRIA_MODEL_VERSION: str = getenv("LYRIA_MODEL_VERSION", "lyria-002")
    LYRIA_PROJECT_ID: str = getenv("LYRIA_PROJECT_ID", "")
    MEDIA_BUCKET: str = getenv("MEDIA_BUCKET", f"{PROJECT_ID}-assets")

    # Imagen
    MODEL_IMAGEN_PRODUCT_RECONTEXT: str = getenv("MODEL_IMAGEN_PRODUCT_RECONTEXT", "imagen-product-recontext-preview-06-30")

    IMAGEN_GENERATED_SUBFOLDER: str = getenv("IMAGEN_GENERATED_SUBFOLDER", "generated_images")
    IMAGEN_EDITED_SUBFOLDER: str = getenv("IMAGEN_EDITED_SUBFOLDER", "edited_images")

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
