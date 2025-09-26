from typing import List, Literal

from pydantic import BaseModel, Field, model_validator

from src.common.base_dto import AspectRatioEnum, BaseDto


class ConcatenationInput(BaseModel):
    """Defines a single item to be included in the concatenation, preserving order."""

    id: str = Field(description="The ID of the asset or media item.")
    type: Literal["media_item", "source_asset"] = Field(
        description="The type of the input."
    )


class ConcatenateVideosDto(BaseDto):
    """Data Transfer Object for a video concatenation request."""

    name: str = Field(
        min_length=1,
        description="A name for the new concatenated video.",
        default="Concatenated Video",
    )
    workspace_id: str = Field(
        min_length=1, description="The ID of the workspace for this generation."
    )
    inputs: List[ConcatenationInput] = Field(
        min_length=2,
        description="An ordered list of videos to concatenate.",
    )
    aspect_ratio: AspectRatioEnum = Field(
        default=AspectRatioEnum.RATIO_16_9,
        description="Aspect ratio of the image.",
    )

    @model_validator(mode="after")
    def validate_inputs(self) -> "ConcatenateVideosDto":
        """Ensures at least two total video inputs are provided."""
        if len(self.inputs) < 2:
            raise ValueError("Concatenation requires at least two video inputs.")
        return self
