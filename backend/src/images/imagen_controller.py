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

from fastapi import APIRouter, Depends, HTTPException
from fastapi import status as Status
from src.auth.auth_guard import RoleChecker, get_current_user
from src.common.base_dto import GenerationModelEnum
from src.galleries.dto.gallery_response_dto import MediaItemResponse
from src.images.dto.create_imagen_dto import CreateImagenDto
from src.images.dto.edit_imagen_dto import EditImagenDto
from src.images.dto.upscale_imagen_dto import UpscaleImagenDto
from src.models.services.imagen_service import ImagenService
from src.images.schema.imagen_result_model import ImageGenerationResult
from src.users.user_model import User, UserRoleEnum

# Define role checkers for convenience
user_only = Depends(
    RoleChecker(allowed_roles=[UserRoleEnum.USER, UserRoleEnum.ADMIN])
)

router = APIRouter(
    prefix="/api/images",
    tags=["Google Imagen APIs"],
    responses={404: {"description": "Not found"}},
    dependencies=[user_only],
)

image_service_by_model_mapping = {
    GenerationModelEnum.IMAGEN_4_ULTRA: ImagenService,
    GenerationModelEnum.IMAGEN_3_001: ImagenService,
    GenerationModelEnum.IMAGEN_3_FAST: ImagenService,
    GenerationModelEnum.IMAGEN_3_002: ImagenService,
    GenerationModelEnum.IMAGEGEN_006: ImagenService,
    GenerationModelEnum.IMAGEGEN_005: ImagenService,
    GenerationModelEnum.IMAGEGEN_002: ImagenService,
    GenerationModelEnum.GEMINI_25_FLASH_IMAGE_PREVIEW: GeminiService,
}


@router.post("/generate-images")
async def generate_images(
    image_request: CreateImagenDto,
    current_user: User = Depends(get_current_user),
) -> MediaItemResponse | None:
    try:
        service = image_service_by_model_mapping.get(image_request.generation_model, None)
        return await service.generate_images(
            request_dto=image_request, user_email=current_user.email
        )
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


@router.post("/generate-images-for-vto")
def generate_images_vto(prompt: str) -> ImageGenerationResult:
    try:
        service = ImagenService()
        return service.generate_image_for_vto(prompt)
    except Exception as e:
        raise HTTPException(
            status_code=Status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/recontextualize-product-in-scene")
def recontextualize_product_in_scene(
    image_uris_list: list[str], prompt: str, sample_count: int
) -> list[str]:
    try:
        service = ImagenService()
        return service.recontextualize_product_in_scene(
            image_uris_list, prompt, sample_count
        )
    except Exception as e:
        raise HTTPException(
            status_code=Status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/edit-image")
def edit_image(image_request: EditImagenDto) -> list[ImageGenerationResult]:
    try:
        service = ImagenService()
        return service.edit_image(image_request)
    except Exception as e:
        raise HTTPException(
            status_code=Status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/upscale-image")
async def upscale_image(
    image_request: UpscaleImagenDto,
) -> ImageGenerationResult | None:
    try:
        service = ImagenService()
        return await service.upscale_image(request_dto=image_request)
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
