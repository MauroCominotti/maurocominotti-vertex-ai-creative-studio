from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pydantic.alias_generators import to_camel

from src.workspaces.schema.workspace_model import WorkspaceRoleEnum


class InviteUserDto(BaseModel):
    """Data transfer object for inviting a user to a workspace."""

    email: EmailStr
    role: WorkspaceRoleEnum = Field(default=WorkspaceRoleEnum.VIEWER)

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
