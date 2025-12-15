from typing import Optional, List, Dict, Any
from google.adk.tools import BaseTool
from src.images.imagen_service import ImagenService
from src.images.dto.create_imagen_dto import CreateImagenDto, AspectRatioEnum
from src.users.user_model import UserModel

class ImagenTool(BaseTool):
    """
    Tool for generating images using Imagen.
    """
    
    def __init__(self, imagen_service: ImagenService, current_user: UserModel):
        super().__init__(
            name="generate_image",
            description="Generates an image based on a text prompt. Use this to create visual assets."
        )
        self.imagen_service = imagen_service
        self.current_user = current_user

    async def run(
        self,
        prompt: str,
        aspect_ratio: str = "1:1",
        number_of_images: int = 1,
        reference_image_gcs_uris: list[str] = None,
        workspace_id: str = "global",
    ) -> str:
        """
        Generates images using Imagen 3.
        
        Args:
            prompt (str): The prompt to generate images from.
            aspect_ratio (str): The aspect ratio of the generated images.
            number_of_images (int): The number of images to generate.
            reference_image_gcs_uris (list[str]): Optional list of GCS URIs for reference images.
            workspace_id (str): The workspace ID to scope the generation.
            
        Returns:
            str: A message indicating the result of the generation.
        """
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"ImagenTool run called with prompt: {prompt}")
        
        try:
            # Map string aspect ratio to Enum
            ar_enum = AspectRatioEnum.RATIO_1_1
            if aspect_ratio == "16:9":
                ar_enum = AspectRatioEnum.RATIO_16_9
            elif aspect_ratio == "9:16":
                ar_enum = AspectRatioEnum.RATIO_9_16
            elif aspect_ratio == "3:4":
                ar_enum = AspectRatioEnum.RATIO_3_4
            elif aspect_ratio == "4:3":
                ar_enum = AspectRatioEnum.RATIO_4_3
            
            from src.images.dto.create_imagen_dto import GenerationModelEnum

            dto = CreateImagenDto(
                prompt=prompt,
                workspace_id=workspace_id,
                generation_model=GenerationModelEnum.GEMINI_2_0_FLASH_EXP,
                aspect_ratio=ar_enum,
                number_of_media=number_of_images,
                reference_image_gcs_uris=reference_image_gcs_uris,
            )
            
            result = await self.imagen_service.generate_images(dto, self.current_user)
            
            if not result.gcs_uris:
                return "Error: No images were generated."
                
            # Return GCS URIs
            uris = result.gcs_uris
            return f"Successfully generated images: {', '.join(uris)}"
            
        except Exception as e:
            return f"Error generating image: {str(e)}"
