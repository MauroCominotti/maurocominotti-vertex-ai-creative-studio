from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from src.auth.auth_guard import get_current_user
from src.brand_guidelines.brand_guideline_service import BrandGuidelineService
from src.brand_guidelines.dto.brand_guideline_response_dto import (
    BrandGuidelineResponseDto,
)
from src.users.user_model import UserModel

MAX_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB

router = APIRouter(
    prefix="/api/brand-guidelines",
    tags=["Brand Guidelines"],
    dependencies=[Depends(get_current_user)],
)


@router.post(
    "",
    response_model=BrandGuidelineResponseDto,
    status_code=status.HTTP_200_OK,  # OK since it can be an update
    summary="Create a Brand Guideline from a PDF",
)
async def create_brand_guideline(
    name: str = Form(min_length=3, max_length=100),
    workspaceId: Optional[str] = Form(None),
    file: UploadFile = File(),
    service: BrandGuidelineService = Depends(),
    current_user: UserModel = Depends(get_current_user),
):
    """
    Uploads a brand guideline PDF for a specific workspace.

    If a brand guideline already exists for the workspace, it will be
    deleted and replaced with the new one.

    The API will wait for the AI processing to finish before returning a response.
    """
    if not file.content_type == "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a PDF.",
        )

    # Check file size before processing
    # We seek to the end to get the size, then back to the beginning.
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File is too large. Maximum size is {MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB.",
        )

    # The service method now handles the entire synchronous workflow.
    return await service.create_and_process_guideline(
        name, file, workspaceId, current_user
    )


@router.get(
    "/{guideline_id}",
    response_model=BrandGuidelineResponseDto,
    summary="Get a Single Brand Guideline",
)
async def get_single_brand_guideline(
    guideline_id: str,
    current_user: UserModel = Depends(get_current_user),
    service: BrandGuidelineService = Depends(),
):
    """
    Retrieves a single brand guideline by its unique ID.

    - Any authenticated user can view global guidelines.
    - Only members of a workspace can view its specific guidelines.
    """
    guideline = await service.get_guideline_by_id(guideline_id, current_user)
    if not guideline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand guideline not found.",
        )
    return guideline


@router.get(
    "/workspace/{workspace_id}",
    response_model=BrandGuidelineResponseDto,
    summary="Get the Brand Guideline for a Workspace",
)
async def get_workspace_brand_guideline(
    workspace_id: str,
    current_user: UserModel = Depends(get_current_user),
    service: BrandGuidelineService = Depends(),
):
    """
    Retrieves the unique brand guideline associated with a specific workspace.

    Returns a 404 error if no guideline has been created for the workspace yet.
    """
    guideline = await service.get_guideline_by_workspace_id(
        workspace_id, current_user
    )
    if not guideline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No brand guideline found for this workspace.",
        )
    return guideline


@router.delete(
    "/{guideline_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a Brand Guideline",
)
async def delete_single_brand_guideline(
    guideline_id: str,
    current_user: UserModel = Depends(get_current_user),
    service: BrandGuidelineService = Depends(),
):
    """
    Deletes a brand guideline and all of its associated assets (e.g., PDF chunks in GCS).

    - Only the workspace owner or a system admin can delete a workspace-specific guideline.
    - Only a system admin can delete a global guideline.
    """
    await service.delete_guideline(
        guideline_id=guideline_id, current_user=current_user
    )
    return None
