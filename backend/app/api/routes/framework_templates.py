"""
Framework template management endpoints.
"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional, List

from app.models.framework_template import (
    FrameworkTemplate,
    FrameworkTemplateCreate,
    FrameworkTemplateUpdate,
    FrameworkTemplateListResponse,
    FrameworkTemplateCompletion,
    FrameworkTemplateCompletionCreate,
    FrameworkTemplateCompletionUpdate,
    FrameworkTemplateCompletionListResponse,
)
from app.services.framework_template_service import (
    FrameworkTemplateService,
    FrameworkTemplateNotFoundError,
    FrameworkTemplateCompletionNotFoundError,
)
from app.services.exceptions import ValidationError, UnauthorizedError
from app.api.deps import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/framework-templates", tags=["Framework Templates"])


# ===== TEMPLATE ENDPOINTS =====

@router.post("", response_model=FrameworkTemplate, status_code=status.HTTP_201_CREATED)
async def create_template(
    template_data: FrameworkTemplateCreate,
    space_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new framework template.

    Args:
        template_data: Template creation data
        space_id: Optional space ID if template is space-specific
        current_user: Current authenticated user

    Returns:
        Created framework template
    """
    try:
        logger.info(f"[API_CREATE_FRAMEWORK_TEMPLATE] User {current_user['user_id']} creating template")
        service = FrameworkTemplateService()
        return service.create_template(
            template_data=template_data,
            user_id=current_user['user_id'],
            space_id=space_id
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create framework template: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create framework template"
        )


@router.get("", response_model=FrameworkTemplateListResponse)
async def list_templates(
    space_id: Optional[str] = None,
    tags: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    List framework templates.

    Args:
        space_id: Optional space ID to filter by
        tags: Optional comma-separated tags to filter by
        current_user: Current authenticated user

    Returns:
        List of framework templates
    """
    try:
        logger.info(f"[API_LIST_FRAMEWORK_TEMPLATES] User {current_user['user_id']} listing templates")
        service = FrameworkTemplateService()

        tag_list = None
        if tags:
            tag_list = [t.strip() for t in tags.split(',')]

        return service.list_templates(space_id=space_id, tags=tag_list)
    except Exception as e:
        logger.error(f"Failed to list framework templates: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list framework templates"
        )


@router.get("/{template_id}", response_model=FrameworkTemplate)
async def get_template(
    template_id: str,
    version: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific framework template by ID.

    Args:
        template_id: Template ID
        version: Optional specific version (defaults to latest)
        current_user: Current authenticated user

    Returns:
        Framework template
    """
    try:
        logger.info(f"[API_GET_FRAMEWORK_TEMPLATE] User {current_user['user_id']} getting template {template_id}")
        service = FrameworkTemplateService()
        return service.get_template(template_id=template_id, version=version)
    except FrameworkTemplateNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get framework template: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get framework template"
        )


@router.put("/{template_id}", response_model=FrameworkTemplate)
async def update_template(
    template_id: str,
    update_data: FrameworkTemplateUpdate,
    create_new_version: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a framework template.

    Args:
        template_id: Template ID
        update_data: Update data
        create_new_version: Whether to create a new version (default: True)
        current_user: Current authenticated user

    Returns:
        Updated framework template
    """
    try:
        logger.info(f"[API_UPDATE_FRAMEWORK_TEMPLATE] User {current_user['user_id']} updating template {template_id}")
        service = FrameworkTemplateService()
        return service.update_template(
            template_id=template_id,
            update_data=update_data,
            user_id=current_user['user_id'],
            create_new_version=create_new_version
        )
    except FrameworkTemplateNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to update framework template: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update framework template"
        )


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete (deactivate) a framework template.

    Args:
        template_id: Template ID
        current_user: Current authenticated user
    """
    try:
        logger.info(f"[API_DELETE_FRAMEWORK_TEMPLATE] User {current_user['user_id']} deleting template {template_id}")
        service = FrameworkTemplateService()
        service.delete_template(template_id=template_id, user_id=current_user['user_id'])
    except FrameworkTemplateNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to delete framework template: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete framework template"
        )


# ===== COMPLETION ENDPOINTS =====

@router.post(
    "/completions",
    response_model=FrameworkTemplateCompletion,
    status_code=status.HTTP_201_CREATED
)
async def create_completion(
    completion_data: FrameworkTemplateCompletionCreate,
    space_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a template completion.

    Args:
        completion_data: Completion data
        space_id: Space ID
        current_user: Current authenticated user

    Returns:
        Created template completion
    """
    try:
        logger.info(f"[API_CREATE_COMPLETION] User {current_user['user_id']} creating completion")
        service = FrameworkTemplateService()
        return service.create_completion(
            completion_data=completion_data,
            user_id=current_user['user_id'],
            space_id=space_id
        )
    except FrameworkTemplateNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create completion: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create completion"
        )


@router.get("/completions", response_model=FrameworkTemplateCompletionListResponse)
async def list_completions(
    space_id: Optional[str] = None,
    user_id: Optional[str] = None,
    template_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    List template completions.

    Args:
        space_id: Optional space ID filter
        user_id: Optional user ID filter (defaults to current user)
        template_id: Optional template ID filter
        current_user: Current authenticated user

    Returns:
        List of template completions
    """
    try:
        # Default to current user if no user_id provided
        if not user_id and not space_id:
            user_id = current_user['user_id']

        logger.info(f"[API_LIST_COMPLETIONS] User {current_user['user_id']} listing completions")
        service = FrameworkTemplateService()
        return service.list_completions(
            space_id=space_id,
            user_id=user_id,
            template_id=template_id
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to list completions: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list completions"
        )


@router.get("/completions/{completion_id}", response_model=FrameworkTemplateCompletion)
async def get_completion(
    completion_id: str,
    space_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific template completion.

    Args:
        completion_id: Completion ID
        space_id: Space ID
        current_user: Current authenticated user

    Returns:
        Template completion
    """
    try:
        logger.info(f"[API_GET_COMPLETION] User {current_user['user_id']} getting completion {completion_id}")
        service = FrameworkTemplateService()
        return service.get_completion(completion_id=completion_id, space_id=space_id)
    except FrameworkTemplateCompletionNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get completion: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get completion"
        )


@router.put("/completions/{completion_id}", response_model=FrameworkTemplateCompletion)
async def update_completion(
    completion_id: str,
    space_id: str,
    update_data: FrameworkTemplateCompletionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a template completion.

    Args:
        completion_id: Completion ID
        space_id: Space ID
        update_data: Update data
        current_user: Current authenticated user

    Returns:
        Updated template completion
    """
    try:
        logger.info(f"[API_UPDATE_COMPLETION] User {current_user['user_id']} updating completion {completion_id}")
        service = FrameworkTemplateService()
        return service.update_completion(
            completion_id=completion_id,
            space_id=space_id,
            update_data=update_data,
            user_id=current_user['user_id']
        )
    except FrameworkTemplateCompletionNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to update completion: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update completion"
        )


@router.delete("/completions/{completion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_completion(
    completion_id: str,
    space_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a template completion.

    Args:
        completion_id: Completion ID
        space_id: Space ID
        current_user: Current authenticated user
    """
    try:
        logger.info(f"[API_DELETE_COMPLETION] User {current_user['user_id']} deleting completion {completion_id}")
        service = FrameworkTemplateService()
        service.delete_completion(
            completion_id=completion_id,
            space_id=space_id,
            user_id=current_user['user_id']
        )
    except FrameworkTemplateCompletionNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to delete completion: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete completion"
        )
