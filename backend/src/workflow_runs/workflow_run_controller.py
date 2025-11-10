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

from fastapi import APIRouter, Depends, Response, status

from src.auth.auth_guard import RoleChecker, get_current_user
from src.common.dto.pagination_response_dto import PaginationResponseDto
from src.users.user_model import UserModel, UserRoleEnum
from src.workflow_runs.dto.workflow_run_search_dto import WorkflowRunSearchDto
from src.workflow_runs.workflow_run_service import WorkflowRunService
from src.workflows.schema.workflow_model import WorkflowRunModel
from src.workspaces.workspace_auth_guard import workspace_auth_service

router = APIRouter(
    prefix="/api/workflow-runs",
    tags=["Workflow Runs"],
    responses={404: {"description": "Not found"}},
    dependencies=[
        Depends(
            RoleChecker(
                allowed_roles=[
                    UserRoleEnum.ADMIN,
                    UserRoleEnum.USER,
                ]
            )
        )
    ],
)


@router.post("/search", response_model=PaginationResponseDto[WorkflowRunModel])
def search_workflow_runs(
    search_params: WorkflowRunSearchDto,
    current_user: UserModel = Depends(get_current_user),
    workflow_run_service: WorkflowRunService = Depends(),
):
    """Lists all workflow runs for the current user within a specific workspace."""
    workspace_auth_service.authorize(
        workspace_id=search_params.workspace_id, user=current_user
    )
    return workflow_run_service.query_workflow_runs(
        user_id=current_user.id, search_dto=search_params
    )


@router.get("/{workspace_id}/{run_id}", response_model=WorkflowRunModel)
def get_workflow_run(
    workspace_id: str,
    run_id: str,
    current_user: UserModel = Depends(get_current_user),
    workflow_run_service: WorkflowRunService = Depends(),
):
    """Retrieves a single workflow run by its ID."""
    workspace_auth_service.authorize(workspace_id=workspace_id, user=current_user)
    workflow_run = workflow_run_service.get_workflow_run(
        current_user.id, workspace_id, run_id
    )
    if workflow_run:
        return workflow_run
    return Response(status_code=status.HTTP_404_NOT_FOUND)
