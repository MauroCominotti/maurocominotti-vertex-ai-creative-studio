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


from fastapi.responses import JSONResponse
from src.config import (
    logger_config,
)  # Import the logging configuration first to ensure it's set up.
from contextlib import asynccontextmanager
import logging
from os import getenv
import sys

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware

from src.auth import firebase_client_service
from src.images.imagen_controller import router as imagen_router
from src.audios.audio_controller import router as audio_router
from src.videos.veo_controller import router as video_router
from src.galleries.gallery_controller import router as gallery_router
from src.multimodal.gemini_controller import router as gemini_router
from src.users.user_controller import router as user_router
from src.generation_options.generation_options_controller import (
    router as generation_options_router,
)
from src.media_templates.media_templates_controller import (
    router as media_template_router,
)

# Get the logger instance that Uvicorn is using
logging.basicConfig(
    level=logging.INFO,
    stream=sys.stderr,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    encoding="utf-8",
)
logger = logging.getLogger(__name__)


def configure_cors(app):
    """Configures CORS middleware based on the environment."""
    environment = getenv("ENVIRONMENT")
    allowed_origins = []

    if environment == "production":
        frontend_url = getenv("FRONTEND_URL")
        if not frontend_url:
            raise ValueError(
                "FRONTEND_URL environment variable not set in production"
            )
        allowed_origins.append(frontend_url)
    elif environment == "development":
        allowed_origins.append("*")  # Allow all origins in development
    else:
        raise ValueError(
            f"Invalid ENVIRONMENT: {environment}. Must be 'production' or 'development'"
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

    yield

    # Code here runs on shutdown
    logger.info("Application shutdown terminating")
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
