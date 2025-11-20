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
import uuid
import json

import yaml
from google.cloud import workflows_v1
from google.cloud.workflows import executions_v1
from google.api_core.exceptions import NotFound
from pydantic import BaseModel, ValidationError

from src.common.dto.pagination_response_dto import PaginationResponseDto
from src.config.config_service import config_service
from src.images.imagen_service import ImagenService
from src.users.user_model import UserModel
from src.workflows.dto.workflow_search_dto import WorkflowSearchDto
from src.workflows.repository.workflow_repository import WorkflowRepository
from src.workflows.schema.workflow_model import (
    NodeTypes,
    WorkflowCreateDto,
    WorkflowDefinitionStatusEnum,
    WorkflowModel,
)

logger = logging.getLogger(__name__)
PROJECT_ID = config_service.PROJECT_ID
LOCATION = config_service.WORKFLOWS_LOCATION
BACKEND_EXECUTOR_URL = config_service.WORKFLOWS_EXECUTOR_URL


class WorkflowService:
    """Orchestrates multi-step generative AI workflows."""

    def __init__(self):
        self.imagen_service = ImagenService()
        self.workflow_repository = WorkflowRepository()

    def _generate_workflow_yaml(
        self,
        workflow: WorkflowModel,
    ):
        """
        This function contains the business logic for generating the workflow.
        """
        user_id = workflow.user_id
        workspace_id = workflow.workspace_id
        logger.info(
            f"Received workflow generation request for user {user_id} in workspace {workspace_id}"
        )
        # A very basic transformation to a GCP-like workflow structure
        step_outputs = {}
        gcp_steps = []
        # We init with this default param that is going to propagate user auth header
        workflow_params = ["user_auth_header"]
        user_input_step_id = None

        for step in workflow.steps:
            if step.type.value == NodeTypes.USER_INPUT:
                print("USER INPUT FOUND")
                # This is a user input step, so we should treat it as a workflow parameter
                user_input_step_id = step.step_id
                for output_name, output_value in step.outputs.items():
                    workflow_params.append(output_name)
                continue

            step_type = step.type.value.lower()
            step_name = step.step_id
            config = step.settings if step.settings else {}
            config = (
                config.model_dump() if isinstance(config, BaseModel) else config
            )

            # Resolve inputs
            resolved_inputs = {}
            for input_name, input_value in step.inputs.model_dump().items():
                if isinstance(input_value, dict) and "step" in input_value:
                    # This is a StepOutputReference
                    ref_step_id = input_value["step"]
                    ref_output_name = input_value["output"]

                    if ref_step_id == user_input_step_id:
                        # This input refers to the user_input step
                        resolved_inputs[input_name] = (
                            f"${{args.{ref_output_name}}}"
                        )
                    else:
                        resolved_inputs[input_name] = (
                            f"${{{ref_step_id}_result.body.{ref_output_name}}}"
                        )
                else:
                    resolved_inputs[input_name] = input_value

            body = {
                "workspace_id": workspace_id,  # Harcoded in all bodies, even if not used in some nodes for simplicity
                "inputs": resolved_inputs,
                "config": config,
            }

            gcp_step = {
                step_name: {
                    "call": "http.post",
                    "args": {
                        "url": f"{BACKEND_EXECUTOR_URL}/{step_type}",
                        "headers": {
                            "Authorization": "${args.user_auth_header}"
                        },
                        "body": body,
                    },
                    "result": f"{step_name}_result",
                }
            }
            gcp_steps.append(gcp_step)

            # Store mock outputs for subsequent steps
            step_outputs[step_name] = {
                output_name: f"{step_name}_result.{output_name}"
                for output_name in step.outputs
            }
        gcp_workflow = {"main": {"params": ["args"], "steps": gcp_steps}}

        yaml_output = yaml.dump(gcp_workflow, indent=2)

        return yaml_output

    def _create_gcp_workflow(self, source_contents: str, workflow_id: str):
        client = workflows_v1.WorkflowsClient()

        # Initialize request argument(s)
        workflow = workflows_v1.Workflow()
        workflow.source_contents = source_contents
        workflow.execution_history_level = (
            workflows_v1.ExecutionHistoryLevel.EXECUTION_HISTORY_DETAILED
        )

        request = workflows_v1.CreateWorkflowRequest(
            parent=f"projects/{PROJECT_ID}/locations/{LOCATION}",
            workflow=workflow,
            workflow_id=workflow_id,
        )

        operation = client.create_workflow(request=request)
        response = operation.result()
        return response
    
    def _delete_gcp_workflow(self, workflow_id: str):
        client = workflows_v1.WorkflowsClient()

        # Construct the fully qualified location path.
        parent = client.workflow_path(
            config_service.PROJECT_ID, config_service.WORKFLOWS_LOCATION, workflow_id
        )

        request = workflows_v1.DeleteWorkflowRequest(
            name=parent,
        )

        try:
            operation = client.delete_workflow(request=request)
            response = operation.result()
            logger.info(f"Deleted GCP workflow for id '{workflow_id}' with response '{response}'")
            return response
        except NotFound:
            logger.warning(f"Workflow '{workflow_id}' not found in GCP. Proceeding with local deletion.")
            return None

    def create_workflow(
        self, workflow_dto: WorkflowCreateDto, user: UserModel
    ) -> WorkflowModel:
        """Creates a new workflow definition."""
        try:
            workflow_model = WorkflowModel(
                id=f"id-{uuid.uuid4()}",
                name=workflow_dto.name,
                description=workflow_dto.description,
                workspace_id=workflow_dto.workspace_id,
                status=WorkflowDefinitionStatusEnum.DRAFT,
                user_id=user.id,
                steps=workflow_dto.steps,
            )

            yaml_output = self._generate_workflow_yaml(workflow_model)
            logger.info("Generated YAML:")
            logger.info(yaml_output)
            self._create_gcp_workflow(yaml_output, workflow_model.id)
            return self.workflow_repository.create_workflow(workflow_model)
        except ValidationError as e:
            raise ValueError(str(e))
        except Exception as e:
            # TODO: Improve error handling here
            logging.error(e)
            raise e

    def get_workflow(self, user_id: str, workflow_id: str):
        #  Add logic here if needed before fetching from repository
        return self.workflow_repository.get_workflow(user_id, workflow_id)

    def get_by_id(self, workflow_id: str) -> WorkflowModel | None:
        """Retrieves a workflow by its ID without any authorization checks."""
        return self.workflow_repository.get_by_id(workflow_id)

    def query_workflows(
        self, user_id: str, workspace_id: str, search_dto: WorkflowSearchDto
    ) -> PaginationResponseDto[WorkflowModel]:
        return self.workflow_repository.query(user_id, workspace_id, search_dto)

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
        response = self._delete_gcp_workflow(workflow_id)
        return self.workflow_repository.delete(workflow_id)

    def execute_workflow(self, workflow_id: str, args: dict) -> str:
        """Executes a workflow."""

        # Initialize API clients.
        execution_client = executions_v1.ExecutionsClient()
        workflows_client = workflows_v1.WorkflowsClient()

        # Construct the fully qualified location path.
        parent = workflows_client.workflow_path(
            config_service.PROJECT_ID, config_service.WORKFLOWS_LOCATION, workflow_id
        )

        execution = executions_v1.Execution(argument=json.dumps(args))

        # Execute the workflow.
        response = execution_client.create_execution(
            parent=parent, execution=execution
        )

        return response.name

