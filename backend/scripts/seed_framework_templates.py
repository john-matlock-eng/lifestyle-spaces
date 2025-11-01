"""
Seed script for framework templates.

This script creates initial framework templates in the database.
Run with: python -m scripts.seed_framework_templates
"""
import os
import sys
import uuid
from datetime import datetime, timezone

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import get_db
from app.models.framework_template import (
    FrameworkTemplate,
    FrameworkTemplateSection,
    FrameworkTemplateField,
)


def create_a1_daily_session_header():
    """
    Create A.1 Daily Session Header template.

    This template is designed for daily check-ins with:
    - Context capture
    - Somatic downshift practice
    - SDT (Self-Determination Theory) metrics
    - Somatic anchors
    - Reflections
    """
    template_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    # Section 1: Session Context
    context_section = FrameworkTemplateSection(
        section_id="context",
        section_name="Session Context",
        description="Set the context for today's session",
        fields=[
            FrameworkTemplateField(
                field_id="session_date",
                field_name="Date",
                field_type="date",
                required=True,
                help_text="Date of this session (auto-populated with today's date)",
                auto_date=True,
                order=1,
            ),
            FrameworkTemplateField(
                field_id="context",
                field_name="What's on your mind?",
                field_type="textarea",
                required=False,
                help_text="Brief context for today - what's happening in your life, what brought you here, any significant events or feelings",
                placeholder="E.g., Starting a new project at work, feeling stressed about upcoming deadline, excited about weekend plans...",
                order=2,
            ),
        ],
        order=1,
        collapsible=False,
    )

    # Section 2: Somatic Practice
    somatic_section = FrameworkTemplateSection(
        section_id="somatic_practice",
        section_name="Somatic Downshift",
        description="Check in with your body and practice grounding",
        fields=[
            FrameworkTemplateField(
                field_id="somatic_downshift_completed",
                field_name="I completed a somatic downshift practice",
                field_type="checkbox",
                required=False,
                help_text="A brief practice (2-5 min) to shift from thinking mode to feeling/sensing mode. Examples: body scan, breath awareness, progressive relaxation.",
                order=1,
            ),
        ],
        order=2,
        collapsible=False,
    )

    # Section 3: SDT Metrics (Self-Determination Theory)
    sdt_section = FrameworkTemplateSection(
        section_id="sdt_metrics",
        section_name="Self-Determination Theory (SDT) Metrics",
        description="Rate your current state across key psychological needs",
        fields=[
            FrameworkTemplateField(
                field_id="sdt_autonomy",
                field_name="Autonomy",
                field_type="scale_1_7",
                required=True,
                help_text="The feeling of having choice and control over your actions. 1 = completely controlled by external forces, 7 = fully self-directed and authentic",
                order=1,
            ),
            FrameworkTemplateField(
                field_id="sdt_competence",
                field_name="Competence",
                field_type="scale_1_7",
                required=True,
                help_text="Your sense of capability and effectiveness. 1 = feeling incompetent or overwhelmed, 7 = confident and capable in your current activities",
                order=2,
            ),
            FrameworkTemplateField(
                field_id="sdt_relatedness",
                field_name="Relatedness",
                field_type="scale_1_7",
                required=True,
                help_text="Your sense of connection with others. 1 = isolated or disconnected, 7 = deeply connected and supported by others",
                order=3,
            ),
            FrameworkTemplateField(
                field_id="sdt_vitality",
                field_name="Vitality",
                field_type="scale_1_7",
                required=True,
                help_text="Your overall energy and aliveness. 1 = depleted or exhausted, 7 = energized and fully alive",
                order=4,
            ),
        ],
        order=3,
        collapsible=False,
    )

    # Section 4: Somatic Anchors
    somatic_anchors_section = FrameworkTemplateSection(
        section_id="somatic_anchors",
        section_name="Somatic Anchors",
        description="Check in with your embodied experience",
        fields=[
            FrameworkTemplateField(
                field_id="body_awareness",
                field_name="Body Awareness",
                field_type="scale_0_10",
                required=True,
                help_text="How connected are you to physical sensations in your body right now? 0 = completely disconnected/numb, 10 = highly attuned to subtle sensations",
                order=1,
            ),
            FrameworkTemplateField(
                field_id="breath_quality",
                field_name="Breath Quality",
                field_type="scale_0_10",
                required=True,
                help_text="How is your breathing? 0 = shallow, restricted, or held, 10 = deep, easy, and natural",
                order=2,
            ),
            FrameworkTemplateField(
                field_id="groundedness",
                field_name="Groundedness",
                field_type="scale_0_10",
                required=True,
                help_text="How grounded and present do you feel? 0 = scattered, anxious, or floating, 10 = solidly rooted and centered",
                order=3,
            ),
        ],
        order=4,
        collapsible=False,
    )

    # Section 5: Insights & Reflections
    reflections_section = FrameworkTemplateSection(
        section_id="insights_reflections",
        section_name="Insights & Reflections",
        description="Capture any insights, patterns, or reflections from this check-in",
        fields=[
            FrameworkTemplateField(
                field_id="insights",
                field_name="Insights & Reflections",
                field_type="textarea",
                required=False,
                help_text="What did you notice? Any patterns, connections, or insights? What feels important to remember?",
                placeholder="E.g., I notice my autonomy is low when I'm stressed about work. My breath gets shallow when thinking about the project deadline...",
                order=1,
            ),
        ],
        order=5,
        collapsible=False,
    )

    # Create the template
    template = FrameworkTemplate(
        template_id=template_id,
        name="A.1 Daily Session Header",
        description="A comprehensive daily check-in template combining psychological (SDT) and somatic metrics. Use this to track your well-being patterns over time.",
        sections=[
            context_section,
            somatic_section,
            sdt_section,
            somatic_anchors_section,
            reflections_section,
        ],
        icon="📋",
        color="#4CAF50",
        tags=["daily", "wellness", "sdt", "somatic", "check-in"],
        version=1,
        created_by="system",
        created_at=now,
        updated_at=now,
        is_active=True,
        space_id=None,  # Global template
    )

    return template


def seed_templates():
    """Seed all framework templates into the database."""
    db = get_db()

    print("🌱 Seeding framework templates...")

    # Create A.1 Daily Session Header
    print("\n📋 Creating A.1 Daily Session Header template...")
    a1_template = create_a1_daily_session_header()

    # Store template metadata
    template_item = {
        'PK': f'FRAMEWORK_TEMPLATE#{a1_template.template_id}',
        'SK': 'METADATA',
        'EntityType': 'FrameworkTemplate',
        'TemplateId': a1_template.template_id,
        'Name': a1_template.name,
        'Description': a1_template.description,
        'Sections': [section.model_dump(by_alias=True) for section in a1_template.sections],
        'Icon': a1_template.icon,
        'Color': a1_template.color,
        'Tags': a1_template.tags,
        'Version': a1_template.version,
        'CreatedBy': a1_template.created_by,
        'CreatedAt': a1_template.created_at.isoformat(),
        'UpdatedAt': a1_template.updated_at.isoformat(),
        'IsActive': a1_template.is_active,
    }

    db.put_item(template_item)
    print(f"   ✅ Created template: {a1_template.name}")
    print(f"   📝 Template ID: {a1_template.template_id}")
    print(f"   📊 Sections: {len(a1_template.sections)}")
    print(f"   🏷️  Tags: {', '.join(a1_template.tags)}")

    # Store version 1
    version_item = {
        'PK': f'FRAMEWORK_TEMPLATE#{a1_template.template_id}',
        'SK': 'VERSION#1',
        'EntityType': 'FrameworkTemplateVersion',
        'TemplateId': a1_template.template_id,
        'Version': 1,
        'Name': a1_template.name,
        'Description': a1_template.description,
        'Sections': [section.model_dump(by_alias=True) for section in a1_template.sections],
        'Icon': a1_template.icon,
        'Color': a1_template.color,
        'Tags': a1_template.tags,
        'CreatedBy': a1_template.created_by,
        'CreatedAt': a1_template.created_at.isoformat(),
        'UpdatedAt': a1_template.updated_at.isoformat(),
    }

    db.put_item(version_item)
    print(f"   ✅ Stored version 1")

    print("\n✨ Seeding complete!")
    print(f"\n📚 Available templates:")
    print(f"   • {a1_template.name} ({a1_template.template_id})")
    print(f"\n💡 You can now use this template in your application!")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Seed framework templates into DynamoDB")
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Confirm seeding (required to prevent accidental runs)",
    )

    args = parser.parse_args()

    if not args.confirm:
        print("⚠️  This script will create templates in your DynamoDB table.")
        print("⚠️  Run with --confirm flag to proceed: python -m scripts.seed_framework_templates --confirm")
        sys.exit(1)

    try:
        seed_templates()
    except Exception as e:
        print(f"\n❌ Error seeding templates: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
