from enum import Enum
from os import getenv
from typing import Optional

from google.cloud import pubsub_v1
from google.api_core import exceptions

from src.videos.dto.create_veo_dto import CreateVeoDto


class BaseModel:
    pass


class RemoteVeoExecutor:
    def submit(
        self,
        *args,
        _process_video_in_background,
        media_item_id: str,
        request_dto: CreateVeoDto,
        **kwargs) -> None:
        pass

    @staticmethod
    def _publish_pydantic_model_to_pubsub(
        project_id: str,
        topic_id: str,
        event_data: BaseModel
        ) -> Optional[str]:
        """
        Serializes a Pydantic model and publishes it to a Pub/Sub topic.

        Args:
            project_id: The Google Cloud project ID.
            topic_id: The ID of the Pub/Sub topic.
            event_data: An instance of a Pydantic BaseModel.

        Returns:
            The message ID string if publishing is successful, otherwise None.
        """
        # Initialize a Publisher client
        try:
            publisher = pubsub_v1.PublisherClient()
            topic_path = publisher.topic_path(project_id, topic_id)
        except exceptions.GoogleAPICallError as e:
            print(f"Error initializing Pub/Sub client or topic path: {e}")
            print("Please ensure you are authenticated with GCP and the project/topic IDs are correct.")
            return None

        # Serialize the Pydantic model to a JSON string, then encode it to bytes.
        # Pub/Sub messages must be byte strings.
        # Using `.model_dump_json()` is the modern Pydantic v2+ way.
        # For Pydantic v1, you would use `.json()`.
        try:
            message_bytes = event_data.model_dump_json().encode("utf-8")
            print(f"Serialized message (bytes): {message_bytes}")
        except Exception as e:
            print(f"Error serializing Pydantic model: {e}")
            return None

        # Publish the message.
        try:
            # The publish() method returns a future.
            future = publisher.publish(topic_path, message_bytes)
            message_id = future.result()  # The .result() method blocks until the message is published.
            print(f"Successfully published message with ID: {message_id} to topic {topic_path}")
            return message_id
        except exceptions.NotFound:
            print(f"Error: Pub/Sub topic not found: {topic_path}")
            print("Please ensure the topic exists in your GCP project.")
        except Exception as e:
            print(f"An unexpected error occurred during publishing: {e}")

        return None


class ExecutorTypeEnum(str, Enum):
    LOCAL_VEO_EXECUTOR_TYPE = "local"
    REMOTE_EXECUTOR_TYPE = "remote"


class VeoExecutorService:
    def __int__(self, process_pool):
        veo_executor_type = getenv("VEO_EXECUTOR_TYPE",
                                         ExecutorTypeEnum.LOCAL_VEO_EXECUTOR_TYPE)
        veo_processing_executors = {
            ExecutorTypeEnum.LOCAL_VEO_EXECUTOR_TYPE: process_pool,
            ExecutorTypeEnum.REMOTE_EXECUTOR_TYPE: RemoteVeoExecutor(),
        }
        self.executor = veo_processing_executors.get(
            veo_executor_type, ExecutorTypeEnum.LOCAL_VEO_EXECUTOR_TYPE)

    def get_executor(self):
        return self.executor
