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
  const { min = 1, max = 10, labels = {} } = config;
  const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;

  // Validate value is a number
  if (isNaN(numericValue) || numericValue === undefined || numericValue === null) {
    return (
      <div className={`scale-section-display ${className}`}>
        <div className="scale-error">Invalid scale value</div>
      </div>
    );
  }

  const getLabel = (val: number): string => {
    if (labels && labels[String(val)]) {
      return labels[String(val)];
    }
    return String(val);
  };

  return (
    <div className={`scale-section-display ${className}`}>
      <div className="scale-value-display">
        <span className="scale-value-number">{numericValue}</span>
        <span className="scale-value-range">/ {max}</span>
      </div>
      {labels[String(numericValue)] && (
        <div className="scale-value-label">{labels[String(numericValue)]}</div>
      )}
      <div className="scale-visual">
        <div
          className="scale-fill"
          style={{ width: `${((numericValue - min) / (max - min)) * 100}%` }}
        />
      </div>
      <div className="scale-labels">
        <span className="scale-label-min">{getLabel(min)}</span>
        <span className="scale-label-max">{getLabel(max)}</span>
      </div>
    </div>
  );
};
