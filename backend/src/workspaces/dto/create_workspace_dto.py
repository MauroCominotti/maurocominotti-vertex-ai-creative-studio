from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CreateWorkspaceDto(BaseModel):
    """Data transfer object for creating a new workspace."""

    name: str = Field(..., min_length=3, max_length=100)

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
