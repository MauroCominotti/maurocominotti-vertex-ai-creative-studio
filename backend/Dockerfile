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

# Dockerfile

# ---- Stage 1: Builder ----
# This stage uses the larger 'uv' image to efficiently build our virtual environment.
# None of the tools or layers from this stage will be in the final image.
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim as builder

WORKDIR /app

# Create a virtual environment inside the working directory.
RUN python -m venv .venv

# Copy only the dependency definition files first.
# This creates a separate layer that is cached by Docker.
COPY pyproject.toml uv.lock ./

# Install dependencies into the virtual environment.
# This step only re-runs if your 'uv.lock' file changes.
RUN --mount=type=cache,target=/root/.cache/uv \
    .venv/bin/uv sync --locked --no-dev

# Copy the rest of your application source code.
COPY . .

# ---- Stage 2: Final Image ----
# This is our final, slim, production-ready image.
FROM python:3.12-slim-bookworm

# Create a non-root user for better security.
RUN useradd --create-home appuser
WORKDIR /home/appuser
USER appuser

# Install ffmpeg and immediately clean up the apt cache to keep the layer small.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy ONLY the virtual environment and your application code from the 'builder' stage.
COPY --from=builder /app/.venv ./.venv
COPY --from=builder /app ./

# Add the virtual environment's bin directory to the system's PATH.
ENV PATH="/home/appuser/.venv/bin:$PATH"

# Set default environment variables. These can be overridden by Cloud Run.
ENV ENVIRONMENT="development"
ENV FRONTEND_URL="http://localhost:4200"

EXPOSE 8080

# The final command to run your application.
CMD ["gunicorn", "main:app", "--workers=4", "--worker-class=uvicorn.workers.UvicornWorker", "--timeout=36000", "--bind=0.0.0.0:8080"]
