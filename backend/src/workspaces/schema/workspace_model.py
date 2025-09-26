from enum import Enum
from typing import List

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from src.common.base_repository import BaseDocument


class WorkspaceRoleEnum(str, Enum):
    """Defines the permissions a user has within a single workspace."""
    VIEWER = "viewer"
    EDITOR = "editor"
    ADMIN = "admin"
    OWNER = "owner"

class WorkspaceScopeEnum(str, Enum):
    """Defines the overall visibility of the workspace in the application."""
    PUBLIC = "public"    # Visible to everyone (e.g., the "Default Google Workspace" gallery)
    PRIVATE = "private"  # Visible only to users listed in the 'members' list.

class WorkspaceMember(BaseModel):
    """
    An embedded sub-document defining a user's role within this workspace.
    This complete list is stored on the workspace document.
    """
    user_id: str = Field(description="The Firebase Auth UID of the member.")
    email: str = Field(description="The member's email (denormalized for display).")
    role: WorkspaceRoleEnum = Field(default=WorkspaceRoleEnum.VIEWER)

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

class WorkspaceModel(BaseDocument):
    """
    COLLECTION: workspaces (Root-Level Collection)
    Represents a project, team, or folder. Access is controlled by the 'scope'
    and the 'members' list.
    """
    name: str
    owner_id: str = Field(description="The user_id of the person who created this workspace.")

    scope: WorkspaceScopeEnum = Field(
        default=WorkspaceScopeEnum.PRIVATE,
        description="Public workspaces are visible to all users. Private ones are visible only to members."
    )

    members: List[WorkspaceMember] = Field(
        default_factory=list,
        description="The complete list of members who have access to this (if private)."
    )

    member_ids: List[str] = Field(
        default_factory=list,
        description="A denormalized list of user IDs for efficient 'array_contains' queries.",
    )
