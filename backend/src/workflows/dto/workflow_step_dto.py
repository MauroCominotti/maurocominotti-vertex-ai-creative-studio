# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import Field

from src.common.base_dto import BaseDto
from src.workflows.dto.workflow_step_input_dto import WorkflowStepInputDto


class WorkflowOperationEnum(str, Enum):
    """Enum for the types of operations a step can perform."""

    VTO = "vto"
    GENERATE_IMAGE = "generate_image"


class WorkflowStepDto(BaseDto):
    """Represents a single step in a generation workflow."""

    step_id: str = Field(description="A unique identifier for this step within the workflow.")
    operation: WorkflowOperationEnum = Field(description="The generative operation to perform.")
    params: Dict[str, Any] = Field(description="A dictionary of parameters for the operation, matching the corresponding DTO (e.g., VtoDto, CreateImagenDto).")
    inputs: Optional[List[WorkflowStepInputDto]] = Field(default=None, description="A list of inputs from previous steps. If None, this step uses initial assets provided in `params`.")

