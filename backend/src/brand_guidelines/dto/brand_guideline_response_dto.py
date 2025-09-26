from typing import List

from pydantic import Field

from src.brand_guidelines.schema.brand_guideline_model import BrandGuidelineModel


class BrandGuidelineResponseDto(BrandGuidelineModel):
    """Response DTO for a brand guideline, including presigned URLs."""

    presigned_source_pdf_urls: List[str] = Field(
        default_factory=list, description="Presigned URLs for the source PDF chunks."
    )

