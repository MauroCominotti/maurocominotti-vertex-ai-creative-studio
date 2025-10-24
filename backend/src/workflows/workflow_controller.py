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

from typing import Dict

from fastapi import APIRouter, Depends

from src.auth.firebase_client_service import get_current_user
from src.galleries.dto.gallery_response_dto import MediaItemResponse
from src.users.user_model import UserModel
from src.workflows.dto.create_workflow_dto import CreateWorkflowDto
from src.workflows.workflow_service import WorkflowService

router = APIRouter(prefix="/api/workflows", tags=["Workflows"])


@router.post("/", response_model=Dict[str, MediaItemResponse])
async def execute_workflow(
    workflow_dto: CreateWorkflowDto,
    user: UserModel = Depends(get_current_user),
    workflow_service: WorkflowService = Depends(),
):
    """
    Executes a multi-step generative workflow.

    Each step in the workflow is processed sequentially, with the output of one
    step potentially being used as the input for the next. The final output
    is a dictionary containing the results of each step.
    """
    return await workflow_service.execute_workflow(workflow_dto, user)

