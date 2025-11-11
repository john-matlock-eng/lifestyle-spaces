"""
Schedule management endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Optional
from datetime import date
from botocore.exceptions import ClientError
from app.models.schedule import (
    ScheduleCreate,
    ScheduleResponse,
    ScheduleUpdate,
    ScheduleListResponse,
    ScheduleShare,
    ScheduleVersion,
    ScheduleVersionListResponse,
    ScheduleImportRequest,
    ScheduleImportValidationResponse,
    ScheduleImportResponse,
    ImportValidationError,
    ImportConflict
)
from app.models.common import SuccessResponse
from app.services.schedule import ScheduleService, ScheduleNotFoundError
from app.services.schedule_import_service import ScheduleImportService
from app.services.exceptions import ValidationError, UnauthorizedError
from app.core.dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/schedules", tags=["Schedules"])


@router.post("", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    schedule: ScheduleCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new weekly schedule.

    Args:
        schedule: Schedule data including week_starting (must be a Monday)
        current_user: Authenticated user from dependency injection

    Returns:
        Created schedule with ID and timestamps

    Raises:
        422: Validation error (invalid week_starting, missing space_id, etc.)
        500: Server error
    """
    try:
        logger.info(
            f"[API_CREATE_SCHEDULE] user={current_user.get('sub')}, "
            f"week={schedule.week_starting}"
        )

        service = ScheduleService()
        result = service.create_schedule(
            schedule=schedule,
            user_id=current_user.get("sub", "")
        )

        response = ScheduleResponse(
            id=result["id"],
            space_id=result["space_id"],
            user_id=result["user_id"],
            week_starting=result["week_starting"],
            schedule_data=result["schedule_data"],
            notes=result.get("notes"),
            is_template=result.get("is_template", False),
            template_name=result.get("template_name"),
            version=result.get("version", 1),
            sharing_settings=result.get("sharing_settings"),
            created_by=result.get("created_by", result["user_id"]),
            modified_by=result.get("modified_by", result["user_id"]),
            last_modified=result.get("last_modified", result["updated_at"]),
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )

        logger.info(f"[API_CREATE_SCHEDULE] Created schedule_id={response.id}")
        return response

    except ValidationError as e:
        logger.warning(f"[API_CREATE_SCHEDULE] Validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except ClientError as e:
        logger.error(f"[API_CREATE_SCHEDULE] DynamoDB error: {str(e)}")
        if e.response['Error']['Code'] == 'ServiceUnavailable':
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database service unavailable"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create schedule"
        )
    except Exception as e:
        logger.error(f"[API_CREATE_SCHEDULE] Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create schedule"
        )


@router.get("/{schedule_id}", response_model=ScheduleResponse)
async def get_schedule(
    schedule_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a schedule by ID.

    Args:
        schedule_id: UUID of the schedule
        current_user: Authenticated user

    Returns:
        Schedule data

    Raises:
        404: Schedule not found
        403: Not authorized to view this schedule
        500: Server error
    """
    try:
        logger.info(f"[API_GET_SCHEDULE] schedule_id={schedule_id}, user={current_user.get('sub')}")

        service = ScheduleService()
        result = service.get_schedule(
            schedule_id=schedule_id,
            user_id=current_user.get("sub", "")
        )

        response = ScheduleResponse(
            id=result["id"],
            space_id=result["space_id"],
            user_id=result["user_id"],
            week_starting=result["week_starting"],
            schedule_data=result["schedule_data"],
            notes=result.get("notes"),
            is_template=result.get("is_template", False),
            template_name=result.get("template_name"),
            version=result.get("version", 1),
            sharing_settings=result.get("sharing_settings"),
            created_by=result.get("created_by", result["user_id"]),
            modified_by=result.get("modified_by", result["user_id"]),
            last_modified=result.get("last_modified", result["updated_at"]),
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )

        return response

    except ScheduleNotFoundError as e:
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
        logger.error(f"[API_GET_SCHEDULE] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get schedule"
        )


@router.get("", response_model=ScheduleListResponse)
async def get_schedules(
    space_id: str = Query(..., description="Space ID to filter schedules"),
    week_starting: date = Query(..., description="Week starting date (must be a Monday)"),
    user_id: Optional[str] = Query(None, description="Filter by specific user"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all schedules for a specific week in a space.

    Args:
        space_id: ID of the space
        week_starting: Start date of the week (must be a Monday)
        user_id: Optional - filter to show only a specific user's schedule
        current_user: Authenticated user

    Returns:
        List of schedules for the specified week

    Raises:
        422: week_starting is not a Monday
        500: Server error
    """
    try:
        # Validate week_starting is a Monday
        if week_starting.weekday() != 0:
            raise ValidationError("week_starting must be a Monday")

        logger.info(
            f"[API_GET_SCHEDULES] space_id={space_id}, week={week_starting}, "
            f"filter_user={user_id}"
        )

        service = ScheduleService()
        results = service.get_schedules_by_week(
            space_id=space_id,
            week_starting=week_starting,
            user_id=user_id
        )

        schedules = [
            ScheduleResponse(
                id=result["id"],
                space_id=result["space_id"],
                user_id=result["user_id"],
                week_starting=result["week_starting"],
                schedule_data=result["schedule_data"],
                notes=result.get("notes"),
                is_template=result.get("is_template", False),
                template_name=result.get("template_name"),
                version=result.get("version", 1),
                sharing_settings=result.get("sharing_settings"),
                created_by=result.get("created_by", result["user_id"]),
                modified_by=result.get("modified_by", result["user_id"]),
                last_modified=result.get("last_modified", result["updated_at"]),
                created_at=result["created_at"],
                updated_at=result["updated_at"]
            )
            for result in results
        ]

        response = ScheduleListResponse(
            schedules=schedules,
            total=len(schedules)
        )

        logger.info(f"[API_GET_SCHEDULES] Returning {len(schedules)} schedules")
        return response

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"[API_GET_SCHEDULES] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get schedules"
        )


@router.put("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: str,
    schedule_update: ScheduleUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a schedule.

    Args:
        schedule_id: UUID of the schedule to update
        schedule_update: Updated schedule data
        current_user: Authenticated user

    Returns:
        Updated schedule

    Raises:
        404: Schedule not found
        403: Not authorized (can only update own schedules)
        500: Server error
    """
    try:
        logger.info(
            f"[API_UPDATE_SCHEDULE] schedule_id={schedule_id}, "
            f"user={current_user.get('sub')}"
        )

        service = ScheduleService()
        result = service.update_schedule(
            schedule_id=schedule_id,
            schedule_update=schedule_update,
            user_id=current_user.get("sub", "")
        )

        response = ScheduleResponse(
            id=result["id"],
            space_id=result["space_id"],
            user_id=result["user_id"],
            week_starting=result["week_starting"],
            schedule_data=result["schedule_data"],
            notes=result.get("notes"),
            is_template=result.get("is_template", False),
            template_name=result.get("template_name"),
            version=result.get("version", 1),
            sharing_settings=result.get("sharing_settings"),
            created_by=result.get("created_by", result["user_id"]),
            modified_by=result.get("modified_by", result["user_id"]),
            last_modified=result.get("last_modified", result["updated_at"]),
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )

        return response

    except ScheduleNotFoundError as e:
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
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"[API_UPDATE_SCHEDULE] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update schedule"
        )


@router.delete("/{schedule_id}", response_model=SuccessResponse)
async def delete_schedule(
    schedule_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a schedule.

    Args:
        schedule_id: UUID of the schedule to delete
        current_user: Authenticated user

    Returns:
        Success response

    Raises:
        404: Schedule not found
        403: Not authorized (can only delete own schedules)
        500: Server error
    """
    try:
        logger.info(
            f"[API_DELETE_SCHEDULE] schedule_id={schedule_id}, "
            f"user={current_user.get('sub')}"
        )

        service = ScheduleService()
        service.delete_schedule(
            schedule_id=schedule_id,
            user_id=current_user.get("sub", "")
        )

        return SuccessResponse(
            message=f"Schedule {schedule_id} deleted successfully"
        )

    except ScheduleNotFoundError as e:
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
        logger.error(f"[API_DELETE_SCHEDULE] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete schedule"
        )


@router.post("/{schedule_id}/share", response_model=ScheduleShare)
async def share_schedule(
    schedule_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a shareable link for a schedule.

    Args:
        schedule_id: UUID of the schedule to share
        current_user: Authenticated user

    Returns:
        Share token and link information

    Raises:
        404: Schedule not found
        403: Not authorized (can only share own schedules)
        500: Server error
    """
    try:
        logger.info(
            f"[API_SHARE_SCHEDULE] schedule_id={schedule_id}, "
            f"user={current_user.get('sub')}"
        )

        service = ScheduleService()
        result = service.create_share_token(
            schedule_id=schedule_id,
            user_id=current_user.get("sub", "")
        )

        response = ScheduleShare(
            share_token=result["share_token"],
            schedule_id=result["schedule_id"],
            share_link=result["share_link"],
            created_at=result["created_at"],
            expires_at=result.get("expires_at")
        )

        return response

    except ScheduleNotFoundError as e:
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
        logger.error(f"[API_SHARE_SCHEDULE] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create share link"
        )


@router.get("/shared/{share_token}", response_model=ScheduleResponse)
async def get_shared_schedule(share_token: str):
    """
    Public endpoint to view shared schedule (no auth required).

    Args:
        share_token: Share token

    Returns:
        Schedule data

    Raises:
        404: Share token not found
        500: Server error
    """
    try:
        logger.info(f"[API_GET_SHARED_SCHEDULE] share_token={share_token}")

        service = ScheduleService()
        result = service.get_shared_schedule(share_token=share_token)

        response = ScheduleResponse(
            id=result["id"],
            space_id=result["space_id"],
            user_id=result["user_id"],
            week_starting=result["week_starting"],
            schedule_data=result["schedule_data"],
            notes=result.get("notes"),
            is_template=result.get("is_template", False),
            template_name=result.get("template_name"),
            version=result.get("version", 1),
            sharing_settings=result.get("sharing_settings"),
            created_by=result.get("created_by", result["user_id"]),
            modified_by=result.get("modified_by", result["user_id"]),
            last_modified=result.get("last_modified", result["updated_at"]),
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )

        return response

    except ScheduleNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"[API_GET_SHARED_SCHEDULE] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get shared schedule"
        )


@router.delete("/{schedule_id}/share", response_model=SuccessResponse)
async def disable_sharing(
    schedule_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Disable sharing for a schedule.

    Args:
        schedule_id: UUID of the schedule
        current_user: Authenticated user

    Returns:
        Success response

    Raises:
        404: Schedule not found
        403: Not authorized
        500: Server error
    """
    try:
        logger.info(
            f"[API_DISABLE_SHARING] schedule_id={schedule_id}, "
            f"user={current_user.get('sub')}"
        )

        service = ScheduleService()
        service.disable_sharing(
            schedule_id=schedule_id,
            user_id=current_user.get("sub", "")
        )

        return SuccessResponse(
            message=f"Sharing disabled for schedule {schedule_id}"
        )

    except ScheduleNotFoundError as e:
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
        logger.error(f"[API_DISABLE_SHARING] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disable sharing"
        )


@router.get("/{schedule_id}/versions", response_model=ScheduleVersionListResponse)
async def get_schedule_versions(
    schedule_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get version history for a schedule.

    Args:
        schedule_id: UUID of the schedule
        current_user: Authenticated user

    Returns:
        List of versions

    Raises:
        404: Schedule not found
        403: Not authorized
        500: Server error
    """
    try:
        logger.info(
            f"[API_GET_VERSIONS] schedule_id={schedule_id}, "
            f"user={current_user.get('sub')}"
        )

        service = ScheduleService()

        # Get current schedule to get current version
        current_schedule = service.get_schedule(
            schedule_id=schedule_id,
            user_id=current_user.get("sub", "")
        )

        # Get version history
        versions_data = service.get_versions(
            schedule_id=schedule_id,
            user_id=current_user.get("sub", "")
        )

        versions = [
            ScheduleVersion(
                version=v["version"],
                schedule_data=v["schedule_data"],
                notes=v.get("notes"),
                modified_at=v["modified_at"],
                modified_by=v["modified_by"]
            )
            for v in versions_data
        ]

        response = ScheduleVersionListResponse(
            versions=versions,
            total=len(versions),
            current_version=current_schedule.get("version", 1)
        )

        return response

    except ScheduleNotFoundError as e:
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
        logger.error(f"[API_GET_VERSIONS] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get version history"
        )


@router.get("/{schedule_id}/versions/{version}", response_model=ScheduleVersion)
async def get_schedule_version(
    schedule_id: str,
    version: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Get specific version of a schedule.

    Args:
        schedule_id: UUID of the schedule
        version: Version number
        current_user: Authenticated user

    Returns:
        Schedule version data

    Raises:
        404: Schedule or version not found
        403: Not authorized
        500: Server error
    """
    try:
        logger.info(
            f"[API_GET_VERSION] schedule_id={schedule_id}, version={version}, "
            f"user={current_user.get('sub')}"
        )

        service = ScheduleService()
        result = service.get_version(
            schedule_id=schedule_id,
            version=version,
            user_id=current_user.get("sub", "")
        )

        response = ScheduleVersion(
            version=result["version"],
            schedule_data=result["schedule_data"],
            notes=result.get("notes"),
            modified_at=result["modified_at"],
            modified_by=result["modified_by"]
        )

        return response

    except ScheduleNotFoundError as e:
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
        logger.error(f"[API_GET_VERSION] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get schedule version"
        )


@router.get("/week/{week_starting}", response_model=ScheduleListResponse)
async def get_schedules_by_week(
    week_starting: date,
    space_id: str = Query(..., description="Space ID to filter schedules"),
    current_user: dict = Depends(get_current_user)
):
    """
    Convenience endpoint to get schedules for a specific week.

    Args:
        week_starting: Start date of the week (must be a Monday)
        space_id: ID of the space
        current_user: Authenticated user

    Returns:
        List of schedules for the specified week

    Raises:
        422: week_starting is not a Monday
        500: Server error
    """
    try:
        # Validate week_starting is a Monday
        if week_starting.weekday() != 0:
            raise ValidationError("week_starting must be a Monday")

        logger.info(
            f"[API_GET_SCHEDULES_WEEK] space_id={space_id}, week={week_starting}"
        )

        service = ScheduleService()
        results = service.get_schedules_by_week(
            space_id=space_id,
            week_starting=week_starting,
            user_id=None  # Get all schedules for the week
        )

        schedules = [
            ScheduleResponse(
                id=result["id"],
                space_id=result["space_id"],
                user_id=result["user_id"],
                week_starting=result["week_starting"],
                schedule_data=result["schedule_data"],
                notes=result.get("notes"),
                is_template=result.get("is_template", False),
                template_name=result.get("template_name"),
                version=result.get("version", 1),
                sharing_settings=result.get("sharing_settings"),
                created_by=result.get("created_by", result["user_id"]),
                modified_by=result.get("modified_by", result["user_id"]),
                last_modified=result.get("last_modified", result["updated_at"]),
                created_at=result["created_at"],
                updated_at=result["updated_at"]
            )
            for result in results
        ]

        response = ScheduleListResponse(
            schedules=schedules,
            total=len(schedules)
        )

        return response

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"[API_GET_SCHEDULES_WEEK] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get schedules"
        )


@router.post("/import/validate", response_model=ScheduleImportValidationResponse)
async def validate_schedule_import(
    request: ScheduleImportRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Validate a schedule import JSON without creating it.

    Args:
        request: JSON string and optional space ID
        current_user: Authenticated user

    Returns:
        Validation result with parsed schedule or errors
    """
    try:
        import_service = ScheduleImportService()

        # Parse and validate the JSON
        parsed_schedule, errors = import_service.parse_import_json(request.json_data)

        if errors:
            # Return validation errors
            return ScheduleImportValidationResponse(
                valid=False,
                errors=[
                    ImportValidationError(
                        field=err.field,
                        message=err.message,
                        line=err.line
                    )
                    for err in errors
                ]
            )

        # Extract conflicts from parsed schedule
        conflicts = []
        if parsed_schedule and 'conflicts' in parsed_schedule:
            conflicts = [
                ImportConflict(**conflict)
                for conflict in parsed_schedule['conflicts']
            ]

        # Build warnings
        warnings = []
        if conflicts:
            warnings.append(f"Found {len(conflicts)} time block conflicts")

        return ScheduleImportValidationResponse(
            valid=True,
            schedule=parsed_schedule,
            warnings=warnings,
            conflicts=conflicts
        )

    except Exception as e:
        logger.error(f"[API_VALIDATE_IMPORT] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate import"
        )


@router.post("/import", response_model=ScheduleImportResponse, status_code=status.HTTP_201_CREATED)
async def import_schedule(
    request: ScheduleImportRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Import and create a schedule from JSON.

    Args:
        request: JSON string and optional space ID
        current_user: Authenticated user

    Returns:
        Created schedule with warnings and conflicts

    Raises:
        422: Validation error in JSON
        500: Server error
    """
    try:
        import_service = ScheduleImportService()
        schedule_service = ScheduleService()

        # Validate space_id is provided
        if not request.space_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="space_id is required for import"
            )

        # Parse and validate the JSON
        parsed_schedule, errors = import_service.parse_import_json(request.json_data)

        if errors:
            # Return validation errors as 422
            error_messages = [f"{err.field}: {err.message}" for err in errors]
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "message": "Invalid import JSON",
                    "errors": error_messages
                }
            )

        # Extract conflicts and metadata
        conflicts = []
        warnings = []
        schedule_data = parsed_schedule['scheduleData']
        metadata = parsed_schedule.get('metadata', {})

        if 'conflicts' in parsed_schedule:
            conflicts = [
                ImportConflict(**conflict)
                for conflict in parsed_schedule['conflicts']
            ]
            warnings.append(f"Found {len(conflicts)} time block conflicts")

        # Get the week starting date (use next Monday if not in metadata)
        from datetime import datetime, timedelta
        today = datetime.now().date()
        days_ahead = (0 - today.weekday()) % 7  # Next Monday
        if days_ahead == 0:
            days_ahead = 7  # If today is Monday, get next Monday
        week_starting = today + timedelta(days=days_ahead)

        # Create the schedule using the schedule service
        schedule_create = ScheduleCreate(
            space_id=request.space_id,
            week_starting=week_starting,
            schedule_data=schedule_data,
            notes=metadata.get('description', ''),
            is_template=False
        )

        created_schedule = await schedule_service.create_schedule(
            schedule_create,
            current_user.get('sub')
        )

        logger.info(
            f"[API_IMPORT_SCHEDULE] user={current_user.get('sub')}, "
            f"schedule_id={created_schedule.schedule_id}"
        )

        return ScheduleImportResponse(
            schedule=created_schedule,
            warnings=warnings,
            conflicts=conflicts
        )

    except HTTPException:
        raise
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"[API_IMPORT_SCHEDULE] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to import schedule"
        )
