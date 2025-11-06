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
from src.users.user_model import UserModel, UserRoleEnum
from src.workflows.dto.create_workflow_dto import CreateWorkflowDto
from src.workflows.schema.workflow_model import WorkflowCreate, WorkflowModel
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


@router.post("/")
async def execute_workflow(
    workflow_dto: CreateWorkflowDto,
    current_user: UserModel = Depends(get_current_user),
    workflow_service: WorkflowService = Depends(),
):
    """
    Executes a multi-step generative workflow.

    Each step in the workflow is processed sequentially, with the output of one
    step potentially being used as the input for the next. The final output
    is a dictionary containing the results of each step.
    """
    # This dependency call acts as a gatekeeper. If the user is not authorized
    # for the workspace_id inside workflow_dto, it will raise an exception.
    workspace_auth_service.authorize(
        workspace_id=workflow_dto.workspace_id, user=current_user
    )

    return await workflow_service.execute_workflow(workflow_dto, current_user)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_workflow(
    workflow_data: WorkflowCreate,
    current_user: UserModel = Depends(get_current_user),
    workflow_service: WorkflowService = Depends(),
):
    """Creates a new workflow definition."""
    workspace_auth_service.authorize(
        workspace_id=workflow_data.workspace_id, user=current_user
    )

    # Ensure the user_id in the payload matches the authenticated user
    if workflow_data.user_id != current_user.id:
        workflow_data.user_id = current_user.id  # type: ignore

    workflow_model = WorkflowModel(**workflow_data.model_dump())
    created_workflow = workflow_service.create_workflow(workflow_model)

    return created_workflow


@router.put("/{workspace_id}/{workflow_id}", response_model=WorkflowModel)
def update_workflow(
    workspace_id: str,
    workflow_id: str,
    workflow_data: WorkflowCreate,
    current_user: UserModel = Depends(get_current_user),
    workflow_service: WorkflowService = Depends(),
):
    """Updates an existing workflow definition."""
    workspace_auth_service.authorize(
        workspace_id=workspace_id, user=current_user
    )

    # Ensure the path parameters and user ID are correctly set on the object
    workflow_data.workspace_id = workspace_id
    workflow_data.workflow_id = workflow_id
    if workflow_data.user_id != current_user.id:
        workflow_data.user_id = current_user.id  # type: ignore

    workflow_model = WorkflowModel(**workflow_data.model_dump())
    updated_workflow = workflow_service.update_workflow(workflow_model)

    return updated_workflow


@router.get("/{workspace_id}/{workflow_id}", response_model=WorkflowModel)
def get_workflow(
    workspace_id,
    workflow_id,
    current_user: UserModel = Depends(get_current_user),
    workflow_service: WorkflowService = Depends(),
):
    try:
        workspace_auth_service.authorize(
            workspace_id=workspace_id, user=current_user
        )

        workflow = workflow_service.get_workflow(
            current_user.id, workspace_id, workflow_id  # type: ignore
        )
        if workflow:
            return workflow
        return Response(status_code=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response(
            content=str(e), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.get("/{workspace_id}", response_model=list[WorkflowModel])
def get_workflows_by_workspace(
    workspace_id: str,
    current_user: UserModel = Depends(get_current_user),
    workflow_service: WorkflowService = Depends(),
):
    """Lists all workflows for the current user within a specific workspace."""
    workspace_auth_service.authorize(
        workspace_id=workspace_id, user=current_user
    )

    workflows = workflow_service.get_workflows_by_user_and_workspace(
        user_id=current_user.id, workspace_id=workspace_id  # type: ignore
    )
    return workflows
