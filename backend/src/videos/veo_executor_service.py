import logging
from enum import Enum
from typing import Optional

from google.cloud import pubsub_v1
from google.api_core import exceptions

from src.config.config_service import config_service
from src.videos.dto.create_veo_dto import CreateVeoDto
from src.videos.dto.submit_remote_veo_job_dto import SubmitRemoteVeoJobDto


class RemoteVeoExecutor:
    def __init__(self, project_id: str, pubsub_topic_id: str):
        self.project_id = project_id
        self.pubsub_topic_id = pubsub_topic_id

    def submit(
        self,
        *args,
        media_item_id: str,
        request_dto: CreateVeoDto,
        **kwargs) -> None:
        self._publish_pydantic_model_to_pubsub(
            self.project_id,
            self.pubsub_topic_id,
            event_data=SubmitRemoteVeoJobDto(
                media_item_id=media_item_id,
                request_dto=request_dto,
            )
    )

    @staticmethod
    def _publish_pydantic_model_to_pubsub(
        project_id: str,
        topic_id: str,
        event_data: SubmitRemoteVeoJobDto
        ) -> Optional[str]:
        """
        Serializes a Pydantic model and publishes it to a Pub/Sub topic.

        Args:
            project_id: The Google Cloud project ID.
            topic_id: The ID of the Pub/Sub topic.
            event_data: An instance of SubmitRemoteVeoJobDto.

        Returns:
            The message ID string if publishing is successful, otherwise None.
        """
        try:
            publisher = pubsub_v1.PublisherClient()
            topic_path = publisher.topic_path(project_id, topic_id)
        except exceptions.GoogleAPICallError as e:
            logging.error(f"Error initializing Pub/Sub client or topic path: {e}")
            logging.error("Please ensure you are authenticated with GCP and the project/topic IDs are correct.")
            return None

        try:
            message_bytes = event_data.model_dump_json().encode("utf-8")
            logging.debug(f"Serialized message (bytes): {message_bytes}")
        except Exception as e:
            logging.error(f"Error serializing Pydantic model: {e}")
            return None

        try:
            future = publisher.publish(topic_path, message_bytes)
            message_id = future.result()  # The .result() method blocks until the message is published.
            logging.debug(f"Successfully published message with ID: {message_id} to topic {topic_path}")
            return message_id
        except exceptions.NotFound:
            logging.error(f"Error: Pub/Sub topic not found: {topic_path}")
            logging.error("Please ensure the topic exists in your GCP project.")
        except Exception as e:
            logging.error(f"An unexpected error occurred during publishing: {e}")

        return None


class ExecutorTypeEnum(str, Enum):
    LOCAL_VEO_EXECUTOR_TYPE = "local"
    REMOTE_EXECUTOR_TYPE = "remote"


class VeoExecutorService:
    def __init__(self, process_pool):
        cfg = config_service
        veo_executor_type = cfg.VEO_EXECUTOR_TYPE
        veo_processing_executors = {
            ExecutorTypeEnum.LOCAL_VEO_EXECUTOR_TYPE: process_pool,
            ExecutorTypeEnum.REMOTE_EXECUTOR_TYPE: RemoteVeoExecutor(
                cfg.PROJECT_ID,
                cfg.VEO_REMOTE_EXECUTOR_PUBSUB_TOPIC_ID,
            ),
        }
        self.executor = veo_processing_executors.get(
            veo_executor_type, ExecutorTypeEnum.LOCAL_VEO_EXECUTOR_TYPE)

    def get_executor(self):
        return self.executor
