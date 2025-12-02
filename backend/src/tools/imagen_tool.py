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
            description="Generates an image based on a text prompt. Use this to create visual assets.",
            parameters={
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "The text prompt describing the image to generate."
                    },
                    "aspect_ratio": {
                        "type": "string",
                        "enum": ["1:1", "16:9", "9:16", "3:4", "4:3"],
                        "description": "The aspect ratio of the generated image."
                    },
                    "number_of_images": {
                        "type": "integer",
                        "description": "Number of images to generate (1-4)."
                    }
                },
                "required": ["prompt"]
            }
        )
        self.imagen_service = imagen_service
        self.current_user = current_user

    async def run(self, prompt: str, aspect_ratio: str = "1:1", number_of_images: int = 1) -> str:
        """
        Executes the image generation.
        """
        try:
            dto = CreateImagenDto(
                prompt=prompt,
                aspect_ratio=AspectRatioEnum(aspect_ratio),
                number_of_images=number_of_images
            )
            
            result = await self.imagen_service.generate_image(dto, self.current_user)
            
            if not result.images:
                return "Error: No images were generated."
                
            # Return GCS URIs
            uris = [img.gcs_uri for img in result.images]
            return f"Successfully generated images: {', '.join(uris)}"
            
        except Exception as e:
            return f"Error generating image: {str(e)}"
