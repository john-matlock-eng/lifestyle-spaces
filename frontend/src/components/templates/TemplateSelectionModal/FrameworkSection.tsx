/**
 * FrameworkSection Component
 *
 * Section component that displays a grid of framework cards.
 * Includes section header and empty state handling.
 *
 * @module templates/TemplateSelectionModal/FrameworkSection
 */

import { FrameworkCard } from './FrameworkCard'
import type { FrameworkSectionProps } from './types'
import './template-selection-modal.css'

/**
 * Section displaying available frameworks
 *
 * Features:
 * - "FRAMEWORKS" header
 * - Grid layout of FrameworkCard components
 * - Empty state when no frameworks available
 * - Responsive grid adjustments
 *
 * @example
 * ```tsx
 * <FrameworkSection
 *   frameworks={frameworkDisplayData}
 *   onFrameworkClick={(id) => setSelectedFramework(id)}
 *   testIdPrefix="modal"
 * />
 * ```
 */
export function FrameworkSection({
  frameworks,
  onFrameworkClick,
  testIdPrefix,
}: FrameworkSectionProps) {
  const baseTestId = testIdPrefix ? `${testIdPrefix}-framework-section` : 'framework-section'

  return (
    <section
      className="framework-section"
      aria-labelledby={`${baseTestId}-heading`}
      data-testid={baseTestId}
    >
      {/* Section Header */}
      <h2
        id={`${baseTestId}-heading`}
        className="framework-section__header"
        data-testid={`${baseTestId}-header`}
      >
        FRAMEWORKS
      </h2>

      {/* Framework Grid or Empty State */}
      {frameworks.length > 0 ? (
        <div
          className="framework-section__grid"
          role="list"
          data-testid={`${baseTestId}-grid`}
        >
          {frameworks.map((frameworkData) => (
            <div key={frameworkData.framework.id} role="listitem">
              <FrameworkCard
                framework={frameworkData}
                onClick={() => onFrameworkClick(frameworkData.framework.id)}
                testId={`${baseTestId}-card-${frameworkData.framework.id}`}
              />
            </div>
          ))}
        </div>
      ) : (
        <div
          className="framework-section__empty"
          data-testid={`${baseTestId}-empty`}
        >
          <div className="framework-section__empty-icon" aria-hidden="true">
            📚
          </div>
          <p className="framework-section__empty-text">
            No frameworks available
          </p>
          <p className="framework-section__empty-subtext">
            Check back later for new frameworks to explore
          </p>
        </div>
      )}
    </section>
  )
}

export default FrameworkSection
