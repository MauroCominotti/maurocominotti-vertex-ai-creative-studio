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

import asyncio
import datetime
import io
import logging
import math
import os
import shutil
import sys
import uuid
import json
from concurrent.futures import (
    ProcessPoolExecutor,
    ThreadPoolExecutor,
    as_completed,
)
from typing import List, Optional

from fastapi import HTTPException, UploadFile, status, Depends
from google.cloud.logging import Client as LoggerClient
from google.cloud.logging.handlers import CloudLoggingHandler
from google.genai import types
from pypdf import PdfReader, PdfWriter

from src.workspaces.schema.workspace_model import WorkspaceScopeEnum
from src.auth.iam_signer_credentials_service import IamSignerCredentials
from src.brand_guidelines.dto.brand_guideline_response_dto import (
    BrandGuidelineResponseDto,
)
from src.brand_guidelines.dto.brand_guideline_search_dto import (
    BrandGuidelineSearchDto,
)
from src.brand_guidelines.dto.finalize_upload_dto import FinalizeUploadDto
from src.brand_guidelines.dto.generate_upload_url_dto import (
    GenerateUploadUrlDto,
    GenerateUploadUrlResponseDto,
)
from src.brand_guidelines.repository.brand_guideline_repository import (
    BrandGuidelineRepository,
)
from src.brand_guidelines.schema.brand_guideline_model import (
    BrandGuidelineModel,
)
from src.common.schema.media_item_model import JobStatusEnum
from src.common.storage_service import GcsService
from src.common.vector_search_service import VectorSearchService
from src.multimodal.gemini_service import GeminiService
from src.users.user_model import UserModel, UserRoleEnum
from src.workspaces.repository.workspace_repository import WorkspaceRepository

logger = logging.getLogger(__name__)

# Gemini API has a 50 MiB limit for PDF files.
GEMINI_PDF_LIMIT_BYTES = 50 * 1024 * 1024


def _process_brand_guideline_in_background(
    guideline_id: int,
    name: str,
    original_filename: str,
    source_gcs_uri: str,
    workspace_id: Optional[int],
):
    """
    This is the long-running worker task that runs in a separate process.
    """
    import asyncio
    import os
    import sys
    from google.cloud.logging import Client as LoggerClient
    from google.cloud.logging.handlers import CloudLoggingHandler
    from src.database import WorkerDatabase

    worker_logger = logging.getLogger(f"brand_guideline_worker.{guideline_id}")
    worker_logger.setLevel(logging.INFO)

    try:
        # --- HYBRID LOGGING SETUP FOR THE WORKER PROCESS ---
        if worker_logger.hasHandlers():
            worker_logger.handlers.clear()

        if os.getenv("ENVIRONMENT") == "production":
            log_client = LoggerClient()
            handler = CloudLoggingHandler(
                log_client, name=f"brand_guideline_worker.{guideline_id}"
            )
            worker_logger.addHandler(handler)
        else:
            handler = logging.StreamHandler(sys.stdout)
            formatter = logging.Formatter(
                "%(asctime)s - [BRAND_GUIDELINE_WORKER] - %(levelname)s - %(message)s"
            )
            handler.setFormatter(formatter)
            worker_logger.addHandler(handler)

        # Create a new event loop for this process
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        async def _async_worker():
            async with WorkerDatabase() as db_factory:
                async with db_factory() as db:
                    # Create new instances of dependencies within this process
                    repo = BrandGuidelineRepository(db)
                    gcs_service = GcsService()
                    # GeminiService needs brand_guideline_repo
                    gemini_service = GeminiService(brand_guideline_repo=repo)
                    vector_search_service = VectorSearchService()

                    try:
                        # 0. Download the source PDF from GCS
                        worker_logger.info(f"Downloading source PDF from {source_gcs_uri}")
                        file_contents = gcs_service.download_bytes_from_gcs(source_gcs_uri)
                        worker_logger.info(f"Downloaded {len(file_contents) if file_contents else 0} bytes from GCS.")

                        # 1. Split if necessary and upload file(s) to GCS
                        gcs_uris = await BrandGuidelineService._split_and_upload_pdf(
                            gcs_service,
                            file_contents or b"",
                            workspace_id,
                            original_filename,
                        )

                        if not gcs_uris:
                            raise Exception(
                                "Failed to upload PDF chunk(s) to Google Cloud Storage."
                            )

                        worker_logger.info(
                            f"PDF(s) uploaded to {gcs_uris}. Starting AI extraction."
                        )

                        # 1.5 Extract Images (Merged from HEAD)
                        worker_logger.info("Extracting reference images from PDF...")
                        extracted_image_uris = await BrandGuidelineService._extract_and_upload_images(
                            gcs_service,
                            file_contents or b"",
                            str(workspace_id) if workspace_id else None,
                            original_filename
                        )
                        worker_logger.info(f"Extracted {len(extracted_image_uris)} reference images.")

                        # 2. Call Gemini for each chunk to extract structured data
                        worker_logger.info(f"Starting AI extraction for {len(gcs_uris)} chunks.")
                        
                        # Use asyncio.gather to run extractions in parallel
                        # We need to capture both the result and the index/metadata for vector indexing
                        async def extract_and_store(index: int, uri: str):
                            try:
                                # Run sync method in executor
                                result = await loop.run_in_executor(None, gemini_service.extract_brand_info_from_pdf, uri)
                                
                                if result:
                                    # Save chunk JSON to GCS (Merged from HEAD)
                                    chunk_json_path = f"brand-guidelines/{workspace_id or 'global'}/processed/{guideline_id}/text/chunk_{index}.json"
                                    # Assuming gcs_service.upload_bytes_to_gcs is sync (based on HEAD usage)
                                    # but inside _split_and_upload_pdf it was called with run_in_thread.
                                    # Safe to run in thread here too.
                                    await loop.run_in_executor(
                                        None,
                                        lambda: gcs_service.upload_bytes_to_gcs(
                                            json.dumps(result).encode('utf-8'),
                                            chunk_json_path,
                                            "application/json"
                                        )
                                    )
                                    
                                    return {
                                        "success": True,
                                        "index": index,
                                        "data": result,
                                        "gcs_uri": f"gs://{gcs_service.bucket_name}/{chunk_json_path}"
                                    }
                            except Exception as e:
                                worker_logger.error(f"Extraction for PDF chunk {uri} failed: {e}")
                                return {"success": False, "error": str(e)}

                        tasks = [extract_and_store(i, uri) for i, uri in enumerate(gcs_uris)]
                        chunk_results = await asyncio.gather(*tasks)

                        successful_partial_results = []
                        successful_chunks_metadata = []

                        for res in chunk_results:
                            if res and res.get("success"):
                                successful_partial_results.append(res["data"])
                                successful_chunks_metadata.append(res)

                        # 3. Aggregate the results
                        worker_logger.info(f"Aggregating results from {len(successful_partial_results)} successful extractions.")
                        extracted_data: BrandGuidelineModel | None = (
                            gemini_service.aggregate_brand_info(successful_partial_results)
                        )

                        if not extracted_data:
                            worker_logger.error(
                                f"Failed to extract data from PDF at {gcs_uris}."
                            )
                            raise Exception(
                                "AI processing failed to extract data from the PDF."
                            )

                        # 4. Index Content into Vector Search (Multimodal RAG) (Merged from HEAD)
                        text_vectors = []
                        image_vectors = []

                        # 4a. Index Text Chunks
                        for chunk in successful_chunks_metadata:
                            # Embed the guideline text from the chunk
                            text_content = chunk["data"].get("guideline_text", "")
                            # Fallback to rules if text is empty, or combine them
                            if not text_content and chunk["data"].get("brand_rules"):
                                text_content = "\n".join(chunk["data"]["brand_rules"])
                            
                            worker_logger.info(f"Chunk {chunk['index']} text content length: {len(text_content)}")
                            
                            if text_content:
                                try:
                                    embedding = await loop.run_in_executor(None, gemini_service.generate_embedding, text_content)
                                    if embedding:
                                        worker_logger.info(f"Generated embedding for chunk {chunk['index']}, length: {len(embedding)}")
                                        text_vectors.append({
                                            "id": f"{guideline_id}_text_{chunk['index']}",
                                            "embedding": embedding,
                                            "restricts": [
                                                {"namespace": "scope", "allow_list": [str(workspace_id) if workspace_id else "Global"]},
                                                {"namespace": "type", "allow_list": ["text"]},
                                                {"namespace": "guideline_id", "allow_list": [str(guideline_id)]},
                                            ]
                                        })
                                    else:
                                        worker_logger.warning(f"Embedding generation returned None for chunk {chunk['index']}")
                                except Exception as e:
                                    worker_logger.error(f"Failed to embed text chunk {chunk['index']}: {e}")
                            else:
                                worker_logger.warning(f"No text content found for chunk {chunk['index']}")

                        # 4b. Index Images
                        for i, img_uri in enumerate(extracted_image_uris):
                            try:
                                # Determine mime type from extension
                                mime_type = "image/png"
                                if img_uri.lower().endswith(".jpg") or img_uri.lower().endswith(".jpeg"):
                                    mime_type = "image/jpeg"
                                
                                img_part = types.Part.from_uri(file_uri=img_uri, mime_type=mime_type)
                                embedding = await loop.run_in_executor(None, gemini_service.generate_embedding, [img_part])
                                
                                if embedding:
                                    image_vectors.append({
                                        "id": f"{guideline_id}_image_{i}",
                                        "embedding": embedding,
                                        "restricts": [
                                            {"namespace": "scope", "allow_list": [str(workspace_id) if workspace_id else "Global"]},
                                            {"namespace": "type", "allow_list": ["image"]},
                                            {"namespace": "guideline_id", "allow_list": [str(guideline_id)]},
                                        ]
                                    })
                            except Exception as e:
                                worker_logger.error(f"Failed to embed image {img_uri}: {e}")

                        # 4c. Upsert to respective indices
                        if text_vectors:
                            worker_logger.info(f"Upserting {len(text_vectors)} text vectors to Text Index.")
                            await loop.run_in_executor(None, vector_search_service.upsert_vectors, text_vectors, "text")
                        
                        if image_vectors:
                            worker_logger.info(f"Upserting {len(image_vectors)} image vectors to Image Index.")
                            await loop.run_in_executor(None, vector_search_service.upsert_vectors, image_vectors, "image")

                        worker_logger.info("Vector upsert complete.")

                        # 5. Update the final, fully-populated database record
                        update_data = {
                            "status": JobStatusEnum.COMPLETED,
                            "source_pdf_gcs_uris": gcs_uris,
                            "color_palette": extracted_data.color_palette,
                            "tone_of_voice_summary": extracted_data.tone_of_voice_summary,
                            "visual_style_summary": extracted_data.visual_style_summary,
                            "guideline_text": extracted_data.guideline_text,
                            "brand_rules": extracted_data.brand_rules,
                            "reference_image_uris": extracted_image_uris,
                        }
                        await repo.update(guideline_id, update_data)
                        worker_logger.info(
                            f"Successfully processed brand guideline: {guideline_id}"
                        )

                    except Exception as e:
                        worker_logger.error(
                            "Brand guideline processing task failed.",
                            extra={
                                "json_fields": {
                                    "guideline_id": guideline_id,
                                    "error": str(e),
                                }
                            },
                            exc_info=True,
                        )
                        # --- ON FAILURE, UPDATE THE DOCUMENT WITH AN ERROR STATUS ---
                        error_update_data = {
                            "status": JobStatusEnum.FAILED,
                            "error_message": str(e),
                        }
                        await repo.update(guideline_id, error_update_data)

        loop.run_until_complete(_async_worker())
        loop.close()

    except Exception as e:
        worker_logger.error(
            "Brand guideline worker failed to initialize.",
            extra={
                "json_fields": {"guideline_id": guideline_id, "error": str(e)}
            },
            exc_info=True,
        )


class BrandGuidelineService:
    """
    Handles the business logic for creating and managing brand guidelines,
    including PDF processing via background tasks.
    """

    def __init__(
        self,
        repo: BrandGuidelineRepository = Depends(),
        gcs_service: GcsService = Depends(),
        gemini_service: GeminiService = Depends(),
        workspace_repo: WorkspaceRepository = Depends(),
        iam_signer_credentials: IamSignerCredentials = Depends(),
        vector_search_service: VectorSearchService = Depends(),
    ):
        self.repo = repo
        self.gcs_service = gcs_service
        self.gemini_service = gemini_service
        self.workspace_repo = workspace_repo
        self.iam_signer_credentials = iam_signer_credentials
        self.vector_search_service = vector_search_service

    @staticmethod
    async def _split_and_upload_pdf(
        gcs_service: GcsService,
        file_contents: bytes,
        workspace_id: Optional[int],
        original_filename: str,
    ) -> list[str]:
        """
        Splits a large PDF into chunks that are under the size limit,
        uploads them to GCS, and returns their GCS URIs.
        """
        file_size = len(file_contents)
        timestamp = datetime.datetime.now(datetime.timezone.utc).strftime(
            "%Y%m%d%H%M%S"
        )
        file_uuid = uuid.uuid4()

        if file_size <= GEMINI_PDF_LIMIT_BYTES:
            # No splitting needed, upload the single file
            destination_blob_name = f"brand-guidelines/{workspace_id or 'global'}/{timestamp}-{file_uuid}-{original_filename}"
            # Run the single upload in a thread to keep the function async
            gcs_uri = await asyncio.to_thread(
                gcs_service.upload_bytes_to_gcs,
                file_contents,
                destination_blob_name=destination_blob_name,
                mime_type="application/pdf",
            )
            return [gcs_uri] if gcs_uri else []

        # Splitting is required
        logger.info(
            f"PDF size ({file_size} bytes) exceeds limit. Splitting file."
        )
        reader = PdfReader(io.BytesIO(file_contents))
        num_pages = len(reader.pages)
        num_chunks = math.ceil(file_size / GEMINI_PDF_LIMIT_BYTES)
        pages_per_chunk = math.ceil(num_pages / num_chunks)

        upload_tasks = []
        for i in range(num_chunks):
            writer = PdfWriter()
            start_page = i * pages_per_chunk
            end_page = min(start_page + pages_per_chunk, num_pages)
            for page_num in range(start_page, end_page):
                writer.add_page(reader.pages[page_num])

            with io.BytesIO() as chunk_bytes_io:
                writer.write(chunk_bytes_io)
                chunk_bytes = chunk_bytes_io.getvalue()

            chunk_filename = (
                f"{timestamp}-{file_uuid}-part-{i+1}-{original_filename}"
            )
            dest_blob_name = (
                f"brand-guidelines/{workspace_id or 'global'}/{chunk_filename}"
            )
            upload_tasks.append(
                asyncio.to_thread(
                    gcs_service.upload_bytes_to_gcs,
                    chunk_bytes,
                    destination_blob_name=dest_blob_name,
                    mime_type="application/pdf",
                )
            )

        return await asyncio.gather(*upload_tasks)

    @staticmethod
    async def _extract_and_upload_images(
        gcs_service: GcsService,
        file_contents: bytes,
        workspace_id: Optional[str],
        original_filename: str,
    ) -> list[str]:
        """
        Extracts images from the PDF bytes, converts them to PNG, and uploads them to GCS.
        Returns a list of GCS URIs for the extracted images.
        """
        logger.info("Starting image extraction from PDF...")
        extracted_uris = []
        timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d%H%M%S")
        file_uuid = uuid.uuid4()
        
        try:
            from PIL import Image as PILImage
            
            reader = PdfReader(io.BytesIO(file_contents))
            
            image_upload_tasks = []
            
            for page_num, page in enumerate(reader.pages):
                if "/XObject" in page["/Resources"]:
                    xObject = page["/Resources"]["/XObject"].get_object()
                    for obj in xObject:
                        if xObject[obj]["/Subtype"] == "/Image":
                            try:
                                size = (xObject[obj]["/Width"], xObject[obj]["/Height"])
                                # Filter out small icons/logos (e.g. < 100x100)
                                if size[0] < 100 or size[1] < 100:
                                    continue

                                data = xObject[obj].get_data()
                                
                                # Convert to PNG using Pillow to ensure compatibility
                                try:
                                    img = PILImage.open(io.BytesIO(data))
                                    output_buffer = io.BytesIO()
                                    img.save(output_buffer, format="PNG")
                                    png_data = output_buffer.getvalue()
                                except Exception as conversion_error:
                                    logger.warning(f"Failed to convert image {obj} to PNG: {conversion_error}")
                                    continue
                                    
                                image_filename = f"{timestamp}-{file_uuid}-img-p{page_num}-{obj}.png"
                                dest_blob_name = f"brand-guidelines/{workspace_id or 'global'}/images/{image_filename}"
                                
                                image_upload_tasks.append(
                                    asyncio.to_thread(
                                        gcs_service.upload_bytes_to_gcs,
                                        png_data,
                                        destination_blob_name=dest_blob_name,
                                        mime_type="image/png"
                                    )
                                )
                            except Exception as e:
                                logger.warning(f"Failed to extract image {obj} on page {page_num}: {e}")

            if image_upload_tasks:
                logger.info(f"Found {len(image_upload_tasks)} images to upload.")
                # We need to await inside an async function, ensure this is called correctly
                results = await asyncio.gather(*image_upload_tasks)
                extracted_uris = [uri for uri in results if uri]
            else:
                logger.info("No extractable images found in PDF.")
                
        except Exception as e:
            logger.error(f"Image extraction failed: {e}")
            
        return extracted_uris

    async def _delete_guideline_and_assets(
        self, guideline: BrandGuidelineModel
    ):
        """Deletes a guideline document and all its associated GCS assets."""
        logger.info(f"Deleting old guideline '{guideline.id}' and its assets.")

        # Delete all associated PDF chunks from GCS concurrently
        delete_tasks = [
            asyncio.to_thread(self.gcs_service.delete_blob_from_uri, uri)
            for uri in guideline.source_pdf_gcs_uris
        ]
        await asyncio.gather(*delete_tasks)

        # Delete vectors from Vector Search
        # Delete Text Vectors
        if guideline.source_pdf_gcs_uris:
            # Assuming 1 chunk per URI, but might be more if we indexed rules separately.
            # Using a safe range or querying would be better, but for now we rely on the chunk count.
            text_vector_ids = [f"{guideline.id}_text_{i}" for i in range(len(guideline.source_pdf_gcs_uris))]
            logger.info(f"Deleting {len(text_vector_ids)} text vectors for guideline {guideline.id}")
            await asyncio.to_thread(self.vector_search_service.delete_vectors, text_vector_ids, index_type="text")

        # Delete Image Vectors
        if guideline.reference_image_uris:
            image_vector_ids = [f"{guideline.id}_image_{i}" for i in range(len(guideline.reference_image_uris))]
            logger.info(f"Deleting {len(image_vector_ids)} image vectors for guideline {guideline.id}")
            await asyncio.to_thread(self.vector_search_service.delete_vectors, image_vector_ids, index_type="image")

        # Delete the Firestore document
        if guideline.id:
            await self.repo.delete(guideline.id)

    async def _create_brand_guideline_response(
        self, guideline: BrandGuidelineModel
    ) -> BrandGuidelineResponseDto:
        """
        Enriches a BrandGuidelineModel with presigned URLs for its assets.
        """
        presigned_url_tasks = [
            asyncio.to_thread(
                self.iam_signer_credentials.generate_presigned_url, uri
            )
            for uri in guideline.source_pdf_gcs_uris
        ]
        presigned_urls = await asyncio.gather(*presigned_url_tasks)

        return BrandGuidelineResponseDto(
            **guideline.model_dump(), presigned_source_pdf_urls=presigned_urls
        )

    async def generate_signed_upload_url(
        self, request_dto: GenerateUploadUrlDto, current_user: UserModel
    ) -> GenerateUploadUrlResponseDto:
        """
        Generates a GCS v4 signed URL for a client-side upload.
        """
        # Authorize the user for the workspace before generating a URL
        if request_dto.workspace_id:
            workspace = await self.workspace_repo.get_by_id(request_dto.workspace_id)
            if not workspace:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Workspace with ID '{request_dto.workspace_id}' not found.",
                )

        file_uuid = uuid.uuid4()
        destination_blob_name = f"brand-guidelines/{request_dto.workspace_id or 'global'}/uploads/{file_uuid}/{request_dto.filename}"

        signed_url, gcs_uri = await asyncio.to_thread(
            self.iam_signer_credentials.generate_v4_upload_signed_url,
            destination_blob_name,
            request_dto.content_type,
            self.gcs_service.bucket_name,
        )

        if not signed_url or not gcs_uri:
            raise HTTPException(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                "Could not generate upload URL.",
            )

        return GenerateUploadUrlResponseDto(
            upload_url=signed_url, gcs_uri=gcs_uri
        )

    async def start_brand_guideline_processing_job(
        self,
        name: str,
        workspace_id: Optional[int],
        gcs_uri: str,
        original_filename: str,
        current_user: UserModel,
        executor: ThreadPoolExecutor,
    ) -> BrandGuidelineResponseDto:
        """
        Creates a placeholder for a brand guideline and starts the processing
        in a background job.
        """
        # 1. Authorization Check
        is_system_admin = UserRoleEnum.ADMIN in current_user.roles

        if workspace_id:
            workspace = await self.workspace_repo.get_by_id(workspace_id)
            if not workspace:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Workspace with ID '{workspace_id}' not found.",
                )

            is_workspace_owner = current_user.id == workspace.owner_id
            if not (is_system_admin or is_workspace_owner):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the workspace owner or a system admin can add brand guidelines.",
                )
        elif not is_system_admin:
            # If no workspace is specified, it's a global guideline, which only admins can create.
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only a system admin can create global brand guidelines.",
            )

        # 2. Check for and delete an existing guideline for the workspace
        if workspace_id:
            search_dto = BrandGuidelineSearchDto(
                workspace_id=workspace_id, limit=1
            )
            existing_guidelines_response = await self.repo.query(
                search_dto, workspace_id=workspace_id
            )
            if existing_guidelines_response.data:
                await self._delete_guideline_and_assets(
                    existing_guidelines_response.data[0]
                )

        # 3. (Step removed) Read file contents into memory for the background process
        # file_contents = await file.read()

        # 4. Create and save a placeholder document
        placeholder_guideline = BrandGuidelineModel(
            name=name,
            workspace_id=workspace_id,
            status=JobStatusEnum.PROCESSING,
            source_pdf_gcs_uris=[gcs_uri],  # Store the initial upload URI
        )
        placeholder_guideline = await self.repo.create(placeholder_guideline)

        logger.info(f"Submitting background job for guideline {placeholder_guideline.id} to executor...")
        # 5. Submit the job to the background process pool
        executor.submit(
            _process_brand_guideline_in_background,
            guideline_id=placeholder_guideline.id,
            name=name,
            original_filename=original_filename,
            workspace_id=workspace_id,
            source_gcs_uri=gcs_uri,
        )

        logger.info(
            f"Brand guideline processing job queued: {placeholder_guideline.id}"
        )

        # 6. Return the placeholder DTO to the client
        return await self._create_brand_guideline_response(
            placeholder_guideline
        )

    async def get_guideline_by_id(
        self, guideline_id: int, current_user: UserModel
    ) -> Optional[BrandGuidelineResponseDto]:
        """
        Retrieves a single brand guideline and performs an authorization check.
        """
        guideline = await self.repo.get_by_id(guideline_id)

        if not guideline:
            return None

        is_system_admin = UserRoleEnum.ADMIN in current_user.roles

        # Global guidelines can be seen by any authenticated user
        if not guideline.workspace_id:
            return await self._create_brand_guideline_response(guideline)

        # For workspace-specific guidelines, check membership.
        workspace = await self.workspace_repo.get_by_id(guideline.workspace_id)

        if not workspace:
            # This indicates an data inconsistency, but we handle it gracefully.
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent workspace for this guideline not found.",
            )

        if not is_system_admin and current_user.id not in workspace.member_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view this brand guideline.",
            )

        return await self._create_brand_guideline_response(guideline)

    async def get_guideline_by_workspace_id(
        self, workspace_id: int, current_user: UserModel
    ) -> Optional[BrandGuidelineResponseDto]:
        """
        Retrieves the unique brand guideline for a workspace.
        """
        workspace = await self.workspace_repo.get_by_id(workspace_id)
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workspace with ID '{workspace_id}' not found.",
            )

        if not workspace.scope == WorkspaceScopeEnum.PUBLIC:
            is_system_admin = UserRoleEnum.ADMIN in current_user.roles
            if (
                not is_system_admin
                and current_user.id not in workspace.member_ids
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to view brand guidelines for this workspace.",
                )

        search_dto = BrandGuidelineSearchDto(workspace_id=workspace_id, limit=1)
        response = await self.repo.query(search_dto, workspace_id=workspace_id)

        if not response.data:
            return None

        return await self._create_brand_guideline_response(response.data[0])
