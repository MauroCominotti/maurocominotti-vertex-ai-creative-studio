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
from os import getenv

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi import status as Status

from src.auth.auth_guard import RoleChecker, get_current_user
from src.galleries.dto.gallery_response_dto import MediaItemResponse
from src.users.user_model import UserModel, UserRoleEnum
from src.videos.dto.create_veo_dto import CreateVeoDto
from src.videos.veo_executors import CloudFunctionExecutor, DEFAULT_VEO_EXECUTOR_TYPE
from src.videos.veo_service import VeoService

# Define role checkers for convenience
user_only = Depends(
    RoleChecker(allowed_roles=[UserRoleEnum.USER, UserRoleEnum.ADMIN])
)

router = APIRouter(
    prefix="/api/videos",
    tags=["Google Video APIs"],
    responses={404: {"description": "Not found"}},
    dependencies=[user_only],
)


@router.post("/generate-videos")
async def generate_videos(
    video_request: CreateVeoDto,
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    service: VeoService = Depends(),
) -> MediaItemResponse | None:
    try:
        # Get the process pool from the application state
        veo_processing_executors = {
            DEFAULT_VEO_EXECUTOR_TYPE: request.app.state.process_pool,
            "remote": CloudFunctionExecutor(),
        }
        veo_executor_type = getenv("VEO_EXECUTOR_TYPE",
                                   DEFAULT_VEO_EXECUTOR_TYPE)
        executor = veo_processing_executors.get(veo_executor_type)

        placeholder_item = service.start_video_generation_job(
            request_dto=video_request,
            user=current_user,
            executor=executor,  # Pass the pool to the service
        )
        return placeholder_item
    except HTTPException as http_exception:
        raise http_exception
    except ValueError as value_error:
        raise HTTPException(
            status_code=Status.HTTP_400_BAD_REQUEST,
            detail=str(value_error),
        )
    except Exception as e:
        raise HTTPException(
            status_code=Status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/{media_id}",
    response_model=MediaItemResponse,
    summary="Get Media Item by ID",
)
async def get_media_item_by_id(
    media_id: str,
    media_service: VeoService = Depends(),
):
    """
    Retrieves a single media item by its unique ID, including its current status
    and presigned URLs for viewing. This is the endpoint to use for polling.
    """
    media_item_response = (
        await media_service.get_media_item_with_presigned_urls(media_id)
    )

    if not media_item_response:
        raise HTTPException(
            status_code=Status.HTTP_404_NOT_FOUND,
            detail="Media item not found.",
        )

    return media_item_response
