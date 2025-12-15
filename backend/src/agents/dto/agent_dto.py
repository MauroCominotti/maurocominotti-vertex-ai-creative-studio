from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class MediaTypeEnum(str, Enum):
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    AUDIO = "AUDIO"

class AgentGenerationRequest(BaseModel):
    prompt: str
    workspace_id: Optional[str] = None
    media_type: MediaTypeEnum = Field(default=MediaTypeEnum.IMAGE)
    
    # Image Specific
    aspect_ratio: str = "1:1"
    number_of_images: int = 1
    
    # Video Specific
    duration_seconds: int = 5
    generate_audio: bool = False
    
    # Audio Specific
    audio_type: str = "SPEECH" # MUSIC or SPEECH
    voice_name: Optional[str] = "Puck"
    
    # Multimodal
    reference_image_uri: Optional[str] = None

class AgentGenerationResponse(BaseModel):
    original_prompt: str
    enhanced_prompt: str
    generated_assets: List[dict] # Contains uri, validation_status, reasoning
