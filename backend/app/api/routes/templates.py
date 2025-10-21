"""
Template management endpoints.
"""
from fastapi import APIRouter, HTTPException, status
from app.models.template import Template, TemplateListResponse
from app.services.template import TemplateService, TemplateNotFoundError
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/templates", tags=["Templates"])


@router.get("", response_model=TemplateListResponse)
async def list_templates():
    """List all available journal templates."""
    try:
        logger.info("[API_LIST_TEMPLATES] Fetching all templates")
        service = TemplateService()
        return service.list_templates()
    except Exception as e:
        logger.error(f"Failed to list templates: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list templates"
        )


@router.get("/{template_id}", response_model=Template)
async def get_template(template_id: str):
    """Get a specific template by ID."""
    try:
        logger.info(f"[API_GET_TEMPLATE] Fetching template: {template_id}")
        service = TemplateService()
        return service.get_template(template_id)
    except TemplateNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get template: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get template"
        )
