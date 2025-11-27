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
from google.auth.transport.requests import Request
from google.oauth2 import service_account
import google.auth
import requests
from pydantic import BaseModel, ValidationError

from src.common.dto.pagination_response_dto import PaginationResponseDto
from src.config.config_service import config_service
from src.images.imagen_service import ImagenService
from src.users.user_model import UserModel
from src.workflows.dto.workflow_search_dto import WorkflowSearchDto
from src.workflows.repository.workflow_repository import WorkflowRepository
from google.auth.transport.requests import AuthorizedSession
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
        
        # Add a return step to the workflow to output all step results
        return_step = {
            "return": {
                "step_outputs": {
                    step_name: f"${{{step_name}_result.body}}"
                    for step_name in step_outputs.keys()
                }
            }
        }
        gcp_steps.append(return_step)

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

    def _update_gcp_workflow(self, source_contents: str, workflow_id: str):
        client = workflows_v1.WorkflowsClient()

        # Initialize request argument(s)
        workflow = workflows_v1.Workflow()
        workflow.source_contents = source_contents
        workflow.execution_history_level = (
            workflows_v1.ExecutionHistoryLevel.EXECUTION_HISTORY_DETAILED
        )

        request = workflows_v1.UpdateWorkflowRequest(
            workflow=workflow,
            name=f"projects/{PROJECT_ID}/locations/{LOCATION}/workflows/{workflow_id}",
        )

        operation = client.update_workflow(request=request)
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

            yaml_output = self._generate_workflow_yaml(updated_model)
            logger.info("Generated YAML for update:")
            logger.info(yaml_output)
            self._update_gcp_workflow(yaml_output, workflow_id)

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

        # Extract just the execution ID (UUID) from the full resource name
        # Format: projects/{project}/locations/{location}/workflows/{workflow}/executions/{execution_id}
        execution_id = response.name.split('/')[-1]
        return execution_id

    def get_execution_details(self, workflow_id: str, execution_id: str) -> dict:
        """Retrieves the details of a workflow execution."""
        client = executions_v1.ExecutionsClient()
        
        # The execution_id passed here is expected to be the full resource name
        # If it's just the ID, we might need to construct the path, but let's assume full name for now
        # or handle both. The controller should probably pass the full name or we construct it.
        # Let's assume the controller passes the ID and we construct the path, 
        # BUT the execute_workflow returns the full name. 
        # Let's try to parse it or assume it is the full name if it starts with projects/
        
        if not execution_id.startswith("projects/"):
             parent = client.workflow_path(
                config_service.PROJECT_ID, config_service.WORKFLOWS_LOCATION, workflow_id
            )
             execution_name = f"{parent}/executions/{execution_id}"
        else:
            execution_name = execution_id

        try:
            execution = client.get_execution(name=execution_name)
        except NotFound:
            return None

        result = None
        if execution.state == executions_v1.Execution.State.SUCCEEDED:
             try:
                result = json.loads(execution.result)
             except:
                 result = execution.result
        
        # Fetch step entries using REST API
        step_entries = []
        try:
            credentials, project = google.auth.default(
                scopes=['https://www.googleapis.com/auth/cloud-platform']
            )
            authed_session = AuthorizedSession(credentials)
            url = f"https://workflowexecutions.googleapis.com/v1/{execution_name}/stepEntries"
            response = authed_session.get(url)
            if response.status_code == 200:
                step_entries = response.json().get("stepEntries", [])
            else:
                logger.warning(f"Failed to fetch step entries: {response.text}")
        except Exception as e:
            logger.error(f"Error fetching step entries: {e}")

        logger.info("Step entries:")
        logger.info(step_entries)

        # Calculate duration
        duration = 0.0
        if execution.start_time:
            start_timestamp = execution.start_time.timestamp()
            if execution.end_time:
                end_timestamp = execution.end_time.timestamp()
                duration = end_timestamp - start_timestamp
            else:
                import time
                duration = time.time() - start_timestamp

        # Format step entries
        formatted_step_entries = []
        for entry in step_entries:
            step_name = entry.get("step")
            step_state = entry.get("state")
            
            # Extract inputs and outputs from the call details
            call_details = entry.get("call", {})
            step_inputs = call_details.get("args", {})
            step_outputs = call_details.get("result", {})

            formatted_step_entries.append({
                "step_id": step_name,
                "state": step_state,
                "step_inputs": step_inputs,
                "step_outputs": step_outputs,
                "start_time": entry.get("startTime"),
                "end_time": entry.get("endTime")
            })

        return {
            "id": execution.name,
            "state": execution.state.name,
            "result": result,
            "duration": round(duration, 2),
            "error": execution.error.context if execution.error else None,
            "step_entries": formatted_step_entries
        }
