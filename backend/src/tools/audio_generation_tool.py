from typing import Optional
from google.adk.tools import BaseTool
from src.audios.audio_service import AudioService
from src.audios.dto.create_audio_dto import CreateAudioDto
from src.audios.audio_constants import LanguageEnum, VoiceEnum
from src.common.base_dto import GenerationModelEnum
from src.users.user_model import UserModel

class AudioGenerationTool(BaseTool):
    """
    Tool for generating audio using AudioService (Lyria for music, Gemini/Chirp for TTS).
    """
    
    def __init__(self, audio_service: AudioService, current_user: UserModel):
        super().__init__(
            name="generate_audio",
            description="Generates audio (music or speech) based on a text prompt.",
            parameters={
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "The text prompt. For music, describe the sound. For TTS, this is the text to speak."
                    },
                    "type": {
                        "type": "string",
                        "enum": ["MUSIC", "SPEECH"],
                        "description": "The type of audio to generate."
                    },
                    "voice_name": {
                        "type": "string",
                        "description": "For SPEECH only. The voice to use (e.g., 'Puck', 'Fenrir')."
                    }
                },
                "required": ["prompt", "type"]
            }
        )
        self.audio_service = audio_service
        self.current_user = current_user

    async def run(self, prompt: str, type: str, voice_name: Optional[str] = "Puck") -> str:
        """
        Executes the audio generation.
        """
        try:
            model = GenerationModelEnum.LYRIA_002 if type == "MUSIC" else GenerationModelEnum.GEMINI_2_5_FLASH_TTS
            
            # Map voice name string to Enum if possible, or pass as is if the DTO handles it.
            # The DTO expects VoiceEnum, let's try to map it or default.
            voice_enum = VoiceEnum.PUCK
            if voice_name:
                try:
                    voice_enum = VoiceEnum(voice_name)
                except ValueError:
                    pass # Fallback to default
            
            dto = CreateAudioDto(
                prompt=prompt,
                model=model,
                workspace_id="Global", # Defaulting
                voice_name=voice_enum if type == "SPEECH" else None,
                language_code=LanguageEnum.EN_US if type == "SPEECH" else None
            )
            
            result = await self.audio_service.generate_audio(dto, self.current_user)
            
            if not result or not result.gcs_uris:
                return "Error: No audio generated."
                
            return f"Successfully generated audio: {', '.join(result.gcs_uris)}"
            
        except Exception as e:
            return f"Error generating audio: {str(e)}"
