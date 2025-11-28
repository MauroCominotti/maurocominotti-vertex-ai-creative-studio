from google.cloud.workflows import executions_v1

def list_workflow_executions_paginated(project_id, location, workflow_id, page_size=10, page_token=None):
    """
    Lists executions with pagination control.
    """
    client = executions_v1.ExecutionsClient()
    parent = client.workflow_path(project_id, location, workflow_id)

    request = executions_v1.ListExecutionsRequest(
        parent=parent,
        page_size=page_size,
        page_token=page_token
    )

    response = client.list_executions(request=request)
    pages_iterator = response.pages
    
    try:
        current_page_envelope = next(pages_iterator)
    except StopIteration:
        print("No executions found.")
        return None

    executions = current_page_envelope.executions

    for execution in executions:
        state_name = execution.State(execution.state).name
        print(f"ID: {execution.name.split('/')[-1]} | State: {state_name}")

    return current_page_envelope.next_page_token

# --- Usage ---
if __name__ == "__main__":
    PROJECT_ID = "nachov-argolis"
    LOCATION = "us-central1"
    WORKFLOW_NAME = "id-aed55bd1-40d3-4ad2-811b-563254dbf1f1"
    print("starto")

    # Call the paginated function
    list_workflow_executions_paginated(PROJECT_ID, LOCATION, WORKFLOW_NAME, page_size=10)