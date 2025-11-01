"""
Framework template service for managing templates and completions.
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from decimal import Decimal

from app.core.database import get_db, DynamoDBClient
from app.models.framework_template import (
    FrameworkTemplate,
    FrameworkTemplateCreate,
    FrameworkTemplateUpdate,
    FrameworkTemplateListResponse,
    FrameworkTemplateCompletion,
    FrameworkTemplateCompletionCreate,
    FrameworkTemplateCompletionUpdate,
    FrameworkTemplateCompletionListResponse,
    FrameworkTemplateField,
)
from app.services.exceptions import (
    ValidationError,
    UnauthorizedError,
)

logger = logging.getLogger(__name__)


class FrameworkTemplateNotFoundError(Exception):
    """Raised when a framework template is not found."""
    pass


class FrameworkTemplateCompletionNotFoundError(Exception):
    """Raised when a template completion is not found."""
    pass


def _convert_decimals(obj: Any) -> Any:
    """Convert Decimal objects to int/float for JSON serialization."""
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    elif isinstance(obj, dict):
        return {k: _convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_convert_decimals(item) for item in obj]
    return obj


class FrameworkTemplateService:
    """Service for managing framework templates and completions."""

    def __init__(self, db: Optional[DynamoDBClient] = None):
        """Initialize the framework template service."""
        self.db = db or get_db()

    def create_template(
        self,
        template_data: FrameworkTemplateCreate,
        user_id: str,
        space_id: Optional[str] = None
    ) -> FrameworkTemplate:
        """
        Create a new framework template.

        Args:
            template_data: Template creation data
            user_id: User creating the template
            space_id: Optional space ID if template is space-specific

        Returns:
            Created FrameworkTemplate
        """
        template_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        # Create template object
        template = FrameworkTemplate(
            template_id=template_id,
            name=template_data.name,
            description=template_data.description,
            sections=template_data.sections,
            icon=template_data.icon,
            color=template_data.color,
            tags=template_data.tags,
            version=1,
            created_by=user_id,
            created_at=now,
            updated_at=now,
            is_active=True,
            space_id=space_id,
        )

        # Store in DynamoDB
        item = {
            'PK': f'FRAMEWORK_TEMPLATE#{template_id}',
            'SK': 'METADATA',
            'EntityType': 'FrameworkTemplate',
            'TemplateId': template_id,
            'Name': template.name,
            'Description': template.description,
            'Sections': [section.model_dump(by_alias=True) for section in template.sections],
            'Icon': template.icon,
            'Color': template.color,
            'Tags': template.tags,
            'Version': template.version,
            'CreatedBy': user_id,
            'CreatedAt': template.created_at.isoformat(),
            'UpdatedAt': template.updated_at.isoformat(),
            'IsActive': template.is_active,
        }

        if space_id:
            item['SpaceId'] = space_id
            item['GSI1PK'] = f'SPACE#{space_id}'
            item['GSI1SK'] = f'FRAMEWORK_TEMPLATE#{template_id}'

        self.db.put_item(item)

        # Also store version
        self._store_template_version(template, version=1)

        logger.info(f"Created framework template: {template_id}")
        return template

    def _store_template_version(self, template: FrameworkTemplate, version: int) -> None:
        """Store a specific version of a template."""
        version_item = {
            'PK': f'FRAMEWORK_TEMPLATE#{template.template_id}',
            'SK': f'VERSION#{version}',
            'EntityType': 'FrameworkTemplateVersion',
            'TemplateId': template.template_id,
            'Version': version,
            'Name': template.name,
            'Description': template.description,
            'Sections': [section.model_dump(by_alias=True) for section in template.sections],
            'Icon': template.icon,
            'Color': template.color,
            'Tags': template.tags,
            'CreatedBy': template.created_by,
            'CreatedAt': template.created_at.isoformat(),
            'UpdatedAt': template.updated_at.isoformat(),
        }

        if template.space_id:
            version_item['SpaceId'] = template.space_id

        self.db.put_item(version_item)

    def get_template(self, template_id: str, version: Optional[int] = None) -> FrameworkTemplate:
        """
        Get a framework template by ID.

        Args:
            template_id: Template ID
            version: Optional specific version (defaults to latest)

        Returns:
            FrameworkTemplate

        Raises:
            FrameworkTemplateNotFoundError: If template not found
        """
        if version is not None:
            # Get specific version
            item = self.db.get_item(
                pk=f'FRAMEWORK_TEMPLATE#{template_id}',
                sk=f'VERSION#{version}'
            )
        else:
            # Get latest (metadata)
            item = self.db.get_item(
                pk=f'FRAMEWORK_TEMPLATE#{template_id}',
                sk='METADATA'
            )

        if not item:
            raise FrameworkTemplateNotFoundError(f"Template {template_id} not found")

        # Convert to template object
        return self._item_to_template(item)

    def _item_to_template(self, item: Dict[str, Any]) -> FrameworkTemplate:
        """Convert DynamoDB item to FrameworkTemplate."""
        item = _convert_decimals(item)

        return FrameworkTemplate(
            template_id=item['TemplateId'],
            name=item['Name'],
            description=item['Description'],
            sections=[
                FrameworkTemplateField(**field) if 'fieldId' in field
                else section
                for section in item.get('Sections', [])
            ],
            icon=item.get('Icon'),
            color=item.get('Color'),
            tags=item.get('Tags', []),
            version=item['Version'],
            created_by=item['CreatedBy'],
            created_at=datetime.fromisoformat(item['CreatedAt']),
            updated_at=datetime.fromisoformat(item['UpdatedAt']),
            is_active=item.get('IsActive', True),
            space_id=item.get('SpaceId'),
        )

    def list_templates(
        self,
        space_id: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> FrameworkTemplateListResponse:
        """
        List framework templates.

        Args:
            space_id: Optional space ID to filter by
            tags: Optional tags to filter by

        Returns:
            FrameworkTemplateListResponse
        """
        if space_id:
            # Query by space
            items = self.db.query(
                pk=f'SPACE#{space_id}',
                sk_prefix='FRAMEWORK_TEMPLATE#',
                index_name='GSI1'
            )
        else:
            # Scan all templates (for admin/global templates)
            # In production, you'd want pagination here
            from boto3.dynamodb.conditions import Attr
            items = self.db.scan(
                filter_expression=Attr('EntityType').eq('FrameworkTemplate') & Attr('SK').eq('METADATA')
            )

        templates = []
        for item in items:
            try:
                template = self._item_to_template(item)

                # Filter by tags if specified
                if tags:
                    if not any(tag in template.tags for tag in tags):
                        continue

                templates.append(template)
            except Exception as e:
                logger.error(f"Failed to parse template: {e}")
                continue

        return FrameworkTemplateListResponse(
            templates=templates,
            total=len(templates)
        )

    def update_template(
        self,
        template_id: str,
        update_data: FrameworkTemplateUpdate,
        user_id: str,
        create_new_version: bool = True
    ) -> FrameworkTemplate:
        """
        Update a framework template.

        Args:
            template_id: Template ID
            update_data: Update data
            user_id: User performing the update
            create_new_version: Whether to create a new version

        Returns:
            Updated FrameworkTemplate

        Raises:
            FrameworkTemplateNotFoundError: If template not found
            UnauthorizedError: If user not authorized to update
        """
        # Get existing template
        existing = self.get_template(template_id)

        # Check authorization
        if existing.created_by != user_id:
            raise UnauthorizedError("Not authorized to update this template")

        # Prepare updates
        now = datetime.now(timezone.utc)
        updates = {'UpdatedAt': now.isoformat()}

        if update_data.name is not None:
            updates['Name'] = update_data.name
            existing.name = update_data.name

        if update_data.description is not None:
            updates['Description'] = update_data.description
            existing.description = update_data.description

        if update_data.sections is not None:
            updates['Sections'] = [section.model_dump(by_alias=True) for section in update_data.sections]
            existing.sections = update_data.sections

        if update_data.icon is not None:
            updates['Icon'] = update_data.icon
            existing.icon = update_data.icon

        if update_data.color is not None:
            updates['Color'] = update_data.color
            existing.color = update_data.color

        if update_data.tags is not None:
            updates['Tags'] = update_data.tags
            existing.tags = update_data.tags

        if create_new_version:
            new_version = existing.version + 1
            updates['Version'] = new_version
            existing.version = new_version

        existing.updated_at = now

        # Update metadata
        self.db.update_item(
            pk=f'FRAMEWORK_TEMPLATE#{template_id}',
            sk='METADATA',
            updates=updates
        )

        # Store new version if requested
        if create_new_version:
            self._store_template_version(existing, version=existing.version)

        logger.info(f"Updated framework template: {template_id} (version {existing.version})")
        return existing

    def delete_template(self, template_id: str, user_id: str) -> None:
        """
        Delete (deactivate) a framework template.

        Args:
            template_id: Template ID
            user_id: User performing the deletion

        Raises:
            FrameworkTemplateNotFoundError: If template not found
            UnauthorizedError: If user not authorized to delete
        """
        # Get existing template
        existing = self.get_template(template_id)

        # Check authorization
        if existing.created_by != user_id:
            raise UnauthorizedError("Not authorized to delete this template")

        # Soft delete by marking as inactive
        self.db.update_item(
            pk=f'FRAMEWORK_TEMPLATE#{template_id}',
            sk='METADATA',
            updates={'IsActive': False}
        )

        logger.info(f"Deleted framework template: {template_id}")

    # ===== COMPLETION METHODS =====

    def create_completion(
        self,
        completion_data: FrameworkTemplateCompletionCreate,
        user_id: str,
        space_id: str
    ) -> FrameworkTemplateCompletion:
        """
        Create a template completion.

        Args:
            completion_data: Completion data
            user_id: User creating the completion
            space_id: Space context

        Returns:
            FrameworkTemplateCompletion

        Raises:
            FrameworkTemplateNotFoundError: If template not found
            ValidationError: If field values are invalid
        """
        # Get template to validate
        template = self.get_template(completion_data.template_id)

        # Validate field values
        auto_dated_fields = self._validate_and_process_field_values(
            template,
            completion_data.field_values
        )

        completion_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        completion = FrameworkTemplateCompletion(
            completion_id=completion_id,
            template_id=template.template_id,
            template_version=template.version,
            user_id=user_id,
            space_id=space_id,
            field_values=completion_data.field_values,
            completed_at=now,
            updated_at=now,
            auto_dated_fields=auto_dated_fields,
        )

        # Store in DynamoDB
        item = {
            'PK': f'SPACE#{space_id}',
            'SK': f'FRAMEWORK_COMPLETION#{completion_id}',
            'EntityType': 'FrameworkTemplateCompletion',
            'CompletionId': completion_id,
            'TemplateId': template.template_id,
            'TemplateVersion': template.version,
            'UserId': user_id,
            'SpaceId': space_id,
            'FieldValues': completion_data.field_values,
            'CompletedAt': now.isoformat(),
            'UpdatedAt': now.isoformat(),
            'AutoDatedFields': auto_dated_fields,
            # GSI for user's completions
            'GSI1PK': f'USER#{user_id}',
            'GSI1SK': f'FRAMEWORK_COMPLETION#{completion_id}',
        }

        self.db.put_item(item)

        logger.info(f"Created template completion: {completion_id}")
        return completion

    def _validate_and_process_field_values(
        self,
        template: FrameworkTemplate,
        field_values: Dict[str, Any]
    ) -> List[str]:
        """
        Validate field values against template and process auto-date fields.

        Args:
            template: Template to validate against
            field_values: Field values to validate

        Returns:
            List of field IDs that were auto-dated

        Raises:
            ValidationError: If validation fails
        """
        auto_dated_fields = []
        all_fields: Dict[str, FrameworkTemplateField] = {}

        # Collect all fields from all sections
        for section in template.sections:
            for field in section.fields:
                all_fields[field.field_id] = field

        # Check required fields
        for field_id, field in all_fields.items():
            if field.required and field_id not in field_values:
                raise ValidationError(f"Required field '{field.field_name}' is missing")

        # Validate each provided field
        for field_id, value in field_values.items():
            if field_id not in all_fields:
                raise ValidationError(f"Unknown field: {field_id}")

            field = all_fields[field_id]

            # Auto-date logic
            if field.auto_date and field.field_type == "date":
                if not value or value == "":
                    field_values[field_id] = datetime.now(timezone.utc).date().isoformat()
                    auto_dated_fields.append(field_id)

            # Validate based on field type
            if value is not None and value != "":  # Allow empty for non-required fields
                self._validate_field_value(field, value)

        return auto_dated_fields

    def _validate_field_value(self, field: FrameworkTemplateField, value: Any) -> None:
        """Validate a single field value."""
        if field.field_type == "scale_1_7":
            if not isinstance(value, (int, float)) or value < 1 or value > 7:
                raise ValidationError(f"Field '{field.field_name}' must be between 1 and 7")

        elif field.field_type == "scale_0_10":
            if not isinstance(value, (int, float)) or value < 0 or value > 10:
                raise ValidationError(f"Field '{field.field_name}' must be between 0 and 10")

        elif field.field_type == "scale_custom" and field.scale_config:
            min_val = field.scale_config.min_value
            max_val = field.scale_config.max_value
            if not isinstance(value, (int, float)) or value < min_val or value > max_val:
                raise ValidationError(
                    f"Field '{field.field_name}' must be between {min_val} and {max_val}"
                )

        elif field.field_type == "number":
            if not isinstance(value, (int, float)):
                raise ValidationError(f"Field '{field.field_name}' must be a number")

        elif field.field_type == "checkbox":
            if not isinstance(value, bool):
                raise ValidationError(f"Field '{field.field_name}' must be a boolean")

        elif field.field_type == "select":
            if field.options and value not in field.options:
                raise ValidationError(
                    f"Field '{field.field_name}' must be one of: {', '.join(field.options)}"
                )

        elif field.field_type == "multi_select":
            if not isinstance(value, list):
                raise ValidationError(f"Field '{field.field_name}' must be a list")
            if field.options:
                for v in value:
                    if v not in field.options:
                        raise ValidationError(
                            f"Invalid value '{v}' for field '{field.field_name}'"
                        )

    def get_completion(self, completion_id: str, space_id: str) -> FrameworkTemplateCompletion:
        """
        Get a template completion.

        Args:
            completion_id: Completion ID
            space_id: Space ID

        Returns:
            FrameworkTemplateCompletion

        Raises:
            FrameworkTemplateCompletionNotFoundError: If completion not found
        """
        item = self.db.get_item(
            pk=f'SPACE#{space_id}',
            sk=f'FRAMEWORK_COMPLETION#{completion_id}'
        )

        if not item:
            raise FrameworkTemplateCompletionNotFoundError(
                f"Completion {completion_id} not found"
            )

        return self._item_to_completion(item)

    def _item_to_completion(self, item: Dict[str, Any]) -> FrameworkTemplateCompletion:
        """Convert DynamoDB item to FrameworkTemplateCompletion."""
        item = _convert_decimals(item)

        return FrameworkTemplateCompletion(
            completion_id=item['CompletionId'],
            template_id=item['TemplateId'],
            template_version=item['TemplateVersion'],
            user_id=item['UserId'],
            space_id=item['SpaceId'],
            field_values=item['FieldValues'],
            completed_at=datetime.fromisoformat(item['CompletedAt']),
            updated_at=datetime.fromisoformat(item['UpdatedAt']),
            auto_dated_fields=item.get('AutoDatedFields', []),
        )

    def list_completions(
        self,
        space_id: Optional[str] = None,
        user_id: Optional[str] = None,
        template_id: Optional[str] = None
    ) -> FrameworkTemplateCompletionListResponse:
        """
        List template completions.

        Args:
            space_id: Optional space ID filter
            user_id: Optional user ID filter
            template_id: Optional template ID filter

        Returns:
            FrameworkTemplateCompletionListResponse
        """
        if user_id:
            # Query by user
            items = self.db.query(
                pk=f'USER#{user_id}',
                sk_prefix='FRAMEWORK_COMPLETION#',
                index_name='GSI1'
            )
        elif space_id:
            # Query by space
            items = self.db.query(
                pk=f'SPACE#{space_id}',
                sk_prefix='FRAMEWORK_COMPLETION#'
            )
        else:
            raise ValidationError("Must provide either space_id or user_id")

        completions = []
        for item in items:
            try:
                completion = self._item_to_completion(item)

                # Filter by template if specified
                if template_id and completion.template_id != template_id:
                    continue

                completions.append(completion)
            except Exception as e:
                logger.error(f"Failed to parse completion: {e}")
                continue

        return FrameworkTemplateCompletionListResponse(
            completions=completions,
            total=len(completions)
        )

    def update_completion(
        self,
        completion_id: str,
        space_id: str,
        update_data: FrameworkTemplateCompletionUpdate,
        user_id: str
    ) -> FrameworkTemplateCompletion:
        """
        Update a template completion.

        Args:
            completion_id: Completion ID
            space_id: Space ID
            update_data: Update data
            user_id: User performing update

        Returns:
            Updated FrameworkTemplateCompletion

        Raises:
            FrameworkTemplateCompletionNotFoundError: If completion not found
            UnauthorizedError: If user not authorized
            ValidationError: If field values invalid
        """
        # Get existing completion
        existing = self.get_completion(completion_id, space_id)

        # Check authorization
        if existing.user_id != user_id:
            raise UnauthorizedError("Not authorized to update this completion")

        # Get template for validation
        template = self.get_template(existing.template_id, version=existing.template_version)

        # Merge field values
        merged_values = {**existing.field_values, **update_data.field_values}

        # Validate
        auto_dated_fields = self._validate_and_process_field_values(template, merged_values)

        now = datetime.now(timezone.utc)

        # Update in DynamoDB
        self.db.update_item(
            pk=f'SPACE#{space_id}',
            sk=f'FRAMEWORK_COMPLETION#{completion_id}',
            updates={
                'FieldValues': merged_values,
                'UpdatedAt': now.isoformat(),
                'AutoDatedFields': auto_dated_fields,
            }
        )

        # Return updated completion
        existing.field_values = merged_values
        existing.updated_at = now
        existing.auto_dated_fields = auto_dated_fields

        logger.info(f"Updated template completion: {completion_id}")
        return existing

    def delete_completion(
        self,
        completion_id: str,
        space_id: str,
        user_id: str
    ) -> None:
        """
        Delete a template completion.

        Args:
            completion_id: Completion ID
            space_id: Space ID
            user_id: User performing deletion

        Raises:
            FrameworkTemplateCompletionNotFoundError: If completion not found
            UnauthorizedError: If user not authorized
        """
        # Get existing completion
        existing = self.get_completion(completion_id, space_id)

        # Check authorization
        if existing.user_id != user_id:
            raise UnauthorizedError("Not authorized to delete this completion")

        # Delete from DynamoDB
        self.db.delete_item(
            pk=f'SPACE#{space_id}',
            sk=f'FRAMEWORK_COMPLETION#{completion_id}'
        )

        logger.info(f"Deleted template completion: {completion_id}")
