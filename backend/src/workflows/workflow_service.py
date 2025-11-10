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

import logging
from typing import Any, Dict, List

from pydantic import ValidationError

from src.common.dto.pagination_response_dto import PaginationResponseDto
from src.common.schema.media_item_model import AssetRoleEnum, SourceMediaItemLink
from src.galleries.dto.gallery_response_dto import MediaItemResponse
from src.images.dto.create_imagen_dto import CreateImagenDto
from src.images.dto.vto_dto import VtoDto, VtoInputLink
from src.images.imagen_service import ImagenService
from src.users.user_model import UserModel
from src.workflows.dto.workflow_search_dto import WorkflowSearchDto
from src.workflows.repository.workflow_repository import WorkflowRepository
from src.workflows.schema.workflow_model import (
    WorkflowBase,
    WorkflowCreateDto,
    WorkflowDefinitionStatusEnum,
    WorkflowModel,
)

logger = logging.getLogger(__name__)


class WorkflowService:
    """Orchestrates multi-step generative AI workflows."""

    def __init__(self):
        self.imagen_service = ImagenService()
        self.workflow_repository = WorkflowRepository()

    def create_workflow(
        self, workflow_dto: WorkflowCreateDto, user: UserModel
    ) -> WorkflowModel:
        """Creates a new workflow definition."""
        try:
            workflow_model = WorkflowModel(
                name=workflow_dto.name,
                description=workflow_dto.description,
                workspace_id=workflow_dto.workspace_id,
                status=WorkflowDefinitionStatusEnum.DRAFT,
                user_id=user.id,
                steps=workflow_dto.steps,
            )
            return self.workflow_repository.create_workflow(workflow_model)
        except ValidationError as e:
            raise ValueError(str(e))

    def get_workflow(self, user_id: str, workspace_id: str, workflow_id: str):
        #  Add logic here if needed before fetching from repository
        return self.workflow_repository.get_workflow(
            user_id, workspace_id, workflow_id
        )

    def get_by_id(self, workflow_id: str) -> WorkflowModel | None:
        """Retrieves a workflow by its ID without any authorization checks."""
        return self.workflow_repository.get_by_id(workflow_id)

    def query_workflows(
        self, user_id: str, workspace_id: str, search_dto: WorkflowSearchDto
    ) -> PaginationResponseDto[WorkflowModel]:
        return self.workflow_repository.query(
            user_id, workspace_id, search_dto
        )

    def update_workflow(
        self, workflow_id: str, workflow_dto: WorkflowCreateDto, user: UserModel
    ) -> WorkflowModel:
        """Validates and updates a workflow."""
        try:
            # Create the full model from the DTO, preserving the existing ID and user.
            updated_model = WorkflowModel(
                id=workflow_id,
                user_id=user.id,
                name=workflow_dto.name,
                description=workflow_dto.description,
                workspace_id=workflow_dto.workspace_id,
                steps=workflow_dto.steps,
            )
            return self.workflow_repository.update_workflow(updated_model)
        except ValidationError as e:
            raise ValueError(str(e))

    def delete_by_id(self, workflow_id: str) -> bool:
        """Deletes a workflow from the system."""
        return self.workflow_repository.delete(workflow_id)
