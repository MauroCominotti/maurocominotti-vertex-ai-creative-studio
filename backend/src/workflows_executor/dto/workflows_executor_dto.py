from typing import Optional
from pydantic import BaseModel
from src.workflows.schema.workflow_model import (
    GenerateTextInputs,
    GenerateTextSettings,
    GenerateImageInputs,
    GenerateImageSettings,
    EditImageInputs,
    EditImageSettings,
    GenerateVideoInputs,
    GenerateVideoSettings,
    CropImageInputs,
    CropImageSettings,
    VirtualTryOnInputs,
    VirtualTryOnSettings,
)

class GenerateTextRequest(BaseModel):
    inputs: GenerateTextInputs
    config: GenerateTextSettings

class GenerateImageRequest(BaseModel):
    workspace_id: str
    inputs: GenerateImageInputs
    config: GenerateImageSettings

class EditImageRequest(BaseModel):
    workspace_id: str
    inputs: EditImageInputs
    config: EditImageSettings

class GenerateVideoRequest(BaseModel):
    inputs: GenerateVideoInputs
    config: GenerateVideoSettings

class CropImageRequest(BaseModel):
    inputs: CropImageInputs
    config: CropImageSettings

class VirtualTryOnRequest(BaseModel):
    inputs: VirtualTryOnInputs
    config: VirtualTryOnSettings
