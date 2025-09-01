from typing import Annotated, Literal, Optional

from fastapi import Query
from google.genai import types
from pydantic import Field, field_validator
from src.common.base_dto import (
    AspectRatioEnum,
    BaseDto,
    ColorAndToneEnum,
    CompositionEnum,
    GenerationModelEnum,
    LightingEnum,
    StyleEnum,
)


class CreateImagenDto(BaseDto):
    """
    The refactored request model. Defaults are defined here to make the API
    contract explicit and self-documenting.
    """

    prompt: Annotated[str, Query(max_length=10000)] = Field(
        description="Prompt term to be passed to the model"
    )
    generation_model: GenerationModelEnum = Field(
        default=GenerationModelEnum.IMAGEN_4_ULTRA,
        description="Model used for image generation.",
    )
    aspect_ratio: AspectRatioEnum = Field(
        default=AspectRatioEnum.RATIO_1_1,
        description="Aspect ratio of the image.",
    )
    number_of_media: int = Field(
        default=1,
        ge=1,
        le=4,
        description="Number of images to generate (between 1 and 4).",
    )
    style: StyleEnum = Field(
        default=StyleEnum.MODERN, description="Style of the image."
    )
    negative_prompt: str = Field(
        default="", description="Negative prompt for the image."
    )
    color_and_tone: Optional[ColorAndToneEnum] = Field(
        default=None,
        description="The desired color and tone style for the image.",
    )
    lighting: Optional[LightingEnum] = Field(
        default=None, description="The desired lighting style for the image."
    )
    composition: Optional[CompositionEnum] = Field(
        default=None, description="The desired lighting style for the image."
    )
    add_watermark: bool = Field(
        default=False,
        description="Whether to add a watermark to the generated image.",
    )
    upscale_factor: Literal["", "x2", "x4"] = Field(
        default="x4",
        description="""Factor of the upscale, either x2 or x4. If empty it will not upscale""",
    )

    @field_validator("prompt")
    def prompt_must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Prompt cannot be empty or whitespace only")
        return value

    @field_validator("generation_model")
    def validate_imagen_generation_model(
        cls, value: GenerationModelEnum
    ) -> GenerationModelEnum:
        """Ensures that only supported generation models for imagen are used."""
        valid_video_ratios = [
            GenerationModelEnum.IMAGEGEN_002,
            GenerationModelEnum.IMAGEGEN_005,
            GenerationModelEnum.IMAGEGEN_006,
            GenerationModelEnum.IMAGEN_3_001,
            GenerationModelEnum.IMAGEN_3_002,
            GenerationModelEnum.IMAGEN_3_FAST,
            GenerationModelEnum.IMAGEN_4_ULTRA,
            GenerationModelEnum.GEMINI_25_FLASH_IMAGE_PREVIEW,
        ]
        if value not in valid_video_ratios:
            raise ValueError("Invalid generation model for imagen.")
        return value
