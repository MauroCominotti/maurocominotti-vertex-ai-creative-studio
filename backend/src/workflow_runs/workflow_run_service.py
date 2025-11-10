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

from src.common.dto.pagination_response_dto import PaginationResponseDto
from src.workflow_runs.dto.workflow_run_search_dto import WorkflowRunSearchDto
from src.workflow_runs.repository.workflow_run_repository import WorkflowRunRepository
from src.workflows.schema.workflow_model import WorkflowRunModel


class WorkflowRunService:
    """Service layer for managing workflow run records."""

    def __init__(self):
        self.workflow_run_repository = WorkflowRunRepository()

    def create_workflow_run(self, workflow_run_model: WorkflowRunModel) -> WorkflowRunModel | None:
        """Saves a new workflow run record to the database."""
        new_workflow_run_id: str = self.workflow_run_repository.save(workflow_run_model)
        return self.get_workflow_run(workflow_run_model.user_id, workflow_run_model.workspace_id, new_workflow_run_id)

    def get_workflow_run(self, user_id: str, workspace_id: str, run_id: str):
        """Retrieves a single workflow run by its ID."""
        return self.workflow_run_repository.get_workflow_run(user_id, workspace_id, run_id)

    def query_workflow_runs(
        self, user_id: str, search_dto: WorkflowRunSearchDto
    ) -> PaginationResponseDto[WorkflowRunModel]:
        """Queries for workflow runs with pagination and filtering."""
        return self.workflow_run_repository.query(user_id, search_dto)
