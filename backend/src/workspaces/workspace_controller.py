from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from src.auth.auth_guard import RoleChecker, get_current_user
from src.users.user_model import UserModel, UserRoleEnum
from src.workspaces.dto.create_workspace_dto import CreateWorkspaceDto
from src.workspaces.dto.invite_user_dto import InviteUserDto
from src.workspaces.schema.workspace_model import WorkspaceModel
from src.workspaces.workspace_service import WorkspaceService

router = APIRouter(
    prefix="/api/workspaces",
    tags=["Workspaces"],
    dependencies=[Depends(get_current_user)],  # All endpoints require authentication
)


@router.post(
    "",
    response_model=WorkspaceModel,
    status_code=status.HTTP_201_CREATED,
    summary="Create a New Workspace",
)
async def create_workspace(
    create_dto: CreateWorkspaceDto,
    current_user: UserModel = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(),
):
    """
    Creates a new private workspace for the currently authenticated user.
    The creator is automatically assigned as the 'OWNER'.
    """
    return workspace_service.create_workspace(current_user, create_dto)


@router.get(
    "",
    response_model=List[WorkspaceModel],
    summary="List Workspaces for Current User",
)
async def list_my_workspaces(
    current_user: UserModel = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(),
):
    """
    Retrieves a list of all workspaces the currently authenticated user
    is a member of.
    """
    return workspace_service.list_workspaces_for_user(current_user)


@router.post(
    "/{workspace_id}/invites",
    response_model=WorkspaceModel,
    summary="Invite a User to a Workspace",
)
async def invite_user(
    workspace_id: str,
    invite_dto: InviteUserDto,
    current_user: UserModel = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(),
):
    """
    Invites a user (by email) to join a specific workspace with a given role.

    This action is restricted to the workspace's OWNER or a system ADMIN.
    It performs a dual-write, updating both the workspace's member list
    and the invited user's list of workspace memberships.
    """
    updated_workspace = workspace_service.invite_user_to_workspace(
        workspace_id=workspace_id,
        invite_dto=invite_dto,
        current_user=current_user,
    )
    if not updated_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace or user to invite not found.",
        )
    return updated_workspace
