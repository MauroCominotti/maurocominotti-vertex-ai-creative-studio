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
from google.cloud.firestore_v1.base_query import FieldFilter

from src.common.base_repository import BaseRepository
from src.workflows.schema.workflow_model import WorkflowModel


class WorkflowRepository(BaseRepository[WorkflowModel]):
    """Handles persistence for workflow definitions in Firestore."""

    def __init__(self):
        """Initializes the Firestore client and a reference to the 'workflows' collection."""
        super().__init__(collection_name="workflows", model=WorkflowModel)

    def create_workflow(self, workflow_model: WorkflowModel) -> WorkflowModel:
        """Creates a new workflow document in Firestore using the workflow_id as the document ID."""
        doc_ref = self.collection_ref.document(workflow_model.workflow_id)
        doc_ref.set(workflow_model.model_dump())
        return workflow_model

    def get_workflow(
        self, user_id: str, workspace_id: str, workflow_id: str
    ) -> WorkflowModel | None:
        """Retrieves a single workflow document from Firestore by its ID."""
        doc_ref = self.collection_ref.document(workflow_id)
        doc = doc_ref.get()

        if doc.exists:
            workflow_data = doc.to_dict()
            # Security check: Ensure the retrieved workflow belongs to the requesting user and workspace.
            if (
                workflow_data
                and workflow_data.get("user_id") == user_id
                and workflow_data.get("workspace_id") == workspace_id
            ):
                return WorkflowModel(**workflow_data)
        return None

    def get_workflows_by_user_and_workspace(
        self, user_id: str, workspace_id: str
    ) -> list[WorkflowModel]:
        """Queries Firestore for all workflows matching a user_id and workspace_id."""
        query = self.collection_ref.where(
            filter=FieldFilter("user_id", "==", user_id)
        ).where(filter=FieldFilter("workspace_id", "==", workspace_id))
        docs = query.stream()
        return [WorkflowModel(**doc.to_dict()) for doc in docs]

    def update_workflow(self, workflow_model: WorkflowModel) -> WorkflowModel:
        """Updates (or creates) a workflow document in Firestore."""
        doc_ref = self.collection_ref.document(workflow_model.workflow_id)
        doc_ref.set(
            workflow_model.model_dump()
        )  # .set() overwrites the document, which is correct for an update.
        return workflow_model
