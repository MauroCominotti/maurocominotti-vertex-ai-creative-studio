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
import base64
import json

from pydantic_core._pydantic_core import ValidationError

# --- Setup Logging Globally First ---
from src.config.logger_config import setup_logging
from src.videos.dto.submit_remote_veo_job_dto import SubmitRemoteVeoJobDto

setup_logging()

import logging
from concurrent.futures import ProcessPoolExecutor
from contextlib import asynccontextmanager
from os import getenv

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import functions_framework

from src.audios.audio_controller import router as audio_router
from src.auth import firebase_client_service
from src.galleries.gallery_controller import router as gallery_router
from src.generation_options.generation_options_controller import (
    router as generation_options_router,
)
from src.images.imagen_controller import router as imagen_router
from src.media_templates.media_templates_controller import (
    router as media_template_router,
)
from src.multimodal.gemini_controller import router as gemini_router
from src.source_assets.source_asset_controller import (
    router as source_asset_router,
)
from src.users.user_controller import router as user_router
from src.videos.veo_controller import router as video_router
from src.videos.veo_service import _process_video_in_background

@functions_framework.cloud_event
def remote_veo_executor_cloud_function_entrypoint(cloud_event):
    """
    This function is triggered by a message on a Pub/Sub topic.
    It decodes, parses, and validates the incoming message.

    Args:
        cloud_event: The CloudEvent object containing the Pub/Sub message.
    """
    print(f"Received CloudEvent with ID: {cloud_event['id']}")

    # The actual message data is base64-encoded and located in this path.
    message_data_encoded = cloud_event.data.get("message", {}).get("data")

    if not message_data_encoded:
        print("ERROR: Message data is empty or missing.")
        return 'No message data received', 400

    try:
        # 1. Decode the base64-encoded message data.
        message_data_decoded = base64.b64decode(message_data_encoded).decode("utf-8")
        print(f"Decoded message: {message_data_decoded}")

        # 2. Parse the JSON string into a Python dictionary.
        data_dict = json.loads(message_data_decoded)

        # 3. Validate the dictionary against the Pydantic model.
        #    `model_validate` is the modern Pydantic v2+ way.
        #    For Pydantic v1, you would use `UserEvent.parse_obj(data_dict)`.
        event_model = SubmitRemoteVeoJobDto.model_validate(data_dict)

    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        print(f"ERROR: Could not decode or parse message data. Error: {e}")
        # Acknowledge the message by returning a success status code so it's not redelivered.
        return 'Message is not valid JSON or UTF-8', 200
    except ValidationError as e:
        print(f"ERROR: Pydantic model validation failed. Error: {e}")
        # Acknowledge the message to prevent redelivery of invalid data.
        return 'Data validation failed', 200
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        # Don't acknowledge the message so it might be retried.
        raise

    # If validation is successful, call the main processing function.
    _process_video_in_background(event_model.media_item_id, event_model.request_dto)

    return 'Successfully processed message', 200

# Get a logger instance for use in this file. It will inherit the root setup.
logger = logging.getLogger(__name__)


def configure_cors(app):
    """Configures CORS middleware based on the environment."""
    environment = getenv("ENVIRONMENT")
    print(environment)
    allowed_origins = []

    if environment == "production":
        frontend_url = getenv("FRONTEND_URL")
        if not frontend_url:
            raise ValueError(
                "FRONTEND_URL environment variable not set in production"
            )
        allowed_origins.append(frontend_url)
    elif environment in ["development", "test"]:
        allowed_origins.append("*")  # Allow all origins in development
    else:
        raise ValueError(
            f"Invalid ENVIRONMENT: {environment}. Must be 'production', 'development' or 'test'"
        )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code here runs on startup
    logger.info("Application startup initializing")

    # Startup logic
    logger.info(
        f"""Firebase App Name (if initialized): {
          firebase_client_service.firebase_admin.get_app().name
          if firebase_client_service.firebase_admin._apps
          else 'Not Initialized'
        }"""
    )

    logger.info("Creating ProcessPoolExecutor...")
    # Create the pool and attach it to the app's state
    app.state.process_pool = ProcessPoolExecutor(max_workers=4)

    yield

    # Code here runs on shutdown
    logger.info("Application shutdown terminating")

    logger.info("Closing ProcessPoolExecutor...")
    app.state.process_pool.shutdown(wait=True)
    # Your shutdown logic here, e.g., closing database connections


app = FastAPI(
    lifespan=lifespan,
    title="Creative Studio API",
    description="""GenMedia Creative Studio is an app that highlights the capabilities
    of Google Cloud Vertex AI generative AI creative APIs, including Imagen, Veo, Lyria, Chirp and more! 🚀""",
)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """
    This is the global 'catch-all' exception handler.
    It catches any exception that is not specifically handled by other exception handlers.
    """
    # Log the full error for debugging purposes
    logger.error(
        f"Unhandled exception for request {request.method} {request.url}: {exc}",
        exc_info=True,
    )

    # Return a standardized 500 Internal Server Error response
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred."},
    )


@app.get("/", tags=["Health Check"])
async def root():
    return "You are calling Creative Studio Backend"


@app.get("/api/version", tags=["Health Check"])
def version():
    return "v0.0.1"


configure_cors(app)

app.include_router(imagen_router)
app.include_router(audio_router)
app.include_router(video_router)
app.include_router(gallery_router)
app.include_router(gemini_router)
app.include_router(user_router)
app.include_router(generation_options_router)
app.include_router(media_template_router)
app.include_router(source_asset_router)

if __name__ == "__main__":
    uvicorn.run(host="localhost", port=8080, app=app, log_level="info")
