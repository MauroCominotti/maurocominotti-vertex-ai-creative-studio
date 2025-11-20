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

from fastapi import APIRouter, Depends, HTTPException, Response, status, Header
from typing import Annotated

from src.auth.auth_guard import RoleChecker, get_current_user
from src.common.dto.pagination_response_dto import PaginationResponseDto
from src.users.user_model import UserModel, UserRoleEnum
from src.workflows.dto.workflow_search_dto import WorkflowSearchDto
from src.workflows.schema.workflow_model import WorkflowCreateDto, WorkflowModel, WorkflowExecuteDto
from src.workflows.workflow_service import WorkflowService
from src.workspaces.workspace_auth_guard import workspace_auth_service

router = APIRouter(
    prefix="/api/workflows",
    tags=["Workflows"],
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


@router.post("/search", response_model=PaginationResponseDto[WorkflowModel])
def search_workflows(
    search_params: WorkflowSearchDto,
    current_user: UserModel = Depends(get_current_user),
    workflow_service: WorkflowService = Depends(),
):
    """Lists all workflows for the current user within a specific workspace."""
    workspace_auth_service.authorize(
        workspace_id=search_params.workspace_id, user=current_user
    )
    return workflow_service.query_workflows(
        user_id=current_user.id,
        workspace_id=search_params.workspace_id,
        search_dto=search_params,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_workflow(
    workflow_data: WorkflowCreateDto,
    current_user: UserModel = Depends(get_current_user),
    workflow_service: WorkflowService = Depends(),
):
    """Creates a new workflow definition."""
    workspace_auth_service.authorize(
        workspace_id=workflow_data.workspace_id, user=current_user
    )

    created_workflow = workflow_service.create_workflow(
        workflow_data, current_user
    )

    return created_workflow


@router.put("/{workflow_id}", response_model=WorkflowModel)
def update_workflow(
    workflow_id: str,
    workflow_data: WorkflowCreateDto,
    current_user: UserModel = Depends(get_current_user),
    workflow_service: WorkflowService = Depends(),
):
    """Updates an existing workflow definition."""
    # 1. Fetch the existing workflow first to ensure it exists.
    existing_workflow = workflow_service.get_by_id(workflow_id)
    if not existing_workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow with ID '{workflow_id}' not found.",
        )

    # 2. Authorize the user against the workspace of the *existing* workflow.
    workspace_auth_service.authorize(
        workspace_id=existing_workflow.workspace_id, user=current_user
    )

    # 3. Verify that the workspace ID is not being changed.
    if workflow_data.workspace_id != existing_workflow.workspace_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The workspace ID of a workflow cannot be changed.",
        )

    # 4. Pass the DTO to the service to handle the update logic.
    return workflow_service.update_workflow(
        workflow_id, workflow_data, current_user
    )


@router.get("/{workflow_id}", response_model=WorkflowModel)
def get_workflow(
    workflow_id,
    current_user: UserModel = Depends(get_current_user),
    workflow_service: WorkflowService = Depends(),
):
    try:
        workflow = workflow_service.get_workflow(current_user.id, workflow_id)
        if workflow:
            return workflow
        return Response(status_code=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response(
            content=str(e), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.delete(
    "/{workflow_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a Workflow",
)
async def delete_workflow(
    workflow_id: str,
    current_user: UserModel = Depends(get_current_user),
    workflow_service: WorkflowService = Depends(),
):
    """
    Permanently deletes a workflow from the database.
    This functionality is restricted to owners of the workflow.
    """
    workflow = workflow_service.get_workflow(
        current_user.id, workflow_id  # type: ignore
    )

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")


    if not workflow_service.delete_by_id(workflow_id):
        raise HTTPException(status_code=404, detail="Workflow not found")
    return

@router.post("/{workflow_id}/workflow-execute")
async def execute_workflow(
    workflow_id: str,
    workflow_execute_dto: WorkflowExecuteDto,
    authorization: str | None = Header(default=None),
    current_user: UserModel = Depends(get_current_user),
    workflow_service: WorkflowService = Depends(),
):
    """
    This function is the controller that calls the service to generate the workflow.
    """
    workflow_execute_dto.args["user_auth_header"] = authorization

    response = workflow_service.execute_workflow(
        workflow_id=workflow_id, args=workflow_execute_dto.args
    )
    print(f"Created execution: {response}")