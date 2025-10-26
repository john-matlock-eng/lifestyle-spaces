/**
 * ScaleSectionDisplay - Read-only display component for Scale/Slider sections
 *
 * Note: Scale sections display numeric values and don't support highlighting
 * since there's no text content to highlight.
 */
import React from 'react';

interface ScaleSectionDisplayProps {
  value: number | string;
  config?: {
    min?: number;
    max?: number;
    labels?: Record<string, string>;
  };
  className?: string;
}

export const ScaleSectionDisplay: React.FC<ScaleSectionDisplayProps> = ({
  value,
  config = {},
  className = ''
}) => {
  const { min = 0, max = 10, labels = {} } = config;
  const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;

  // Validate value is a number
  if (isNaN(numericValue)) {
    return (
      <div className={`scale-section-display ${className}`}>
        <div className="scale-error">Invalid scale value</div>
      </div>
    );
  }

  return (
    <div className={`scale-section-display ${className}`}>
      <div className="scale-value-display">
        <span className="scale-value-number">{numericValue}</span>
        <span className="scale-value-range">/ {max}</span>
      </div>
      {labels[numericValue] && (
        <div className="scale-value-label">{labels[numericValue]}</div>
      )}
      <div className="scale-visual">
        <div
          className="scale-fill"
          style={{ width: `${((numericValue - min) / (max - min)) * 100}%` }}
        />
      </div>
    </div>
  );
};
