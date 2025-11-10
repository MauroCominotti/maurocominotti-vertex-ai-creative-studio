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

from google.cloud import firestore
from google.cloud.firestore_v1.base_aggregation import AggregationResult
from google.cloud.firestore_v1.base_query import FieldFilter
from google.cloud.firestore_v1.query_results import QueryResultsList

from src.common.base_repository import BaseRepository
from src.common.dto.pagination_response_dto import PaginationResponseDto
from src.workflow_runs.dto.workflow_run_search_dto import WorkflowRunSearchDto
from src.workflows.schema.workflow_model import WorkflowRunModel


class WorkflowRunRepository(BaseRepository[WorkflowRunModel]):
    """Handles persistence for workflow runs in Firestore."""

    def __init__(self):
        """Initializes the Firestore client and a reference to the 'workflow_runs' collection."""
        super().__init__(collection_name="workflow_runs", model=WorkflowRunModel)

    def get_workflow_run(
        self, user_id: str, workspace_id: str, run_id: str
    ) -> WorkflowRunModel | None:
        """Retrieves a single workflow run document from Firestore by its ID."""
        workflow_run = self.get_by_id(run_id)

        if workflow_run:
            # Security check: Ensure the retrieved run belongs to the requesting user and workspace.
            if (
                workflow_run.user_id == user_id
                and workflow_run.workspace_id == workspace_id
            ):
                return workflow_run
        return None

    def query(
        self, user_id: str, search_dto: WorkflowRunSearchDto
    ) -> PaginationResponseDto[WorkflowRunModel]:
        """Performs a paginated query for workflow runs."""
        base_query = self.collection_ref.where(
            filter=FieldFilter("user_id", "==", user_id)
        ).where(filter=FieldFilter("workspace_id", "==", search_dto.workspace_id))

        if search_dto.status:
            base_query = base_query.where(
                filter=FieldFilter("status", "==", search_dto.status.value)
            )

        count_query = base_query.count(alias="total")
        aggregation_result = count_query.get()

        total_count = 0
        if (
            isinstance(aggregation_result, QueryResultsList)
            and aggregation_result
            and isinstance(aggregation_result[0][0], AggregationResult)
        ):
            total_count = int(aggregation_result[0][0].value)

        data_query = base_query.order_by(
            "started_at", direction=firestore.Query.DESCENDING
        )

        if search_dto.start_after:
            last_doc_snapshot = self.collection_ref.document(
                search_dto.start_after
            ).get()
            if last_doc_snapshot.exists:
                data_query = data_query.start_after(last_doc_snapshot)

        data_query = data_query.limit(search_dto.limit)

        documents = list(data_query.stream())
        workflow_run_data = [self.model.model_validate(doc.to_dict()) for doc in documents]

        next_page_cursor = documents[-1].id if len(documents) == search_dto.limit else None

        return PaginationResponseDto[WorkflowRunModel](
            count=total_count,
            next_page_cursor=next_page_cursor,
            data=workflow_run_data,
        )

