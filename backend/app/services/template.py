"""
Template service for managing journal templates.
"""
import json
import logging
import os
from typing import List, Optional, Dict, Any
from pathlib import Path

from app.models.template import Template, TemplateListResponse
from app.services.exceptions import ValidationError

logger = logging.getLogger(__name__)


class TemplateNotFoundError(Exception):
    """Raised when a template is not found."""
    pass


class TemplateService:
    """Service for managing journal templates."""

    def __init__(self):
        """Initialize the template service."""
        # Get template directory path (relative to project root)
        project_root = Path(__file__).parent.parent.parent
        self.template_dir = project_root / "templates"

        if not self.template_dir.exists():
            logger.warning(f"Template directory not found: {self.template_dir}")
            self.template_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"TemplateService initialized with directory: {self.template_dir}")
        self._template_cache: Dict[str, Template] = {}
        self._load_templates()

    def _load_templates(self) -> None:
        """Load all templates from the template directory into cache."""
        registry_path = self.template_dir / "registry.json"

        if not registry_path.exists():
            logger.warning(f"Template registry not found: {registry_path}")
            return

        try:
            with open(registry_path, 'r', encoding='utf-8') as f:
                template_files = json.load(f)

            for template_file in template_files:
                template_path = self.template_dir / template_file
                if template_path.exists():
                    try:
                        with open(template_path, 'r', encoding='utf-8') as f:
                            template_data = json.load(f)
                            template = Template(**template_data)
                            self._template_cache[template.id] = template
                            logger.info(f"Loaded template: {template.id}")
                    except Exception as e:
                        logger.error(f"Failed to load template {template_file}: {e}")
                else:
                    logger.warning(f"Template file not found: {template_path}")

            logger.info(f"Loaded {len(self._template_cache)} templates into cache")

        except Exception as e:
            logger.error(f"Failed to load template registry: {e}")

    def list_templates(self) -> TemplateListResponse:
        """
        List all available templates.

        Returns:
            TemplateListResponse with all templates
        """
        templates = list(self._template_cache.values())
        return TemplateListResponse(
            templates=templates,
            total=len(templates)
        )

    def get_template(self, template_id: str) -> Template:
        """
        Get a specific template by ID.

        Args:
            template_id: Template ID

        Returns:
            Template object

        Raises:
            TemplateNotFoundError: If template doesn't exist
        """
        template = self._template_cache.get(template_id)
        if not template:
            raise TemplateNotFoundError(f"Template '{template_id}' not found")

        return template

    def validate_template_data(
        self,
        template_id: str,
        template_data: Dict[str, Any]
    ) -> bool:
        """
        Validate template data against a template's structure.

        Args:
            template_id: Template ID
            template_data: Data to validate

        Returns:
            True if valid

        Raises:
            TemplateNotFoundError: If template doesn't exist
            ValidationError: If data is invalid
        """
        template = self.get_template(template_id)

        # Check that all sections in template_data correspond to actual template sections
        template_section_ids = {section.id for section in template.sections}
        data_section_ids = set(template_data.keys())

        invalid_sections = data_section_ids - template_section_ids
        if invalid_sections:
            raise ValidationError(
                f"Invalid sections in template data: {', '.join(invalid_sections)}"
            )

        return True

    def apply_template_defaults(self, template_id: str) -> Dict[str, Any]:
        """
        Get default template data for a template.

        Args:
            template_id: Template ID

        Returns:
            Dictionary with section IDs as keys and default values

        Raises:
            TemplateNotFoundError: If template doesn't exist
        """
        template = self.get_template(template_id)

        defaults = {}
        for section in template.sections:
            if section.default_value is not None:
                defaults[section.id] = section.default_value
            else:
                defaults[section.id] = ""

        return defaults
