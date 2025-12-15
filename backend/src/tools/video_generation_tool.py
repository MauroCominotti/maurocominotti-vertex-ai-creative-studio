from typing import Optional
from google.adk.tools import BaseTool
from src.videos.veo_service import VeoService
from src.videos.dto.create_veo_dto import CreateVeoDto
from src.common.base_dto import AspectRatioEnum, GenerationModelEnum
from src.users.user_model import UserModel
from concurrent.futures import ThreadPoolExecutor

class VideoGenerationTool(BaseTool):
    """
    Tool for generating videos using Veo.
    """
    
    def __init__(self, veo_service: VeoService, current_user: UserModel, executor: ThreadPoolExecutor):
        super().__init__(
            name="generate_video",
            description="Generates a video based on a text prompt. Use this to create video assets."
        )
        self.veo_service = veo_service
        self.current_user = current_user
        self.executor = executor

    def run(self, prompt: str, aspect_ratio: str = "16:9", duration_seconds: int = 5, generate_audio: bool = False, workspace_id: str = "Global") -> str:
        """
        Executes the video generation.
        """
        try:
            dto = CreateVeoDto(
                prompt=prompt,
                aspect_ratio=AspectRatioEnum(aspect_ratio),
                duration_seconds=duration_seconds,
                generate_audio=generate_audio,
                workspace_id=workspace_id,
                generation_model=GenerationModelEnum.VEO_3_QUALITY # Default to latest
            )
            
            # VeoService.start_video_generation_job returns a MediaItemResponse immediately (placeholder)
            # The actual generation happens in background.
            result = self.veo_service.start_video_generation_job(dto, self.current_user, self.executor)
            
            return f"Video generation started. Job ID: {result.id}. Status: {result.status}. Please check back later for the result."
            
        except Exception as e:
            return f"Error starting video generation: {str(e)}"
