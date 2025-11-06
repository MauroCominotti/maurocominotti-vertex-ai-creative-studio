from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from src.common.base_repository import BaseDocument


class StepInput(BaseModel):
    step: Optional[str] = None
    output: Optional[str] = None


class StepOutput(BaseModel):
    type: str
    source: Optional[str] = None
    value: Optional[str] = None


class StepSettings(BaseModel):
    model: Optional[str] = None
    temperature: Optional[float] = None
    brand_guidelines: Optional[bool] = None
    aspect_ratio: Optional[str] = None
    save_output_to_gallery: Optional[bool] = None


class WorkflowStep(BaseModel):
    step_id: str
    type: str
    inputs: Dict[str, StepInput]
    outputs: Dict[str, StepOutput]
    settings: Dict[str, Any]


class Workflow(BaseModel):
    steps: List[WorkflowStep]


class WorkflowModel(BaseDocument):
    user_id: str
    workspace_id: str
    workflow_id: str
    workflow: Workflow


class WorkflowCreate(BaseModel):
    user_id: str
    workspace_id: str
    workflow_id: str
    workflow: Dict[str, Any]
