import React, { useState } from 'react';
import './ScaleInput.css';

export type ScaleType = 'scale_1_7' | 'scale_0_10' | 'scale_custom';

export interface ScaleConfig {
  minValue: number;
  maxValue: number;
  minLabel?: string;
  maxLabel?: string;
  step?: number;
}

interface ScaleInputProps {
  id: string;
  name: string;
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  scaleType: ScaleType;
  scaleConfig?: ScaleConfig;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

const DEFAULT_SCALES: Record<Exclude<ScaleType, 'scale_custom'>, ScaleConfig> = {
  scale_1_7: {
    minValue: 1,
    maxValue: 7,
    minLabel: 'Very Low',
    maxLabel: 'Very High',
    step: 1,
  },
  scale_0_10: {
    minValue: 0,
    maxValue: 10,
    minLabel: 'Poor',
    maxLabel: 'Excellent',
    step: 1,
  },
};

export const ScaleInput: React.FC<ScaleInputProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  scaleType,
  scaleConfig: customScaleConfig,
  helpText,
  required = false,
  disabled = false,
  error,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  // Determine scale configuration
  const scaleConfig =
    scaleType === 'scale_custom'
      ? customScaleConfig!
      : DEFAULT_SCALES[scaleType];

  const { minValue, maxValue, minLabel, maxLabel, step = 1 } = scaleConfig;

  // Generate scale points
  const scalePoints = [];
  for (let i = minValue; i <= maxValue; i += step) {
    scalePoints.push(i);
  }

  const handleClick = (clickedValue: number) => {
    if (!disabled) {
      onChange(clickedValue);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      onChange(Number(e.target.value));
    }
  };

  const getPointClass = (pointValue: number) => {
    const classes = ['scale-point'];
    if (value !== null && pointValue === value) {
      classes.push('selected');
    } else if (value !== null && pointValue < value) {
      classes.push('filled');
    }
    if (disabled) {
      classes.push('disabled');
    }
    return classes.join(' ');
  };

  return (
    <div className={`scale-input ${error ? 'has-error' : ''}`}>
      <div className="scale-input-header">
        <label htmlFor={id} className="scale-label">
          {label}
          {required && <span className="required-indicator" aria-label="required"> *</span>}
        </label>
        {value !== null && (
          <span className="scale-value" aria-live="polite">
            {value}
          </span>
        )}
      </div>

      {helpText && (
        <div className="scale-help-text">
          <span className="help-icon">💡</span>
          {helpText}
        </div>
      )}

      <div className="scale-container">
        {/* Labels */}
        <div className="scale-labels">
          {minLabel && <span className="scale-label-min">{minLabel}</span>}
          {maxLabel && <span className="scale-label-max">{maxLabel}</span>}
        </div>

        {/* Visual scale points */}
        <div
          className="scale-points"
          role="radiogroup"
          aria-labelledby={id}
          aria-describedby={helpText ? `${id}-help` : undefined}
        >
          {scalePoints.map((pointValue) => (
            <button
              key={pointValue}
              type="button"
              role="radio"
              aria-checked={value === pointValue}
              aria-label={`${label}: ${pointValue}`}
              className={getPointClass(pointValue)}
              onClick={() => handleClick(pointValue)}
              disabled={disabled}
              tabIndex={value === pointValue ? 0 : -1}
            >
              <span className="point-circle" />
              <span className="point-label">{pointValue}</span>
            </button>
          ))}
        </div>

        {/* Hidden range slider for accessibility and smooth interaction */}
        <input
          type="range"
          id={id}
          name={name}
          min={minValue}
          max={maxValue}
          step={step}
          value={value ?? minValue}
          onChange={handleSliderChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          disabled={disabled}
          className="scale-slider"
          aria-label={label}
          aria-describedby={helpText ? `${id}-help` : undefined}
          required={required}
        />

        {/* Visual slider track */}
        <div className="scale-track">
          <div
            className="scale-track-fill"
            style={{
              width: value !== null
                ? `${((value - minValue) / (maxValue - minValue)) * 100}%`
                : '0%',
            }}
          />
        </div>
      </div>

      {/* Number labels below scale */}
      <div className="scale-numbers">
        {scalePoints.map((pointValue, index) => (
          <span
            key={pointValue}
            className={`scale-number ${value === pointValue ? 'active' : ''}`}
          >
            {pointValue}
          </span>
        ))}
      </div>

      {error && (
        <div className="scale-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

export default ScaleInput;
