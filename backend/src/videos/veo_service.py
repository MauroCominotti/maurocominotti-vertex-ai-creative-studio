# Copyright 2024 Google LLC
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


import asyncio
import json
import logging
import os
import shutil
import subprocess
import sys
import time
from typing import List, Optional
import uuid
from google.genai import types
from src.common.base_dto import MimeTypeEnum
from src.galleries.dto.gallery_response_dto import MediaItemResponse
from src.common.storage_service import GcsService
from src.common.schema.genai_model_setup import GenAIModelSetup
from src.common.schema.media_item_model import JobStatusEnum, MediaItemModel
from src.images.repository.media_item_repository import MediaRepository
from src.videos.dto.create_veo_dto import CreateVeoDto
from src.auth.iam_signer_credentials_service import IamSignerCredentials
from src.config.config_service import ConfigService
from src.multimodal.gemini_service import GeminiService, PromptTargetEnum
from concurrent.futures import ProcessPoolExecutor
from google.cloud.logging.handlers import CloudLoggingHandler
from google.cloud.logging import Client as LoggerClient

logger = logging.getLogger(__name__)


# --- UTILITY FUNCTION ---
def generate_thumbnail(video_path: str) -> str | None:
    """
    Generates a thumbnail from a video file using ffmpeg.

    Args:
        video_path: The path to the video file.

    Returns:
        The path to the generated thumbnail, or None if it fails.
    """
    if not video_path:
        return None

    thumbnail_filename = (
        "thumbnail_"
        + os.path.splitext(os.path.basename(video_path))[0]
        + ".png"
    )
    thumbnail_path = os.path.join(
        os.path.dirname(video_path), thumbnail_filename
    )

    command = [
        "ffmpeg",
        "-i",
        video_path,
        "-ss",
        "00:00:00.000",  # Capture frame at 0 milisecond
        "-vframes",
        "1",
        "-y",  # Overwrite output file if it exists
        thumbnail_path,
    ]
    try:
        subprocess.run(command, check=True, capture_output=True, text=True)
        return thumbnail_path
    except FileNotFoundError:
        logger.error(
            "ffmpeg not found. Please ensure ffmpeg is installed and in your PATH."
        )
        return None
    except subprocess.CalledProcessError as e:
        logger.error(f"Error generating thumbnail: {e.stderr}")
        return None


# --- STANDALONE WORKER FUNCTION ---
# This function will run in the background process. It is defined outside the class.
def _process_video_in_background(media_item_id: str, request_dto: CreateVeoDto):
    """
    This is the long-running worker task. It creates its own service instances
    because it runs in a completely separate process.
    The long-running process that generates video, thumbnails, and updates the
    database record upon completion or failure.
    """
    # In a new process, the logging configuration is reset. We must re-configure it
    # to see logs with a level of INFO or lower.
    # --- HYBRID LOGGING SETUP FOR THE WORKER PROCESS ---
    worker_logger = logging.getLogger(f"video_worker.{media_item_id}")
    worker_logger.setLevel(logging.INFO)

    try:
        # Clear any handlers that might be inherited from the parent process
        if worker_logger.hasHandlers():
            worker_logger.handlers.clear()

        if os.getenv("ENVIRONMENT") == "production":
            # In PRODUCTION, use the CloudLoggingHandler for structured JSON logs.
            log_client = LoggerClient()
            handler = CloudLoggingHandler(
                log_client, name=f"video_worker.{media_item_id}"
            )
            worker_logger.addHandler(handler)
        else:
            # In DEVELOPMENT, use a simple stream handler for readable console output.
            handler = logging.StreamHandler(sys.stdout)
            formatter = logging.Formatter(
                "%(asctime)s - [WORKER] - %(levelname)s - %(message)s"
            )
            handler.setFormatter(formatter)
            worker_logger.addHandler(handler)

        # Create new instances of dependencies within this process
        media_repo = MediaRepository()
        gemini_service = GeminiService()
        gcs_service = GcsService()
        try:
            client = GenAIModelSetup.init()
            cfg = ConfigService()
            gcs_output_directory = f"gs://{cfg.GENMEDIA_BUCKET}"

            rewritten_prompt = gemini_service.enhance_prompt_from_dto(
                dto=request_dto, target_type=PromptTargetEnum.VIDEO
            )
            request_dto.prompt = rewritten_prompt

            all_generated_videos: List[types.GeneratedVideo] = []

            start_time = time.monotonic()

            operation: types.GenerateVideosOperation = (
                client.models.generate_videos(
                    model="veo-3.0-generate-preview",
                    prompt=request_dto.prompt,
                    config=types.GenerateVideosConfig(
                        number_of_videos=request_dto.number_of_media,
                        output_gcs_uri=gcs_output_directory,
                        aspect_ratio=request_dto.aspect_ratio,
                        negative_prompt=request_dto.negative_prompt,
                        generate_audio=request_dto.generate_audio,
                        duration_seconds=request_dto.duration_seconds,
                    ),
                )
            )

            # Poll the operation status until the video is ready
            while not operation.done:
                worker_logger.info(
                    "Waiting for video generation to complete, polling video generation status...",
                    extra={
                        "json_fields": {
                            "media_id": media_item_id,
                            "operation_name": operation.name,
                        }
                    },
                )
                time.sleep(10)
                operation = client.operations.get(operation)

            if operation.error:
                raise Exception(operation.error)

            if (
                not operation
                or not operation.response
                or not operation.response.generated_videos
            ):
                return None

            # Download the generated video and create thumbnail
            thumbnail_path = ""

            permanent_thumbnail_gcs_uris = []
            for generated_video in operation.response.generated_videos:
                if generated_video.video and generated_video.video.uri:
                    output_path = f"{generated_video.video.uri.replace(f"gs://{cfg.GENMEDIA_BUCKET}/", "")}"

                    # Step 1: Download the Video from GCS
                    local_output_path = f"thumbnails/{output_path}"
                    downloaded_video_path = gcs_service.download_from_gcs(
                        gcs_uri_path=output_path,
                        destination_file_path=local_output_path,
                    )

                    # Step 2: Generate Thumbnail from the first video frame
                    thumbnail_path = generate_thumbnail(
                        downloaded_video_path or ""
                    )

                    # Step 3: Save the Thumbnail in GCS
                    if thumbnail_path:
                        # Get the parent directory of the thumbnail to clean it up later.
                        temp_dir = os.path.dirname(thumbnail_path)
                        try:
                            thumbnail_gcs_uri = (
                                gcs_service.upload_file_to_gcs(
                                    local_path=thumbnail_path,
                                    destination_blob_name=thumbnail_path.replace(
                                        "thumbnails/", ""
                                    ),
                                    mime_type="image/png",
                                )
                                or ""
                            )
                            permanent_thumbnail_gcs_uris.append(
                                thumbnail_gcs_uri
                            )
                            # TODO: Delete the folder created under thumbnails/
                        except Exception as e:
                            # It's good practice to log or handle potential upload errors.
                            print(
                                f"Failed to upload {thumbnail_path}. Error: {e}"
                            )
                        finally:
                            # This block executes whether the try block succeeded or failed.
                            # We use shutil.rmtree to recursively delete the temporary directory.
                            if os.path.exists(temp_dir):
                                shutil.rmtree(temp_dir)

            all_generated_videos.extend(
                operation.response.generated_videos or []
            )

            end_time = time.monotonic()
            generation_time = end_time - start_time

            valid_generated_videos = [
                img
                for img in all_generated_videos
                if img.video and img.video.uri
            ]
            permanent_gcs_uris = [
                img.video.uri
                for img in valid_generated_videos
                if img.video and img.video.uri
            ]

            # --- WHEN COMPLETE, UPDATE THE DOCUMENT IN FIRESTORE ---
            update_data = {
                "status": JobStatusEnum.COMPLETED,
                "prompt": rewritten_prompt,
                "gcs_uris": permanent_gcs_uris,  # The final GCS URLs
                "thumbnail_uris": permanent_thumbnail_gcs_uris,
                "generation_time": generation_time,
                "num_media": len(permanent_gcs_uris),
            }
            media_repo.update(media_item_id, update_data)
            worker_logger.info(
                "Successfully processed video job.",
                extra={
                    "json_fields": {
                        "media_id": media_item_id,
                        "generation_time_seconds": generation_time,
                        "videos_generated": len(permanent_gcs_uris),
                    }
                },
            )

        except Exception as e:
            worker_logger.error(
                "Video generation task failed.",
                extra={
                    "json_fields": {"media_id": media_item_id, "error": str(e)}
                },
                exc_info=True,
            )  # exc_info=True still adds the full traceback
            # --- ON FAILURE, UPDATE THE DOCUMENT WITH AN ERROR STATUS ---
            error_update_data = {
                "status": JobStatusEnum.FAILED,
                "error_message": str(e),
            }
            media_repo.update(media_item_id, error_update_data)
    except Exception as e:
        worker_logger.error(
            "Video generation task failed.",
            extra={"json_fields": {"media_id": media_item_id, "error": str(e)}},
            exc_info=True,
        )  # exc_info=True still adds the full traceback


class VeoService:

    def __init__(self):
        """Initializes the service with its dependencies."""
        self.iam_signer_credentials = IamSignerCredentials()
        self.media_repo = MediaRepository()
        self.gemini_service = GeminiService()
        self.gcs_service = GcsService()

    def start_video_generation_job(
        self,
        request_dto: CreateVeoDto,
        user_email: str,
        executor: ProcessPoolExecutor,
    ) -> MediaItemResponse:
        """
        Immediately creates a placeholder MediaItem and starts the video generation
        in the background.

        Returns:
            The initial MediaItem with a 'processing' status and a pre-generated ID.
        """
        # 1. Generate an ID beforehand
        media_item_id = str(uuid.uuid4())

        # 2. Create a placeholder document
        placeholder_item = MediaItemModel(
            id=media_item_id,
            user_email=user_email,
            mime_type=MimeTypeEnum.VIDEO_MP4,
            model=request_dto.generation_model,
            original_prompt=request_dto.prompt,
            status=JobStatusEnum.PROCESSING,
            # Populate other known request parameters
            aspect_ratio=request_dto.aspect_ratio,
            style=request_dto.style,
            lighting=request_dto.lighting,
            color_and_tone=request_dto.color_and_tone,
            composition=request_dto.composition,
            negative_prompt=request_dto.negative_prompt,
            duration_seconds=request_dto.duration_seconds,
            gcs_uris=[],
        )

        # 3. Save the placeholder to the database immediately
        self.media_repo.save(placeholder_item)

        # 4. Instead of using Fastapi's BackgroundTasks, submit the long-running
        # function to the process pool, running it in a completely separate process.
        executor.submit(
            _process_video_in_background,
            media_item_id=placeholder_item.id,
            request_dto=request_dto,
        )

        logger.info(
            "Video generation job successfully queued.",
            extra={
                "json_fields": {
                    "message": "Video generation job successfully queued.",
                    "media_id": placeholder_item.id,
                    "user_email": user_email,
                    "model": request_dto.generation_model,
                }
            },
        )

        # 5. Return the placeholder to the frontend
        return MediaItemResponse(
            **placeholder_item.model_dump(),
            presigned_urls=[],
            presigned_thumbnail_urls=[],
        )

    async def get_media_item_with_presigned_urls(
        self, media_id: str
    ) -> Optional[MediaItemResponse]:
        """
        Fetches a MediaItem by its ID and enriches it with presigned URLs for
        both the main media and its thumbnails.

        Args:
            media_id: The unique ID of the media item.

        Returns:
            A MediaItemResponse object with presigned URLs, or None if not found.
        """
        # 1. Fetch the base document from Firestore.
        media_item = self.media_repo.get_by_id(media_id)
        if not media_item:
            return None

        # 2. Create tasks to generate all presigned URLs in parallel.
        presigned_url_tasks = [
            asyncio.to_thread(
                self.iam_signer_credentials.generate_presigned_url, uri
            )
            for uri in media_item.gcs_uris
        ]
        presigned_thumbnail_url_tasks = [
            asyncio.to_thread(
                self.iam_signer_credentials.generate_presigned_url, uri
            )
            for uri in media_item.thumbnail_uris
        ]

        # 3. Execute all URL generation tasks concurrently.
        presigned_urls, presigned_thumbnail_urls = await asyncio.gather(
            asyncio.gather(*presigned_url_tasks),
            asyncio.gather(*presigned_thumbnail_url_tasks),
        )

        # 4. Construct the final response DTO.
        # We unpack the original model's data and add the new URL lists.
        return MediaItemResponse(
            **media_item.model_dump(),
            presigned_urls=presigned_urls,
            presigned_thumbnail_urls=presigned_thumbnail_urls,
        )
