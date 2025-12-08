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
import base64
import io
import logging
import os
import sys
import time
import uuid
import wave
from concurrent.futures import ProcessPoolExecutor
from typing import Any, Dict, List, MutableSequence, Optional, cast

import vertexai
from google.cloud import aiplatform
from google.cloud import texttospeech_v1beta1 as texttospeech
from google.cloud.logging import Client as LoggerClient
from google.cloud.logging.handlers import CloudLoggingHandler
from google.genai import types
from google.protobuf import json_format, struct_pb2
from vertexai.generative_models import GenerationConfig, GenerativeModel

from src.audios.audio_constants import LanguageEnum, VoiceEnum
from src.audios.dto.create_audio_dto import CreateAudioDto
from src.auth.iam_signer_credentials_service import IamSignerCredentials
from src.common.base_dto import AspectRatioEnum, GenerationModelEnum, MimeTypeEnum
from src.common.schema.genai_model_setup import GenAIModelSetup
from src.common.schema.media_item_model import JobStatusEnum, MediaItemModel
from src.common.storage_service import GcsService
from src.config.config_service import config_service
from src.galleries.dto.gallery_response_dto import MediaItemResponse
from src.images.repository.media_item_repository import MediaRepository
from src.users.user_model import UserModel

logger = logging.getLogger(__name__)


def _process_audio_in_background(
    media_item_id: str, request_dto: CreateAudioDto, current_user: UserModel
):
    worker_logger = logging.getLogger(f"audio_worker.{media_item_id}")
    worker_logger.setLevel(logging.INFO)

    try:
        if worker_logger.hasHandlers():
            worker_logger.handlers.clear()

        if os.getenv("ENVIRONMENT") == "production":
            log_client = LoggerClient()
            handler = CloudLoggingHandler(
                log_client, name=f"audio_worker.{media_item_id}"
            )
            worker_logger.addHandler(handler)
        else:
            handler = logging.StreamHandler(sys.stdout)
            formatter = logging.Formatter(
                "%(asctime)s - [AUDIO_WORKER] - %(levelname)s - %(message)s"
            )
            handler.setFormatter(formatter)
            worker_logger.addHandler(handler)

        media_repo = MediaRepository()
        gcs_service = GcsService()
        cfg = config_service

        try:
            start_time = time.monotonic()
            gcs_uris: List[str] = []
            mime_type = MimeTypeEnum.AUDIO_WAV

            # Route to the correct generation logic
            if request_dto.model in AudioService.MUSIC_MODELS:
                gcs_uris = asyncio.run(
                    _generate_music_lyria_async(request_dto, current_user, gcs_service, cfg)
                )
            elif request_dto.model in AudioService.GEMINI_MODELS:
                gcs_uris = asyncio.run(
                    _generate_gemini_speech_async(request_dto, current_user, gcs_service)
                )
            elif request_dto.model in AudioService.TTS_MODELS:
                gcs_uris = asyncio.run(
                    _generate_standard_speech_async(request_dto, current_user, gcs_service)
                )
            else:
                raise ValueError(f"Unsupported model: {request_dto.model}")

            end_time = time.monotonic()
            generation_time = end_time - start_time

            update_data = {
                "status": JobStatusEnum.COMPLETED,
                "gcs_uris": gcs_uris,
                "generation_time": generation_time,
                "num_media": len(gcs_uris),
            }
            media_repo.update(media_item_id, update_data)
            worker_logger.info(f"Successfully processed audio job {media_item_id}")

        except Exception as e:
            worker_logger.error(f"Audio generation task failed for {media_item_id}: {e}", exc_info=True)
            error_update_data = {
                "status": JobStatusEnum.FAILED,
                "error_message": str(e),
                "internal_state": {"step": "ERROR", "status": "failed"},
            }
            media_repo.update(media_item_id, error_update_data)

    except Exception as e:
        worker_logger.error(f"Audio worker for {media_item_id} failed to initialize: {e}", exc_info=True)


async def _generate_music_lyria_async(request_dto, user, gcs_service, cfg) -> List[str]:
    client = aiplatform.gapic.PredictionServiceClient(
        client_options={"api_endpoint": "us-central1-aiplatform.googleapis.com"}
    )
    async def generate_single_sample(index: int) -> Optional[str]:
        try:
            parameters_dict = {"sample_count": 1}
            parameters_value = struct_pb2.Value()
            json_format.ParseDict(parameters_dict, parameters_value)

            instance_dict: Dict[str, Any] = {"prompt": request_dto.prompt}
            if request_dto.negative_prompt:
                instance_dict["negative_prompt"] = request_dto.negative_prompt
            if request_dto.seed:
                instance_dict["seed"] = request_dto.seed

            instance_value = struct_pb2.Value()
            json_format.ParseDict(instance_dict, instance_value)
            instances: MutableSequence[struct_pb2.Value] = [instance_value]

            response = await asyncio.to_thread(
                client.predict,
                endpoint=f"projects/{cfg.PROJECT_ID}/locations/global/publishers/google/models/lyria-002",
                instances=instances,
                parameters=parameters_value,
            )

            if not response.predictions:
                return None

            prediction = response.predictions[0]
            prediction_map = cast(Dict[str, Any], prediction)
            audio_b64 = prediction_map.get("bytesBase64Encoded")

            if not audio_b64:
                return None

            audio_bytes = base64.b64decode(audio_b64)
            file_name = f"lyria_music_{int(time.time())}_{user.id[:4]}_{index}.wav"
            gcs_uri = gcs_service.store_to_gcs(
                folder="lyria_audio",
                file_name=file_name,
                mime_type=MimeTypeEnum.AUDIO_WAV,
                contents=audio_bytes,
                decode=False,
            )
            return gcs_uri
        except Exception as e:
            logger.error(f"Lyria generation attempt {index} failed: {e}")
            return None
    tasks = [generate_single_sample(i) for i in range(request_dto.sample_count)]
    results = await asyncio.gather(*tasks)
    return [uri for uri in results if uri]

async def _generate_gemini_speech_async(request_dto, user, gcs_service) -> List[str]:
    client = GenAIModelSetup.init()
    async def generate_single_sample(index: int) -> Optional[str]:
        try:
            response = client.models.generate_content(
                model=request_dto.model.value,
                contents=[f"Please read the following text: \n{request_dto.prompt}"],
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    audio_timestamp=False,
                    speech_config=types.SpeechConfig(
                        voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                voice_name=request_dto.voice_name or "Puck"
                            )
                        )
                    ),
                ),
            )

            if not response.candidates or not response.candidates[0].content or not response.candidates[0].content.parts:
                logger.warning(f"Gemini attempt {index} returned no content.")
                return None

            part = response.candidates[0].content.parts[0]
            pcm_bytes = None
            if hasattr(part, "inline_data") and part.inline_data:
                pcm_bytes = part.inline_data.data
                if isinstance(pcm_bytes, str):
                    pcm_bytes = base64.b64decode(pcm_bytes)
            else:
                logger.warning(f"Gemini attempt {index} had no inline data.")
                return None

            if not pcm_bytes:
                return None

            wav_buffer = io.BytesIO()
            with wave.open(wav_buffer, "wb") as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(24000)
                wav_file.writeframes(pcm_bytes)
            final_wav_bytes = wav_buffer.getvalue()

            file_name = f"gemini_audio_{request_dto.model.value}_{int(time.time())}_{user.id[:4]}_{index}.wav"
            gcs_uri = gcs_service.store_to_gcs(
                folder="gemini_audio",
                file_name=file_name,
                mime_type=MimeTypeEnum.AUDIO_WAV,
                contents=final_wav_bytes,
                decode=False,
            )
            return gcs_uri
        except Exception as e:
            logger.error(f"Gemini generation attempt {index} failed: {e}")
            return None
    tasks = [generate_single_sample(i) for i in range(request_dto.sample_count)]
    results = await asyncio.gather(*tasks)
    return [uri for uri in results if uri]

async def _generate_standard_speech_async(request_dto, user, gcs_service) -> List[str]:
    tts_client = texttospeech.TextToSpeechClient()
    async def generate_single_sample(index: int) -> Optional[str]:
        try:
            synthesis_input = texttospeech.SynthesisInput(text=request_dto.prompt)
            voice_name = request_dto.voice_name.value if request_dto.voice_name else VoiceEnum.PUCK.value
            language_code = request_dto.language_code.value if request_dto.language_code else LanguageEnum.EN_US.value
            if request_dto.model == GenerationModelEnum.CHIRP_3:
                voice_name = f"{language_code}-Chirp3-HD-{voice_name}"

            voice_params = texttospeech.VoiceSelectionParams(
                language_code=language_code,
                name=voice_name,
            )
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.LINEAR16,
                speaking_rate=1.0,
                volume_gain_db=0.0,
            )
            response = await asyncio.to_thread(
                tts_client.synthesize_speech,
                input=synthesis_input,
                voice=voice_params,
                audio_config=audio_config,
            )
            audio_bytes = response.audio_content
            file_name = f"tts_{request_dto.model.value}_{int(time.time())}_{user.id[:4]}_{index}.wav"
            gcs_uri = gcs_service.store_to_gcs(
                folder="tts_audio",
                file_name=file_name,
                mime_type=MimeTypeEnum.AUDIO_WAV,
                contents=audio_bytes,
                decode=False,
            )
            return gcs_uri
        except Exception as e:
            logger.error(f"Standard TTS attempt {index} failed: {e}")
            return None
    tasks = [generate_single_sample(i) for i in range(request_dto.sample_count)]
    results = await asyncio.gather(*tasks)
    return [uri for uri in results if uri]


class AudioService:
    GEMINI_MODELS = {
        GenerationModelEnum.GEMINI_2_5_FLASH_TTS,
        GenerationModelEnum.GEMINI_2_5_FLASH_LITE_PREVIEW_TTS,
        GenerationModelEnum.GEMINI_2_5_PRO_TTS,
    }
    TTS_MODELS = {GenerationModelEnum.CHIRP_3}
    MUSIC_MODELS = {GenerationModelEnum.LYRIA_002}

    def __init__(self):
        self.iam_signer_credentials = IamSignerCredentials()
        self.media_repo = MediaRepository()
        self.gcs_service = GcsService()
        self.cfg = config_service
        vertexai.init(project=self.cfg.PROJECT_ID, location=self.cfg.LOCATION)

    def start_audio_generation_job(
        self,
        request_dto: CreateAudioDto,
        user: UserModel,
        executor: ProcessPoolExecutor,
    ) -> MediaItemResponse:
        media_item_id = str(uuid.uuid4())
        placeholder_item = MediaItemModel(
            id=media_item_id,
            workspace_id=request_dto.workspace_id,
            user_email=user.email,
            user_id=user.id,
            mime_type=MimeTypeEnum.AUDIO_WAV,
            model=request_dto.model,
            original_prompt=request_dto.prompt,
            prompt=request_dto.prompt,
            status=JobStatusEnum.PROCESSING,
            negative_prompt=request_dto.negative_prompt,
            voice_name=request_dto.voice_name,
            language_code=request_dto.language_code,
            seed=request_dto.seed,
            aspect_ratio=AspectRatioEnum.RATIO_16_9,  # Add default aspect ratio
            gcs_uris=[],
            internal_state={"step": "GENERATING", "status": "processing"},
        )
        self.media_repo.save(placeholder_item)

        executor.submit(
            _process_audio_in_background,
            media_item_id=placeholder_item.id,
            request_dto=request_dto,
            current_user=user,
        )

        logger.info(f"Audio generation job queued: {placeholder_item.id}")

        return MediaItemResponse(
            **placeholder_item.model_dump(),
            presigned_urls=[],
        )

