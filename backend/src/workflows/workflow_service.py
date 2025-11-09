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
from src.workflows.dto.workflow_step_dto import WorkflowOperationEnum
from src.workflows.repository.workflow_repository import WorkflowRepository
from src.workflows.schema.workflow_model import (
    WorkflowCreateDto,
    WorkflowModel,
    WorkflowStatusEnum,
)

logger = logging.getLogger(__name__)


class WorkflowService:
    """Orchestrates multi-step generative AI workflows."""

    def __init__(self):
        self.imagen_service = ImagenService()
        self.workflow_repository = WorkflowRepository()
        # In the future, you can add other services like VeoService here.

    # async def execute_workflow(
    #     self, workflow_dto: WorkflowCreateDto, user: UserModel
    # ) -> Dict[str, MediaItemResponse]:
    #     """
    #     Executes a workflow by processing each step sequentially.

    #     Args:
    #         workflow_dto: The workflow definition.
    #         user: The authenticated user.

    #     Returns:
    #         A dictionary mapping each step_id to its resulting MediaItemResponse.
    #     """
    #     step_results: Dict[str, MediaItemResponse] = {}

    #     for step in workflow_dto.workflow.steps:
    #         logger.info(f"Executing workflow step: {step.step_id} ({step.operation})")

    #         # --- Prepare inputs for the current step ---
    #         if step.inputs:
    #             for step_input in step.inputs:
    #                 source_step_id = step_input.source_step_id
    #                 if source_step_id not in step_results:
    #                     raise ValueError(
    #                         f"Invalid workflow: Step '{step.step_id}' depends on a non-existent or failed step '{source_step_id}'."
    #                     )

    #                 source_result = step_results[source_step_id]
    #                 source_media_item_id = source_result.id

    #                 # This logic assumes the current step is a `generate_image` operation.
    #                 # It injects the output of the previous step as an input to the current one.
    #                 if "source_media_items" not in step.params:
    #                     step.params["source_media_items"] = []

    #                 # If a specific index is requested, use it.
    #                 if step_input.media_index is not None:
    #                     step.params["source_media_items"].append(
    #                         SourceMediaItemLink(
    #                             media_item_id=source_media_item_id,
    #                             media_index=step_input.media_index,
    #                             role=AssetRoleEnum.INPUT,  # TODO: Infer the role from each case
    #                         ).model_dump()
    #                     )
    #                 else:
    #                     # If no index, use all outputs from the source step.
    #                     for i in range(source_result.num_media or 0):
    #                         step.params["source_media_items"].append(
    #                             SourceMediaItemLink(
    #                                 media_item_id=source_media_item_id,
    #                                 media_index=i,
    #                                 role=AssetRoleEnum.INPUT,  # TODO: Infer the role from each case
    #                             ).model_dump()
    #                         )

    #         # --- Execute the operation for the current step ---
    #         step_result: MediaItemResponse | None = None

    #         if step.operation == WorkflowOperationEnum.GENERATE_IMAGE:
    #             # Validate and create the DTO for the image generation service
    #             imagen_dto = CreateImagenDto(**step.params)
    #             step_result = await self.imagen_service.generate_images(
    #                 imagen_dto, user
    #             )

    #         elif step.operation == WorkflowOperationEnum.VTO:
    #             # For VTO, we need to parse the params into VtoInputLink objects
    #             vto_params = step.params.copy()
    #             for key, value in vto_params.items():
    #                 if isinstance(value, dict) and ("source_asset_id" in value or "source_media_item" in value):
    #                     vto_params[key] = VtoInputLink(**value)

    #             vto_dto = VtoDto(**vto_params)
    #             step_result = await self.imagen_service.generate_image_for_vto(vto_dto, user)

    #         if not step_result:
    #             raise Exception(f"Workflow step '{step.step_id}' failed to produce a result.")

    #         step_results[step.step_id] = step_result

    #     return step_results

    def create_workflow(
        self, workflow_dto: WorkflowCreateDto, user: UserModel
    ) -> WorkflowModel:
        """Creates a new workflow definition."""
        try:
            workflow_model = WorkflowModel(
                name=workflow_dto.name,
                description=workflow_dto.description,
                workspace_id=workflow_dto.workspace_id,
                status=WorkflowStatusEnum.DRAFT,
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

    def query_workflows(
        self, user_id: str, workspace_id: str, search_dto: WorkflowSearchDto
    ) -> PaginationResponseDto[WorkflowModel]:
        return self.workflow_repository.query(
            user_id, workspace_id, search_dto
        )

    def update_workflow(self, workflow_model: WorkflowModel):
        """Validates and updates a workflow."""
        try:
            validated_workflow = WorkflowModel(**workflow_model.model_dump())
            return self.workflow_repository.update_workflow(validated_workflow)
        except ValidationError as e:
            raise ValueError(str(e))

    def delete_by_id(self, workflow_id: str) -> bool:
        """Deletes a workflow from the system."""
        return self.workflow_repository.delete(workflow_id)
