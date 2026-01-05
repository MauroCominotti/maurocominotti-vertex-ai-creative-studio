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
    GenerateAudioInputs,
    GenerateAudioSettings,
)

class GenerateTextRequest(BaseModel):
    inputs: GenerateTextInputs
    config: GenerateTextSettings

class GenerateImageRequest(BaseModel):
    workspace_id: int
    inputs: GenerateImageInputs
    config: GenerateImageSettings

class EditImageRequest(BaseModel):
    workspace_id: int
    inputs: EditImageInputs
    config: EditImageSettings

class GenerateVideoRequest(BaseModel):
    workspace_id: int
    inputs: GenerateVideoInputs
    config: GenerateVideoSettings

class CropImageRequest(BaseModel):
    inputs: CropImageInputs
    config: CropImageSettings

class VirtualTryOnRequest(BaseModel):
    workspace_id: int
    inputs: VirtualTryOnInputs
    config: VirtualTryOnSettings

class GenerateAudioRequest(BaseModel):
    workspace_id: int
    inputs: GenerateAudioInputs
    config: GenerateAudioSettings
