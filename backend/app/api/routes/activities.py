"""
Activity feed endpoints for spaces.
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Optional
import logging

from app.models.activity import ActivityListResponse
from app.services.activity import get_activity_service
from app.services.exceptions import SpaceNotFoundError, UnauthorizedError
from app.core.dependencies import get_current_user
from app.core.database import get_dynamodb_table

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Activities"])


@router.get("/spaces/{space_id}/activities", response_model=ActivityListResponse)
async def get_space_activities(
    space_id: str,
    limit: int = Query(50, ge=1, le=100, description="Number of activities to return"),
    next_token: Optional[str] = Query(None, description="Pagination token"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get recent activities for a space.

    Returns a paginated list of activities including:
    - Journal entries created/updated/deleted
    - Highlights created/deleted
    - Comments created
    - Member joins

    Only space members can view activities.
    """
    try:
        user_id = current_user.get("sub", "")

        # Check if user is a space member
        table = get_dynamodb_table()
        response = table.get_item(
            Key={'PK': f'SPACE#{space_id}', 'SK': f'MEMBER#{user_id}'}
        )

        if 'Item' not in response:
            raise UnauthorizedError("You must be a space member to view activities")

        # Get activities
        activity_service = get_activity_service()
        activities, new_next_token = activity_service.get_space_activities(
            space_id=space_id,
            limit=limit,
            next_token=next_token
        )

        return ActivityListResponse(
            activities=activities,
            next_token=new_next_token
        )

    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get space activities: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve activities"
        )
