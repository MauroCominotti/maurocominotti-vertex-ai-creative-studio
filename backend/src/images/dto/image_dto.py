from pydantic import BaseModel
from pydantic import BaseModel


class ImageDTO(BaseModel):
    mime_type: str
    gcs_uri: str


class ImageWrapperDTO(BaseModel):
    image: ImageDTO
