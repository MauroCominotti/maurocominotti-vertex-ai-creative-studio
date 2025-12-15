import logging
import json
from fastapi import APIRouter, Depends, HTTPException, status
from google.genai import types

from src.auth.auth_guard import RoleChecker, get_current_user
from src.users.user_model import UserModel, UserRoleEnum
from src.agents.dto.agent_dto import AgentGenerationRequest, AgentGenerationResponse
from src.agents.enforcer_agent import EnforcerAgent
from src.agents.validator_agent import ValidatorAgent
from src.images.imagen_service import ImagenService
from src.common.vector_search_service import VectorSearchService
from src.multimodal.gemini_service import GeminiService
from src.videos.veo_service import VeoService
from src.audios.audio_service import AudioService
from src.tools.imagen_tool import ImagenTool
from src.tools.video_generation_tool import VideoGenerationTool
from src.tools.audio_generation_tool import AudioGenerationTool
from src.images.dto.create_imagen_dto import CreateImagenDto, AspectRatioEnum
from src.agents.dto.agent_dto import MediaTypeEnum
from concurrent.futures import ThreadPoolExecutor

# ADK Imports
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from src.auth.iam_signer_credentials_service import IamSignerCredentials

logger = logging.getLogger(__name__)

user_only = Depends(
    RoleChecker(allowed_roles=[UserRoleEnum.USER, UserRoleEnum.ADMIN])
)

router = APIRouter(
    prefix="/api/agents",
    tags=["Agentic Workflow"],
    dependencies=[user_only],
)

# Initialize Session Service (In-memory for POC)
session_service = InMemorySessionService()

@router.post(
    "/generate",
    response_model=AgentGenerationResponse,
    summary="Generate assets with Agentic RAG & Validation (ADK)",
)
async def generate_with_agents(
    request: AgentGenerationRequest,
    current_user: UserModel = Depends(get_current_user),
    imagen_service: ImagenService = Depends(),
    veo_service: VeoService = Depends(),
    audio_service: AudioService = Depends(),
    vector_search_service: VectorSearchService = Depends(),
    gemini_service: GeminiService = Depends(),
):
    """
    Orchestrates the agentic generation flow using ADK:
    1. Enforcer Agent: Enhances prompt with branding rules.
    2. Generation Tool: Generates Image, Video, or Audio based on request.
    3. Validator Agent: Validates generated assets against rules.
    """
    logger.info(f"Starting ADK agentic generation for user {current_user.email} - Type: {request.media_type}")
    
    # Executor for background tasks (needed for Veo)
    executor = ThreadPoolExecutor() # In a real app, use a global/dependency injected executor
    
    # Initialize Agents
    enforcer = EnforcerAgent(vector_search_service, gemini_service)
    validator = ValidatorAgent()
    
    # Session ID (unique per request for isolation)
    import uuid
    session_id = str(uuid.uuid4())
    app_name = "agents"
    
    # Create Session
    await session_service.create_session(app_name=app_name, user_id=current_user.id, session_id=session_id)
    
    # --- Step 1: Enforcer Agent ---
    enforcer_runner = Runner(agent=enforcer, app_name=app_name, session_service=session_service)
    
    user_query = f"User Request: {request.prompt}\nWorkspace ID: {request.workspace_id or 'Global'}"
    
    parts = [types.Part(text=user_query)]
    
    # Add reference image if provided
    if request.reference_image_uri:
        logger.info(f"Adding reference image to Enforcer context: {request.reference_image_uri}")
        parts.append(types.Part.from_uri(file_uri=request.reference_image_uri, mime_type="image/png"))
        
    content = types.Content(role="user", parts=parts)
    
    enhanced_prompt = request.prompt
    applied_rules = []
    
    async for event in enforcer_runner.run_async(user_id=current_user.id, session_id=session_id, new_message=content):
        logger.info(f"Enforcer Agent Event: {event}")
        if event.is_final_response() and event.content and event.content.parts:
            response_text = event.content.parts[0].text
            logger.info(f"Enforcer Agent Raw Response: {response_text}")
            # Parse JSON output from Enforcer
            try:
                # Robust JSON extraction: find first '{' and last '}'
                start_idx = response_text.find('{')
                end_idx = response_text.rfind('}')
                
                if start_idx != -1 and end_idx != -1:
                    json_str = response_text[start_idx:end_idx+1]
                    data = json.loads(json_str)
                    enhanced_prompt = data.get("enhanced_prompt", request.prompt)
                    applied_rules = data.get("applied_rules", [])
                    reference_image_uris = data.get("reference_image_uris", [])
                    logger.info(f"Enforcer Agent Parsed - Enhanced Prompt: {enhanced_prompt}, Rules: {applied_rules}, Ref Images: {reference_image_uris}")
                else:
                    logger.warning("Enforcer response did not contain valid JSON brackets. Using raw text as prompt.")
                    enhanced_prompt = response_text
                    applied_rules = []
                    reference_image_uris = []
            except Exception as e:
                logger.error(f"Failed to parse Enforcer response: {e}")
                enhanced_prompt = response_text # Fallback
                applied_rules = []
                reference_image_uris = []

    # --- Step 2: Generation ---
    generation_result_str = ""
    
    if request.media_type == MediaTypeEnum.IMAGE:
        tool = ImagenTool(imagen_service, current_user)
        generation_result_str = await tool.run(
            prompt=enhanced_prompt,
            aspect_ratio=request.aspect_ratio,
            number_of_images=request.number_of_images,
            reference_image_gcs_uris=reference_image_uris[:5],
            workspace_id=request.workspace_id or "Global"
        )
    elif request.media_type == MediaTypeEnum.VIDEO:
        tool = VideoGenerationTool(veo_service, current_user, executor)
        generation_result_str = tool.run( # Note: Video tool is synchronous (starts background job)
            prompt=enhanced_prompt,
            aspect_ratio=request.aspect_ratio,
            duration_seconds=request.duration_seconds,
            generate_audio=request.generate_audio,
            workspace_id=request.workspace_id or "Global"
        )
    elif request.media_type == MediaTypeEnum.AUDIO:
        tool = AudioGenerationTool(audio_service, current_user)
        generation_result_str = await tool.run(
            prompt=enhanced_prompt,
            type=request.audio_type,
            voice_name=request.voice_name,
            workspace_id=request.workspace_id or "Global"
        )
    
    # Parse URIs or Status from tool output
    generated_uris = []
    
    if request.media_type == MediaTypeEnum.IMAGE or request.media_type == MediaTypeEnum.AUDIO:
        if "Successfully generated" in generation_result_str:
            # Extract URIs
            # Format: "Successfully generated ...: uri1, uri2"
            parts = generation_result_str.split(":", 1)
            if len(parts) > 1:
                uris_str = parts[1].strip()
                generated_uris = [u.strip() for u in uris_str.split(",")]
        # Video generation is async. The tool returns a status message with Job ID.
        # We cannot validate immediately.
        # Return the status message as the "asset" for now,
        # we accept that validation happens LATER (out of scope for this sync endpoint).
        
        # For the purpose of this demo/POC, we will return the status message.
        # Validator Agent cannot run on a pending job.
        
        if not generated_uris:
            return AgentGenerationResponse(
                original_prompt=request.prompt,
                enhanced_prompt=enhanced_prompt,
                generated_assets=[{
                    "uri": "PENDING",
                    "validation_status": "PENDING",
                    "validation_reasoning": generation_result_str
                }]
            )

    # --- Step 3: Validator Agent (Only for immediate assets) ---
    validator_runner = Runner(agent=validator, app_name=app_name, session_service=session_service)
    
    generated_assets = []
    for uri in generated_uris:
        # Construct validation prompt with image
        validation_prompt = f"""
        Validate this media asset against the following rules:
        {json.dumps(applied_rules, indent=2)}
        """
        
        # Create multimodal content
        # Determine mime type based on media type
        mime_type = "image/png"
        if request.media_type == MediaTypeEnum.AUDIO:
            mime_type = "audio/wav" # Assuming wav for now
            
        parts = []
        
        # 1. The Generated Asset
        parts.append(types.Part.from_uri(file_uri=uri, mime_type=mime_type))
        
        # 2. Reference Images (if any) - for style comparison
        if reference_image_uris:
            validation_prompt += "\n\nReference Images provided for style comparison:"
            for i, ref_uri in enumerate(reference_image_uris):
                try:
                    parts.append(types.Part.from_uri(file_uri=ref_uri, mime_type="image/png"))
                    validation_prompt += f"\n- Reference Image {i+1}"
                except Exception as e:
                    logger.warning(f"Failed to attach reference image {ref_uri} to validator: {e}")

        # 3. The Prompt/Instructions
        parts.append(types.Part(text=validation_prompt))
        
        val_content = types.Content(role="user", parts=parts)
        
        is_compliant = False
        reasoning = "Validation failed to run."
        
        async for event in validator_runner.run_async(user_id=current_user.id, session_id=session_id, new_message=val_content):
            if event.is_final_response() and event.content and event.content.parts:
                val_resp_text = event.content.parts[0].text
                logger.info(f"Validator Agent Raw Response: {val_resp_text}")
                try:
                    start_idx = val_resp_text.find('{')
                    end_idx = val_resp_text.rfind('}')
                    
                    if start_idx != -1 and end_idx != -1:
                        json_str = val_resp_text[start_idx:end_idx+1]
                        val_data = json.loads(json_str)
                        is_compliant = val_data.get("is_compliant", False)
                        reasoning = val_data.get("reasoning", "No reasoning provided.")
                        logger.info(f"Validator Agent Parsed - Compliant: {is_compliant}, Reasoning: {reasoning}")
                    else:
                        logger.warning("Validator response did not contain valid JSON brackets.")
                        reasoning = val_resp_text
                except Exception as e:
                    logger.error(f"Failed to parse Validator response: {e}")
                    reasoning = val_resp_text

        # Generate presigned URL for frontend display
        signer = IamSignerCredentials()
        presigned_url = signer.generate_presigned_url(uri)
        
        generated_assets.append({
            "uri": presigned_url, # Use presigned URL for display
            "gcs_uri": uri, # Keep original GCS URI for reference
            "validation_status": "APPROVED" if is_compliant else "REJECTED",
            "validation_reasoning": reasoning
        })

    return AgentGenerationResponse(
        original_prompt=request.prompt,
        enhanced_prompt=enhanced_prompt,
        generated_assets=generated_assets
    )
