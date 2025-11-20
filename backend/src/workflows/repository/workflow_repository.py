# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.  You may obtain a copy of the License at
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
from src.workflows.dto.workflow_search_dto import WorkflowSearchDto
from src.workflows.schema.workflow_model import WorkflowModel


class WorkflowRepository(BaseRepository[WorkflowModel]):
    """Handles persistence for workflow definitions in Firestore."""

    def __init__(self):
        """Initializes the Firestore client and a reference to the 'workflows' collection."""
        super().__init__(collection_name="workflows", model=WorkflowModel)

    def create_workflow(self, workflow_model: WorkflowModel) -> WorkflowModel:
        """Creates a new workflow document in Firestore using the workflow_id as the document ID."""
        doc_ref = self.collection_ref.document(workflow_model.id)
        doc_ref.set(workflow_model.model_dump())
        return workflow_model

    def get_workflow(
        self, user_id: str, workflow_id: str
    ) -> WorkflowModel | None:
        """Retrieves a single workflow document from Firestore by its ID."""
        doc_ref = self.collection_ref.document(workflow_id)
        doc = doc_ref.get()

        if doc.exists:
            workflow_data = doc.to_dict()
            # Security check: Ensure the retrieved workflow belongs to the requesting user.
            if workflow_data and workflow_data.get("user_id") == user_id:
                return WorkflowModel(**workflow_data)
        return None

    def query(
        self, user_id: str, workspace_id: str, search_dto: WorkflowSearchDto
    ) -> PaginationResponseDto[WorkflowModel]:
        """Performs a paginated query for workflows."""
        base_query = self.collection_ref.where(
            filter=FieldFilter("user_id", "==", user_id)
        ).where(filter=FieldFilter("workspace_id", "==", workspace_id))

        if search_dto.name:
            base_query = base_query.where(
                filter=FieldFilter("name", "==", search_dto.name)
            )
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
            "created_at", direction=firestore.Query.DESCENDING
        )

        if search_dto.start_after:
            last_doc_snapshot = self.collection_ref.document(
                search_dto.start_after
            ).get()
            if last_doc_snapshot.exists:
                data_query = data_query.start_after(last_doc_snapshot)

        data_query = data_query.limit(search_dto.limit)

        documents = list(data_query.stream())
        workflow_data = [
            self.model.model_validate(doc.to_dict()) for doc in documents
        ]

        next_page_cursor = None
        if len(documents) == search_dto.limit:
            next_page_cursor = documents[-1].id

        return PaginationResponseDto[WorkflowModel](
            count=total_count,
            next_page_cursor=next_page_cursor,
            data=workflow_data,
        )

    def update_workflow(self, workflow_model: WorkflowModel) -> WorkflowModel:
        """Updates (or creates) a workflow document in Firestore."""
        doc_ref = self.collection_ref.document(workflow_model.id)
        doc_ref.set(
            workflow_model.model_dump()
        )  # .set() overwrites the document, which is correct for an update.
        return workflow_model
