"""
LLM API Routes - Endpoints for Claude LLM integration
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, status
from app.models.llm import (
    LLMPromptRequest,
    LLMPromptResponse,
    JournalInsightsRequest,
    JournalInsightsResponse,
)
from app.services.claude_llm import get_claude_service
from app.services.exceptions import ExternalServiceError
from app.core.dependencies import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/llm", tags=["llm"])


@router.post("/generate", response_model=LLMPromptResponse, status_code=status.HTTP_200_OK)
async def generate_llm_response(
    request: LLMPromptRequest,
    current_user: User = Depends(get_current_user)
) -> LLMPromptResponse:
    """
    Generate a response from Claude LLM

    Args:
        request: LLM prompt request with prompt and optional parameters
        current_user: Authenticated user (from JWT token)

    Returns:
        LLMPromptResponse: Generated response with usage information

    Raises:
        HTTPException: If LLM service fails or is not configured
    """
    logger.info(f"User {current_user.user_id} requesting LLM generation")

    try:
        # Get Claude service
        claude_service = get_claude_service()

        # Generate response
        result = claude_service.generate_response(
            prompt=request.prompt,
            system_prompt=request.system_prompt,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            model=request.model,
        )

        logger.info(
            f"LLM generation successful for user {current_user.user_id}. "
            f"Tokens used: {result['usage']['input_tokens']} in, "
            f"{result['usage']['output_tokens']} out"
        )

        # Return response
        return LLMPromptResponse(**result)

    except ExternalServiceError as e:
        logger.error(f"LLM service error for user {current_user.user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"LLM service error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error in LLM generation: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while generating LLM response"
        )


@router.post(
    "/journal-insights",
    response_model=JournalInsightsResponse,
    status_code=status.HTTP_200_OK
)
async def generate_journal_insights(
    request: JournalInsightsRequest,
    current_user: User = Depends(get_current_user)
) -> JournalInsightsResponse:
    """
    Generate AI-powered insights for a journal entry

    Args:
        request: Journal insights request with content and metadata
        current_user: Authenticated user (from JWT token)

    Returns:
        JournalInsightsResponse: Generated insights and reflections

    Raises:
        HTTPException: If LLM service fails or is not configured
    """
    logger.info(f"User {current_user.user_id} requesting journal insights")

    try:
        # Get Claude service
        claude_service = get_claude_service()

        # Generate insights
        result = claude_service.generate_journal_insights(
            journal_content=request.journal_content,
            journal_title=request.journal_title,
            emotions=request.emotions,
        )

        logger.info(
            f"Journal insights generated for user {current_user.user_id}. "
            f"Tokens used: {result['usage']['input_tokens']} in, "
            f"{result['usage']['output_tokens']} out"
        )

        # Return response
        return JournalInsightsResponse(**result)

    except ExternalServiceError as e:
        logger.error(f"LLM service error for user {current_user.user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"LLM service error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error in journal insights: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while generating journal insights"
        )
