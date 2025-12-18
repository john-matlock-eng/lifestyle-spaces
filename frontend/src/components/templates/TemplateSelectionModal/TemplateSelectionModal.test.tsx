/**
 * TemplateSelectionModal Component Tests
 *
 * Comprehensive tests for the template selection modal and all sub-components.
 *
 * @module templates/TemplateSelectionModal/tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplateSelectionModal } from './index'
import { FrameworkSection } from './FrameworkSection'
import { FrameworkCard } from './FrameworkCard'
import { FrameworkDetailView } from './FrameworkDetailView'
import { TemplateCard } from './TemplateCard'
import { TemplateUnlockStatus } from './TemplateUnlockStatus'
import { LockedTemplateModal } from './LockedTemplateModal'
import { StandaloneSection } from './StandaloneSection'
import {
  getFrequencyLabel,
  getLifecycleLabel,
  getStatusLabel,
  getStatusIcon,
} from './types'
import type {
  FrameworkDisplayData,
  TemplateWithStatus,
  StandaloneTemplate,
} from './types'
import type { Framework, FrameworkSummary } from '@/features/journal/types/framework.types'

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

const createMockFramework = (overrides: Partial<Framework> = {}): Framework => ({
  id: 'framework-1',
  name: 'Test Framework',
  tagline: 'A test framework tagline',
  description: 'A test framework description',
  version: '1.0.0',
  icon: '📚',
  color: '#3498db',
  categories: [
    { id: 'cat-1', name: 'Foundation', description: 'Foundation templates', order: 1 },
  ],
  templates: [
    {
      id: 'template-1',
      name: 'First Template',
      description: 'First template description',
      categoryId: 'cat-1',
      lifecycle: 'foundation',
      frequency: 'once',
      order: 1,
      prerequisites: [],
      cooldownDays: 0,
      unlockConditions: [],
      content: {
        estimatedMinutes: 15,
        sections: [],
      },
    },
    {
      id: 'template-2',
      name: 'Second Template',
      description: 'Second template description',
      categoryId: 'cat-1',
      lifecycle: 'recurring',
      frequency: 'weekly',
      order: 2,
      prerequisites: ['template-1'],
      cooldownDays: 7,
      unlockConditions: [],
      content: {
        estimatedMinutes: 30,
        sections: [],
      },
    },
  ],
  metadata: {
    author: 'Test Author',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  isActive: true,
  ...overrides,
})

const createMockFrameworkSummary = (overrides: Partial<FrameworkSummary> = {}): FrameworkSummary => ({
  frameworkId: 'framework-1',
  completedTemplates: 1,
  totalTemplates: 2,
  startedAt: '2024-01-01',
  lastActivityAt: '2024-01-15',
  templateProgress: [
    {
      templateId: 'template-1',
      status: 'completed',
      completedAt: '2024-01-10',
      entryId: 'entry-1',
    },
  ],
  unlockStatuses: [
    { templateId: 'template-1', isUnlocked: true, blockedReasons: [] },
    {
      templateId: 'template-2',
      isUnlocked: false,
      blockedReasons: [
        {
          reason: 'prerequisite_not_met',
          details: { templateId: 'template-1', templateName: 'First Template' },
        },
      ],
    },
  ],
  ...overrides,
})

const createMockFrameworkDisplayData = (
  overrides: Partial<FrameworkDisplayData> = {}
): FrameworkDisplayData => ({
  framework: createMockFramework(),
  summary: createMockFrameworkSummary(),
  templateCount: 2,
  completedCount: 1,
  category: 'Foundation',
  isStarted: true,
  ...overrides,
})

const createMockTemplateWithStatus = (
  overrides: Partial<TemplateWithStatus> = {}
): TemplateWithStatus => ({
  template: createMockFramework().templates[0],
  status: 'available',
  ...overrides,
})

const createMockStandaloneTemplate = (
  overrides: Partial<StandaloneTemplate> = {}
): StandaloneTemplate => ({
  id: 'standalone-1',
  name: 'Standalone Template',
  description: 'A standalone template',
  icon: '📝',
  color: '#9b59b6',
  frequency: 'as_needed',
  estimatedMinutes: 10,
  tags: ['personal', 'reflection'],
  ...overrides,
})

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('Utility Functions', () => {
  describe('getFrequencyLabel', () => {
    it('returns correct labels for all frequencies', () => {
      expect(getFrequencyLabel('once')).toBe('One-time')
      expect(getFrequencyLabel('daily')).toBe('Daily')
      expect(getFrequencyLabel('weekly')).toBe('Weekly')
      expect(getFrequencyLabel('monthly')).toBe('Monthly')
      expect(getFrequencyLabel('quarterly')).toBe('Quarterly')
      expect(getFrequencyLabel('yearly')).toBe('Yearly')
      expect(getFrequencyLabel('as_needed')).toBe('As needed')
    })

    it('returns input for unknown frequency', () => {
      expect(getFrequencyLabel('unknown' as 'daily')).toBe('unknown')
    })
  })

  describe('getLifecycleLabel', () => {
    it('returns correct labels for all lifecycles', () => {
      expect(getLifecycleLabel('foundation')).toBe('Foundation')
      expect(getLifecycleLabel('recurring')).toBe('Recurring')
      expect(getLifecycleLabel('milestone')).toBe('Milestone')
      expect(getLifecycleLabel('special')).toBe('Special')
    })

    it('returns input for unknown lifecycle', () => {
      expect(getLifecycleLabel('unknown' as 'foundation')).toBe('unknown')
    })
  })

  describe('getStatusLabel', () => {
    it('returns correct labels for all statuses', () => {
      expect(getStatusLabel('available')).toBe('Available')
      expect(getStatusLabel('locked')).toBe('Locked')
      expect(getStatusLabel('cooldown')).toBe('Cooldown')
      expect(getStatusLabel('completed')).toBe('Complete')
      expect(getStatusLabel('in_progress')).toBe('In Progress')
    })

    it('returns input for unknown status', () => {
      expect(getStatusLabel('unknown' as 'available')).toBe('unknown')
    })
  })

  describe('getStatusIcon', () => {
    it('returns correct icons for all statuses', () => {
      expect(getStatusIcon('available')).toBe('✓')
      expect(getStatusIcon('locked')).toBe('🔒')
      expect(getStatusIcon('cooldown')).toBe('⏳')
      expect(getStatusIcon('completed')).toBe('✅')
      expect(getStatusIcon('in_progress')).toBe('📝')
    })

    it('returns bullet for unknown status', () => {
      expect(getStatusIcon('unknown' as 'available')).toBe('•')
    })
  })
})

// ============================================================================
// FRAMEWORK CARD TESTS
// ============================================================================

describe('FrameworkCard', () => {
  const mockOnClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders framework information correctly', () => {
    const frameworkData = createMockFrameworkDisplayData()

    render(
      <FrameworkCard
        framework={frameworkData}
        onClick={mockOnClick}
        testId="test-card"
      />
    )

    expect(screen.getByTestId('test-card')).toBeInTheDocument()
    expect(screen.getByTestId('test-card-name')).toHaveTextContent('Test Framework')
    expect(screen.getByTestId('test-card-description')).toHaveTextContent('A test framework tagline')
    expect(screen.getByTestId('test-card-count')).toHaveTextContent('2 templates')
    expect(screen.getByTestId('test-card-category')).toHaveTextContent('Foundation')
  })

  it('shows progress when framework is started', () => {
    const frameworkData = createMockFrameworkDisplayData({ isStarted: true })

    render(
      <FrameworkCard
        framework={frameworkData}
        onClick={mockOnClick}
        testId="test-card"
      />
    )

    expect(screen.getByTestId('test-card-progress')).toBeInTheDocument()
    expect(screen.getByText('1/2 complete')).toBeInTheDocument()
  })

  it('does not show progress when framework not started', () => {
    const frameworkData = createMockFrameworkDisplayData({ isStarted: false, completedCount: 0 })

    render(
      <FrameworkCard
        framework={frameworkData}
        onClick={mockOnClick}
        testId="test-card"
      />
    )

    expect(screen.queryByTestId('test-card-progress')).not.toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const frameworkData = createMockFrameworkDisplayData()

    render(
      <FrameworkCard
        framework={frameworkData}
        onClick={mockOnClick}
        testId="test-card"
      />
    )

    await userEvent.click(screen.getByTestId('test-card'))
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('calls onClick on Enter key', async () => {
    const frameworkData = createMockFrameworkDisplayData()

    render(
      <FrameworkCard
        framework={frameworkData}
        onClick={mockOnClick}
        testId="test-card"
      />
    )

    const card = screen.getByTestId('test-card')
    card.focus()
    fireEvent.keyDown(card, { key: 'Enter' })

    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('calls onClick on Space key', async () => {
    const frameworkData = createMockFrameworkDisplayData()

    render(
      <FrameworkCard
        framework={frameworkData}
        onClick={mockOnClick}
        testId="test-card"
      />
    )

    const card = screen.getByTestId('test-card')
    card.focus()
    fireEvent.keyDown(card, { key: ' ' })

    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('displays framework icon when available', () => {
    const frameworkData = createMockFrameworkDisplayData()

    render(
      <FrameworkCard
        framework={frameworkData}
        onClick={mockOnClick}
        testId="test-card"
      />
    )

    expect(screen.getByTestId('test-card-icon')).toHaveTextContent('📚')
  })

  it('displays first letter when no icon', () => {
    const framework = createMockFramework({ icon: undefined })
    const frameworkData = createMockFrameworkDisplayData({ framework })

    render(
      <FrameworkCard
        framework={frameworkData}
        onClick={mockOnClick}
        testId="test-card"
      />
    )

    expect(screen.getByTestId('test-card-icon')).toHaveTextContent('T')
  })

  it('has correct accessibility attributes', () => {
    const frameworkData = createMockFrameworkDisplayData()

    render(
      <FrameworkCard
        framework={frameworkData}
        onClick={mockOnClick}
        testId="test-card"
      />
    )

    const card = screen.getByTestId('test-card')
    expect(card).toHaveAttribute('role', 'button')
    expect(card).toHaveAttribute('tabIndex', '0')
    expect(card).toHaveAttribute('aria-label', 'Test Framework framework with 2 templates')
  })
})

// ============================================================================
// FRAMEWORK SECTION TESTS
// ============================================================================

describe('FrameworkSection', () => {
  const mockOnFrameworkClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders section header', () => {
    render(
      <FrameworkSection
        frameworks={[]}
        onFrameworkClick={mockOnFrameworkClick}
        testIdPrefix="test"
      />
    )

    expect(screen.getByTestId('test-framework-section-header')).toHaveTextContent('FRAMEWORKS')
  })

  it('renders framework cards', () => {
    const frameworks = [
      createMockFrameworkDisplayData(),
      createMockFrameworkDisplayData({
        framework: createMockFramework({ id: 'framework-2', name: 'Second Framework' }),
      }),
    ]

    render(
      <FrameworkSection
        frameworks={frameworks}
        onFrameworkClick={mockOnFrameworkClick}
        testIdPrefix="test"
      />
    )

    expect(screen.getByTestId('test-framework-section-card-framework-1')).toBeInTheDocument()
    expect(screen.getByTestId('test-framework-section-card-framework-2')).toBeInTheDocument()
  })

  it('shows empty state when no frameworks', () => {
    render(
      <FrameworkSection
        frameworks={[]}
        onFrameworkClick={mockOnFrameworkClick}
        testIdPrefix="test"
      />
    )

    expect(screen.getByTestId('test-framework-section-empty')).toBeInTheDocument()
    expect(screen.getByText('No frameworks available')).toBeInTheDocument()
  })

  it('calls onFrameworkClick with correct ID', async () => {
    const frameworks = [createMockFrameworkDisplayData()]

    render(
      <FrameworkSection
        frameworks={frameworks}
        onFrameworkClick={mockOnFrameworkClick}
        testIdPrefix="test"
      />
    )

    await userEvent.click(screen.getByTestId('test-framework-section-card-framework-1'))
    expect(mockOnFrameworkClick).toHaveBeenCalledWith('framework-1')
  })

  it('has correct accessibility attributes', () => {
    render(
      <FrameworkSection
        frameworks={[]}
        onFrameworkClick={mockOnFrameworkClick}
        testIdPrefix="test"
      />
    )

    const section = screen.getByTestId('test-framework-section')
    expect(section).toHaveAttribute('aria-labelledby', 'test-framework-section-heading')
  })
})

// ============================================================================
// TEMPLATE UNLOCK STATUS TESTS
// ============================================================================

describe('TemplateUnlockStatus', () => {
  it('renders available status', () => {
    render(
      <TemplateUnlockStatus
        status="available"
        testId="test-status"
      />
    )

    expect(screen.getByTestId('test-status-label')).toHaveTextContent('Available')
    expect(screen.getByTestId('test-status-icon')).toHaveTextContent('✓')
  })

  it('renders locked status with reason', () => {
    const unlockEvaluation = {
      isUnlocked: false,
      blockedReasons: [
        {
          reason: 'prerequisite_not_met' as const,
          details: { templateId: 'prereq-1', templateName: 'Required Template' },
        },
      ],
    }

    render(
      <TemplateUnlockStatus
        status="locked"
        unlockEvaluation={unlockEvaluation}
        testId="test-status"
      />
    )

    expect(screen.getByTestId('test-status-label')).toHaveTextContent('Locked')
    expect(screen.getByTestId('test-status-icon')).toHaveTextContent('🔒')
    expect(screen.getByTestId('test-status-reason')).toHaveTextContent('Prerequisites required')
  })

  it('renders cooldown status with time remaining', () => {
    const futureDate = new Date()
    futureDate.setHours(futureDate.getHours() + 5)

    render(
      <TemplateUnlockStatus
        status="cooldown"
        cooldownEndsAt={futureDate.toISOString()}
        testId="test-status"
      />
    )

    expect(screen.getByTestId('test-status-label')).toHaveTextContent('Cooldown')
    expect(screen.getByTestId('test-status-cooldown')).toBeInTheDocument()
  })

  it('renders in compact mode', () => {
    render(
      <TemplateUnlockStatus
        status="locked"
        compact
        testId="test-status"
      />
    )

    const container = screen.getByTestId('test-status')
    expect(container).toHaveClass('template-unlock-status--compact')
  })

  it('shows prerequisites list when locked', () => {
    const unlockEvaluation = {
      isUnlocked: false,
      blockedReasons: [
        {
          reason: 'prerequisite_not_met' as const,
          details: { templateId: 'prereq-1', templateName: 'First Required' },
        },
        {
          reason: 'prerequisite_not_met' as const,
          details: { templateId: 'prereq-2', templateName: 'Second Required' },
        },
      ],
    }

    render(
      <TemplateUnlockStatus
        status="locked"
        unlockEvaluation={unlockEvaluation}
        testId="test-status"
      />
    )

    expect(screen.getByTestId('test-status-prerequisites')).toBeInTheDocument()
    expect(screen.getByText('First Required')).toBeInTheDocument()
    expect(screen.getByText('Second Required')).toBeInTheDocument()
  })
})

// ============================================================================
// TEMPLATE CARD TESTS
// ============================================================================

describe('TemplateCard', () => {
  const mockOnAction = vi.fn()
  const mockOnView = vi.fn()
  const mockOnEdit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders template information', () => {
    const templateWithStatus = createMockTemplateWithStatus()

    render(
      <TemplateCard
        templateWithStatus={templateWithStatus}
        orderNumber={1}
        onAction={mockOnAction}
        testId="test-card"
      />
    )

    expect(screen.getByTestId('test-card-name')).toHaveTextContent('First Template')
    expect(screen.getByTestId('test-card-description')).toHaveTextContent('First template description')
    expect(screen.getByTestId('test-card-order')).toHaveTextContent('1')
    expect(screen.getByTestId('test-card-lifecycle')).toHaveTextContent('Foundation')
  })

  it('shows Create button for available templates', () => {
    const templateWithStatus = createMockTemplateWithStatus({ status: 'available' })

    render(
      <TemplateCard
        templateWithStatus={templateWithStatus}
        orderNumber={1}
        onAction={mockOnAction}
        testId="test-card"
      />
    )

    expect(screen.getByTestId('test-card-action')).toHaveTextContent('Create')
    expect(screen.getByTestId('test-card-action')).not.toBeDisabled()
  })

  it('shows Locked button for locked templates', () => {
    const templateWithStatus = createMockTemplateWithStatus({ status: 'locked' })

    render(
      <TemplateCard
        templateWithStatus={templateWithStatus}
        orderNumber={1}
        onAction={mockOnAction}
        testId="test-card"
      />
    )

    expect(screen.getByTestId('test-card-action')).toHaveTextContent('Locked')
    // Locked button is clickable to show the locked template modal
    expect(screen.getByTestId('test-card-action')).not.toBeDisabled()
  })

  it('shows Continue button for in-progress templates', () => {
    const templateWithStatus = createMockTemplateWithStatus({
      status: 'in_progress',
      entryId: 'entry-1',
    })

    render(
      <TemplateCard
        templateWithStatus={templateWithStatus}
        orderNumber={1}
        onAction={mockOnAction}
        onView={mockOnView}
        onEdit={mockOnEdit}
        testId="test-card"
      />
    )

    expect(screen.getByTestId('test-card-action')).toHaveTextContent('Continue')
    expect(screen.getByTestId('test-card-view')).toBeInTheDocument()
    expect(screen.getByTestId('test-card-edit')).toBeInTheDocument()
  })

  it('shows View button for completed foundation templates', () => {
    const template = createMockFramework().templates[0]
    const templateWithStatus = createMockTemplateWithStatus({
      template: { ...template, lifecycle: 'foundation' },
      status: 'completed',
      entryId: 'entry-1',
    })

    render(
      <TemplateCard
        templateWithStatus={templateWithStatus}
        orderNumber={1}
        onAction={mockOnAction}
        onView={mockOnView}
        testId="test-card"
      />
    )

    expect(screen.getByTestId('test-card-action')).toHaveTextContent('View')
    expect(screen.getByTestId('test-card-view')).toBeInTheDocument()
  })

  it('shows New button for completed recurring templates', () => {
    const template = createMockFramework().templates[1]
    const templateWithStatus = createMockTemplateWithStatus({
      template,
      status: 'completed',
      entryId: 'entry-1',
    })

    render(
      <TemplateCard
        templateWithStatus={templateWithStatus}
        orderNumber={1}
        onAction={mockOnAction}
        onView={mockOnView}
        testId="test-card"
      />
    )

    expect(screen.getByTestId('test-card-create-new')).toBeInTheDocument()
    expect(screen.getByTestId('test-card-create-new')).toHaveTextContent('+ New')
  })

  it('calls onAction when action button clicked', async () => {
    const templateWithStatus = createMockTemplateWithStatus()

    render(
      <TemplateCard
        templateWithStatus={templateWithStatus}
        orderNumber={1}
        onAction={mockOnAction}
        testId="test-card"
      />
    )

    await userEvent.click(screen.getByTestId('test-card-action'))
    expect(mockOnAction).toHaveBeenCalledTimes(1)
  })

  it('calls onView when view button clicked', async () => {
    const templateWithStatus = createMockTemplateWithStatus({
      status: 'completed',
      entryId: 'entry-1',
    })

    render(
      <TemplateCard
        templateWithStatus={templateWithStatus}
        orderNumber={1}
        onAction={mockOnAction}
        onView={mockOnView}
        testId="test-card"
      />
    )

    await userEvent.click(screen.getByTestId('test-card-view'))
    expect(mockOnView).toHaveBeenCalledTimes(1)
  })

  it('displays unlock status for locked templates', () => {
    const templateWithStatus = createMockTemplateWithStatus({
      status: 'locked',
      unlockEvaluation: {
        isUnlocked: false,
        blockedReasons: [{ reason: 'prerequisite_not_met' as const }],
      },
    })

    render(
      <TemplateCard
        templateWithStatus={templateWithStatus}
        orderNumber={1}
        onAction={mockOnAction}
        testId="test-card"
      />
    )

    expect(screen.getByTestId('test-card-status')).toBeInTheDocument()
  })
})

// ============================================================================
// FRAMEWORK DETAIL VIEW TESTS
// ============================================================================

describe('FrameworkDetailView', () => {
  const mockOnBack = vi.fn()
  const mockOnSelectTemplate = vi.fn()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _mockOnViewEntry = vi.fn()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _mockOnEditEntry = vi.fn()
  const mockOnLockedTemplateClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders framework header', () => {
    const framework = createMockFramework()
    const summary = createMockFrameworkSummary()
    const templates = framework.templates.map((t) => createMockTemplateWithStatus({ template: t }))

    render(
      <FrameworkDetailView
        framework={framework}
        summary={summary}
        templates={templates}
        onBack={mockOnBack}
        onSelectTemplate={mockOnSelectTemplate}
        onLockedTemplateClick={mockOnLockedTemplateClick}
        testIdPrefix="test"
      />
    )

    expect(screen.getByTestId('test-detail-name')).toHaveTextContent('Test Framework')
    expect(screen.getByTestId('test-detail-tagline')).toHaveTextContent('A test framework tagline')
    expect(screen.getByTestId('test-detail-description')).toHaveTextContent('A test framework description')
  })

  it('renders back button', () => {
    const framework = createMockFramework()
    const templates = framework.templates.map((t) => createMockTemplateWithStatus({ template: t }))

    render(
      <FrameworkDetailView
        framework={framework}
        summary={null}
        templates={templates}
        onBack={mockOnBack}
        onSelectTemplate={mockOnSelectTemplate}
        onLockedTemplateClick={mockOnLockedTemplateClick}
        testIdPrefix="test"
      />
    )

    expect(screen.getByTestId('test-detail-back')).toBeInTheDocument()
  })

  it('calls onBack when back button clicked', async () => {
    const framework = createMockFramework()
    const templates = framework.templates.map((t) => createMockTemplateWithStatus({ template: t }))

    render(
      <FrameworkDetailView
        framework={framework}
        summary={null}
        templates={templates}
        onBack={mockOnBack}
        onSelectTemplate={mockOnSelectTemplate}
        onLockedTemplateClick={mockOnLockedTemplateClick}
        testIdPrefix="test"
      />
    )

    await userEvent.click(screen.getByTestId('test-detail-back'))
    expect(mockOnBack).toHaveBeenCalledTimes(1)
  })

  it('shows progress bar when started', () => {
    const framework = createMockFramework()
    const summary = createMockFrameworkSummary()
    const templates = framework.templates.map((t) => createMockTemplateWithStatus({ template: t }))

    render(
      <FrameworkDetailView
        framework={framework}
        summary={summary}
        templates={templates}
        onBack={mockOnBack}
        onSelectTemplate={mockOnSelectTemplate}
        onLockedTemplateClick={mockOnLockedTemplateClick}
        testIdPrefix="test"
      />
    )

    expect(screen.getByTestId('test-detail-progress')).toBeInTheDocument()
    expect(screen.getByText('1/2 complete')).toBeInTheDocument()
  })

  it('groups templates by lifecycle', () => {
    const framework = createMockFramework()
    const templates = framework.templates.map((t) => createMockTemplateWithStatus({ template: t }))

    render(
      <FrameworkDetailView
        framework={framework}
        summary={null}
        templates={templates}
        onBack={mockOnBack}
        onSelectTemplate={mockOnSelectTemplate}
        onLockedTemplateClick={mockOnLockedTemplateClick}
        testIdPrefix="test"
      />
    )

    expect(screen.getByTestId('test-detail-group-foundation')).toBeInTheDocument()
    expect(screen.getByTestId('test-detail-group-recurring')).toBeInTheDocument()
  })

  it('calls onSelectTemplate when template selected', async () => {
    const framework = createMockFramework()
    const templates = [createMockTemplateWithStatus({ template: framework.templates[0] })]

    render(
      <FrameworkDetailView
        framework={framework}
        summary={null}
        templates={templates}
        onBack={mockOnBack}
        onSelectTemplate={mockOnSelectTemplate}
        onLockedTemplateClick={mockOnLockedTemplateClick}
        testIdPrefix="test"
      />
    )

    await userEvent.click(screen.getByTestId('test-detail-template-template-1-action'))
    expect(mockOnSelectTemplate).toHaveBeenCalledWith('template-1')
  })

  it('calls onLockedTemplateClick for locked templates', async () => {
    const framework = createMockFramework()
    const lockedTemplate = createMockTemplateWithStatus({
      template: framework.templates[0],
      status: 'locked',
    })

    render(
      <FrameworkDetailView
        framework={framework}
        summary={null}
        templates={[lockedTemplate]}
        onBack={mockOnBack}
        onSelectTemplate={mockOnSelectTemplate}
        onLockedTemplateClick={mockOnLockedTemplateClick}
        testIdPrefix="test"
      />
    )

    await userEvent.click(screen.getByTestId('test-detail-template-template-1-action'))
    expect(mockOnLockedTemplateClick).toHaveBeenCalledWith(lockedTemplate)
  })

  it('shows empty state when no templates', () => {
    const framework = createMockFramework({ templates: [] })

    render(
      <FrameworkDetailView
        framework={framework}
        summary={null}
        templates={[]}
        onBack={mockOnBack}
        onSelectTemplate={mockOnSelectTemplate}
        onLockedTemplateClick={mockOnLockedTemplateClick}
        testIdPrefix="test"
      />
    )

    expect(screen.getByTestId('test-detail-empty')).toBeInTheDocument()
  })
})

// ============================================================================
// LOCKED TEMPLATE MODAL TESTS
// ============================================================================

describe('LockedTemplateModal', () => {
  const mockOnClose = vi.fn()
  const mockOnNavigateToTemplate = vi.fn()
  const mockOnBackToFramework = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when not open', () => {
    const template = createMockTemplateWithStatus({ status: 'locked' })
    const framework = createMockFramework()

    const { container } = render(
      <LockedTemplateModal
        isOpen={false}
        onClose={mockOnClose}
        template={template}
        framework={framework}
        onBackToFramework={mockOnBackToFramework}
        testId="test-modal"
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders modal when open', () => {
    const template = createMockTemplateWithStatus({ status: 'locked' })
    const framework = createMockFramework()

    render(
      <LockedTemplateModal
        isOpen={true}
        onClose={mockOnClose}
        template={template}
        framework={framework}
        onBackToFramework={mockOnBackToFramework}
        testId="test-modal"
      />
    )

    expect(screen.getByTestId('test-modal')).toBeInTheDocument()
  })

  it('shows locked icon for locked templates', () => {
    const template = createMockTemplateWithStatus({ status: 'locked' })
    const framework = createMockFramework()

    render(
      <LockedTemplateModal
        isOpen={true}
        onClose={mockOnClose}
        template={template}
        framework={framework}
        onBackToFramework={mockOnBackToFramework}
        testId="test-modal"
      />
    )

    expect(screen.getByTestId('test-modal-title')).toHaveTextContent('Template Locked')
  })

  it('shows cooldown icon for cooldown templates', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 1)

    const template = createMockTemplateWithStatus({
      status: 'cooldown',
      cooldownEndsAt: futureDate.toISOString(),
    })
    const framework = createMockFramework()

    render(
      <LockedTemplateModal
        isOpen={true}
        onClose={mockOnClose}
        template={template}
        framework={framework}
        onBackToFramework={mockOnBackToFramework}
        testId="test-modal"
      />
    )

    expect(screen.getByTestId('test-modal-title')).toHaveTextContent('Template in Cooldown')
  })

  it('shows prerequisite templates', () => {
    // Create a different template (Second Template) that requires First Template
    const lockedTemplate = createMockTemplateWithStatus({
      template: createMockFramework().templates[1], // Second Template
      status: 'locked',
      unlockEvaluation: {
        isUnlocked: false,
        blockedReasons: [
          {
            reason: 'prerequisite_not_met' as const,
            details: { templateId: 'template-1', templateName: 'First Template' },
          },
        ],
      },
    })
    const framework = createMockFramework()

    render(
      <LockedTemplateModal
        isOpen={true}
        onClose={mockOnClose}
        template={lockedTemplate}
        framework={framework}
        onNavigateToTemplate={mockOnNavigateToTemplate}
        onBackToFramework={mockOnBackToFramework}
        testId="test-modal"
      />
    )

    // Check the locked template name is shown
    expect(screen.getByTestId('test-modal-template-name')).toHaveTextContent('Second Template')
    // Check the prerequisite is listed
    expect(screen.getByTestId('test-modal-prereq-template-1')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', async () => {
    const template = createMockTemplateWithStatus({ status: 'locked' })
    const framework = createMockFramework()

    render(
      <LockedTemplateModal
        isOpen={true}
        onClose={mockOnClose}
        template={template}
        framework={framework}
        onBackToFramework={mockOnBackToFramework}
        testId="test-modal"
      />
    )

    await userEvent.click(screen.getByTestId('test-modal-close'))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onBackToFramework when back button clicked', async () => {
    const template = createMockTemplateWithStatus({ status: 'locked' })
    const framework = createMockFramework()

    render(
      <LockedTemplateModal
        isOpen={true}
        onClose={mockOnClose}
        template={template}
        framework={framework}
        onBackToFramework={mockOnBackToFramework}
        testId="test-modal"
      />
    )

    await userEvent.click(screen.getByTestId('test-modal-back'))
    expect(mockOnBackToFramework).toHaveBeenCalledTimes(1)
  })

  it('calls onNavigateToTemplate when prerequisite clicked', async () => {
    const template = createMockTemplateWithStatus({
      status: 'locked',
      unlockEvaluation: {
        isUnlocked: false,
        blockedReasons: [
          {
            reason: 'prerequisite_not_met' as const,
            details: { templateId: 'template-1', templateName: 'First Template' },
          },
        ],
      },
    })
    const framework = createMockFramework()

    render(
      <LockedTemplateModal
        isOpen={true}
        onClose={mockOnClose}
        template={template}
        framework={framework}
        onNavigateToTemplate={mockOnNavigateToTemplate}
        onBackToFramework={mockOnBackToFramework}
        testId="test-modal"
      />
    )

    await userEvent.click(screen.getByTestId('test-modal-prereq-template-1'))
    expect(mockOnNavigateToTemplate).toHaveBeenCalledWith('template-1')
  })

  it('closes on Escape key', () => {
    const template = createMockTemplateWithStatus({ status: 'locked' })
    const framework = createMockFramework()

    render(
      <LockedTemplateModal
        isOpen={true}
        onClose={mockOnClose}
        template={template}
        framework={framework}
        onBackToFramework={mockOnBackToFramework}
        testId="test-modal"
      />
    )

    fireEvent.keyDown(screen.getByTestId('test-modal'), { key: 'Escape' })
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// STANDALONE SECTION TESTS
// ============================================================================

describe('StandaloneSection', () => {
  const mockOnTemplateClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders section header', () => {
    render(
      <StandaloneSection
        templates={[]}
        onTemplateClick={mockOnTemplateClick}
        testIdPrefix="test"
      />
    )

    expect(screen.getByTestId('test-standalone-section-header')).toHaveTextContent('STANDALONE TEMPLATES')
  })

  it('renders standalone template cards', () => {
    const templates = [
      createMockStandaloneTemplate(),
      createMockStandaloneTemplate({ id: 'standalone-2', name: 'Second Standalone' }),
    ]

    render(
      <StandaloneSection
        templates={templates}
        onTemplateClick={mockOnTemplateClick}
        testIdPrefix="test"
      />
    )

    expect(screen.getByTestId('test-standalone-section-card-standalone-1')).toBeInTheDocument()
    expect(screen.getByTestId('test-standalone-section-card-standalone-2')).toBeInTheDocument()
  })

  it('shows empty state when no templates', () => {
    render(
      <StandaloneSection
        templates={[]}
        onTemplateClick={mockOnTemplateClick}
        testIdPrefix="test"
      />
    )

    expect(screen.getByTestId('test-standalone-section-empty')).toBeInTheDocument()
    expect(screen.getByText('No standalone templates available')).toBeInTheDocument()
  })

  it('calls onTemplateClick with correct ID', async () => {
    const templates = [createMockStandaloneTemplate()]

    render(
      <StandaloneSection
        templates={templates}
        onTemplateClick={mockOnTemplateClick}
        testIdPrefix="test"
      />
    )

    await userEvent.click(screen.getByTestId('test-standalone-section-card-standalone-1'))
    expect(mockOnTemplateClick).toHaveBeenCalledWith('standalone-1')
  })

  it('displays template tags', () => {
    const templates = [createMockStandaloneTemplate()]

    render(
      <StandaloneSection
        templates={templates}
        onTemplateClick={mockOnTemplateClick}
        testIdPrefix="test"
      />
    )

    expect(screen.getByText('personal')).toBeInTheDocument()
    expect(screen.getByText('reflection')).toBeInTheDocument()
  })
})

// ============================================================================
// MAIN MODAL TESTS
// ============================================================================

describe('TemplateSelectionModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSelectTemplate = vi.fn()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _mockOnViewEntry = vi.fn()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _mockOnEditEntry = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when not open', () => {
    const { container } = render(
      <TemplateSelectionModal
        isOpen={false}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders modal when open', () => {
    render(
      <TemplateSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
        testId="test-modal"
      />
    )

    expect(screen.getByTestId('test-modal')).toBeInTheDocument()
    expect(screen.getByTestId('test-modal-content')).toBeInTheDocument()
  })

  it('shows title and close button', () => {
    render(
      <TemplateSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
        testId="test-modal"
      />
    )

    expect(screen.getByText('Select Template')).toBeInTheDocument()
    expect(screen.getByTestId('test-modal-close')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', async () => {
    render(
      <TemplateSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
        testId="test-modal"
      />
    )

    await userEvent.click(screen.getByTestId('test-modal-close'))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('shows search bar in list view', () => {
    render(
      <TemplateSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
        testId="test-modal"
      />
    )

    expect(screen.getByTestId('test-modal-search')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search templates and frameworks...')).toBeInTheDocument()
  })

  it('renders framework section', () => {
    const frameworks = [createMockFramework()]

    render(
      <TemplateSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
        frameworks={frameworks}
        testId="test-modal"
      />
    )

    expect(screen.getByTestId('test-modal-framework-section')).toBeInTheDocument()
  })

  it('renders standalone section when templates provided', () => {
    const standaloneTemplates = [createMockStandaloneTemplate()]

    render(
      <TemplateSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
        standaloneTemplates={standaloneTemplates}
        testId="test-modal"
      />
    )

    expect(screen.getByTestId('test-modal-standalone-section')).toBeInTheDocument()
  })

  it('navigates to framework detail on framework click', async () => {
    const frameworks = [createMockFramework()]

    render(
      <TemplateSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
        frameworks={frameworks}
        testId="test-modal"
      />
    )

    await userEvent.click(screen.getByTestId('test-modal-framework-section-card-framework-1'))

    expect(screen.getByTestId('test-modal-detail')).toBeInTheDocument()
    expect(screen.getByTestId('test-modal-detail-name')).toHaveTextContent('Test Framework')
  })

  it('returns to list view on back button', async () => {
    const frameworks = [createMockFramework()]

    render(
      <TemplateSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
        frameworks={frameworks}
        testId="test-modal"
      />
    )

    // Navigate to detail
    await userEvent.click(screen.getByTestId('test-modal-framework-section-card-framework-1'))
    expect(screen.getByTestId('test-modal-detail')).toBeInTheDocument()

    // Go back
    await userEvent.click(screen.getByTestId('test-modal-detail-back'))
    expect(screen.getByTestId('test-modal-framework-section')).toBeInTheDocument()
  })

  it('filters frameworks by search query', async () => {
    const frameworks = [
      createMockFramework({ id: 'framework-1', name: 'Alpha Framework' }),
      createMockFramework({ id: 'framework-2', name: 'Beta Framework' }),
    ]

    render(
      <TemplateSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
        frameworks={frameworks}
        testId="test-modal"
      />
    )

    const searchInput = screen.getByTestId('test-modal-search-input')
    await userEvent.type(searchInput, 'Alpha')

    expect(screen.getByTestId('test-modal-framework-section-card-framework-1')).toBeInTheDocument()
    expect(screen.queryByTestId('test-modal-framework-section-card-framework-2')).not.toBeInTheDocument()
  })

  it('shows no results state when search matches nothing', async () => {
    const frameworks = [createMockFramework()]

    render(
      <TemplateSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
        frameworks={frameworks}
        testId="test-modal"
      />
    )

    const searchInput = screen.getByTestId('test-modal-search-input')
    await userEvent.type(searchInput, 'nonexistent')

    expect(screen.getByTestId('test-modal-no-results')).toBeInTheDocument()
    expect(screen.getByText(/No templates found/)).toBeInTheDocument()
  })

  it('clears search when clear button clicked', async () => {
    const frameworks = [createMockFramework()]

    render(
      <TemplateSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
        frameworks={frameworks}
        testId="test-modal"
      />
    )

    const searchInput = screen.getByTestId('test-modal-search-input')
    await userEvent.type(searchInput, 'test')

    const clearButton = screen.getByTestId('test-modal-search-clear')
    await userEvent.click(clearButton)

    expect(searchInput).toHaveValue('')
  })

  it('calls onSelectTemplate when template is selected', async () => {
    const frameworks = [createMockFramework()]

    render(
      <TemplateSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
        frameworks={frameworks}
        testId="test-modal"
      />
    )

    // Navigate to framework detail
    await userEvent.click(screen.getByTestId('test-modal-framework-section-card-framework-1'))

    // Select a template
    await userEvent.click(screen.getByTestId('test-modal-detail-template-template-1-action'))

    expect(mockOnSelectTemplate).toHaveBeenCalledWith('template-1', 'framework-1')
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calls onSelectTemplate for standalone template', async () => {
    const standaloneTemplates = [createMockStandaloneTemplate()]

    render(
      <TemplateSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
        standaloneTemplates={standaloneTemplates}
        testId="test-modal"
      />
    )

    await userEvent.click(screen.getByTestId('test-modal-standalone-section-card-standalone-1'))

    expect(mockOnSelectTemplate).toHaveBeenCalledWith('standalone-1')
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('opens with initial framework selected', () => {
    const frameworks = [createMockFramework()]

    render(
      <TemplateSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
        frameworks={frameworks}
        initialFrameworkId="framework-1"
        testId="test-modal"
      />
    )

    expect(screen.getByTestId('test-modal-detail')).toBeInTheDocument()
  })

  it('closes on Escape key in list view', () => {
    render(
      <TemplateSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
        testId="test-modal"
      />
    )

    fireEvent.keyDown(screen.getByTestId('test-modal'), { key: 'Escape' })
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('goes back on Escape key in detail view', async () => {
    const frameworks = [createMockFramework()]

    render(
      <TemplateSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
        frameworks={frameworks}
        testId="test-modal"
      />
    )

    // Navigate to detail
    await userEvent.click(screen.getByTestId('test-modal-framework-section-card-framework-1'))
    expect(screen.getByTestId('test-modal-detail')).toBeInTheDocument()

    // Press Escape - should go back to list, not close modal
    fireEvent.keyDown(screen.getByTestId('test-modal'), { key: 'Escape' })

    expect(screen.getByTestId('test-modal-framework-section')).toBeInTheDocument()
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('closes on overlay click', async () => {
    render(
      <TemplateSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
        testId="test-modal"
      />
    )

    // Click on overlay (not the modal content)
    await userEvent.click(screen.getByTestId('test-modal'))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('does not close when clicking modal content', async () => {
    render(
      <TemplateSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
        testId="test-modal"
      />
    )

    await userEvent.click(screen.getByTestId('test-modal-content'))
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('shows locked template modal when locked template clicked', async () => {
    const framework = createMockFramework()
    const frameworkSummary = createMockFrameworkSummary({
      unlockStatuses: [
        { templateId: 'template-1', isUnlocked: true, blockedReasons: [] },
        {
          templateId: 'template-2',
          isUnlocked: false,
          blockedReasons: [{ reason: 'prerequisite_not_met' as const }],
        },
      ],
    })

    render(
      <TemplateSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
        frameworks={[framework]}
        frameworkSummaries={[frameworkSummary]}
        testId="test-modal"
      />
    )

    // Navigate to framework detail
    await userEvent.click(screen.getByTestId('test-modal-framework-section-card-framework-1'))

    // Click on locked template
    await userEvent.click(screen.getByTestId('test-modal-detail-template-template-2-action'))

    expect(screen.getByTestId('test-modal-locked-modal')).toBeInTheDocument()
  })

  it('resets state when modal closes', () => {
    const frameworks = [createMockFramework()]

    const { rerender } = render(
      <TemplateSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
        frameworks={frameworks}
        initialSearchQuery="test"
        testId="test-modal"
      />
    )

    // Close modal
    rerender(
      <TemplateSelectionModal
        isOpen={false}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
        frameworks={frameworks}
        initialSearchQuery="test"
        testId="test-modal"
      />
    )

    // Reopen modal
    rerender(
      <TemplateSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectTemplate={mockOnSelectTemplate}
        frameworks={frameworks}
        initialSearchQuery="test"
        testId="test-modal"
      />
    )

    // Should be in list view with initial search query
    expect(screen.getByTestId('test-modal-framework-section')).toBeInTheDocument()
    expect(screen.getByTestId('test-modal-search-input')).toHaveValue('test')
  })
})
