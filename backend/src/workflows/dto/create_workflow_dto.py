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

from typing import List

from pydantic import Field

from src.common.base_dto import BaseDto
from src.workflows.dto.workflow_step_dto import WorkflowStepDto


class CreateWorkflowDto(BaseDto):
    """Request model for creating and executing a multi-step generative workflow."""

    steps: List[WorkflowStepDto] = Field(description="An ordered list of steps that define the workflow.")
    workspace_id: str = Field(
        min_length=1, description="The ID of the workspace to search within."
    )
