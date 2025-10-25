import React from 'react'
import '../../styles/sections.css'

interface ScaleSectionProps {
  value: number | string
  onChange: (value: number) => void
  placeholder?: string
  disabled?: boolean
  config?: {
    min?: number
    max?: number
    labels?: Record<string, string>
  }
}

export const ScaleSection: React.FC<ScaleSectionProps> = ({
  value,
  onChange,
  placeholder = "Select a value",
  disabled = false,
  config = {}
}) => {
  const min = config.min ?? 1
  const max = config.max ?? 10
  const numValue = typeof value === 'number' ? value : parseInt(String(value)) || min

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(e.target.value))
  }

  const getLabel = (val: number): string => {
    if (config.labels) {
      return config.labels[String(val)] || String(val)
    }
    return String(val)
  }

  return (
    <div className="scale-section">
      <div className="scale-container">
        <div className="scale-value-display">
          {numValue} / {max}
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={numValue}
          onChange={handleChange}
          className="scale-slider"
          disabled={disabled}
          aria-label={placeholder}
        />
        <div className="scale-labels">
          <span className="scale-label-min">{getLabel(min)}</span>
          <span className="scale-label-max">{getLabel(max)}</span>
        </div>
      </div>
    </div>
  )
}
