import React, { useState, useEffect } from 'react';

interface EllieCustomizerProps {
  onCustomizationChange?: (customization: EllieCustomization) => void;
}

export interface EllieCustomization {
  collarStyle: "leather" | "fabric" | "chain" | "bowtie" | "bandana";
  collarColor: string;
  collarTag: boolean;
  size: "sm" | "md" | "lg";
}

const COLLAR_STYLES = [
  { value: "leather", label: "Leather", icon: "🦴" },
  { value: "fabric", label: "Fabric", icon: "🎀" },
  { value: "chain", label: "Chain", icon: "⛓️" },
  { value: "bowtie", label: "Bowtie", icon: "🎀" },
  { value: "bandana", label: "Bandana", icon: "🧣" },
] as const;

const COLLAR_COLORS = [
  { value: "#8B4513", label: "Brown" },
  { value: "#FF0000", label: "Red" },
  { value: "#0000FF", label: "Blue" },
  { value: "#00FF00", label: "Green" },
  { value: "#FFC0CB", label: "Pink" },
  { value: "#FFD700", label: "Gold" },
  { value: "#800080", label: "Purple" },
  { value: "#000000", label: "Black" },
];

const SIZES = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
] as const;

const STORAGE_KEY = 'ellie-customization';

export const EllieCustomizer: React.FC<EllieCustomizerProps> = ({ onCustomizationChange }) => {
  const [customization, setCustomization] = useState<EllieCustomization>(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fall through to defaults
      }
    }
    return {
      collarStyle: "leather",
      collarColor: "#8B4513",
      collarTag: false,
      size: "md",
    };
  });

  // Save to localStorage whenever customization changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customization));
    if (onCustomizationChange) {
      onCustomizationChange(customization);
    }
  }, [customization, onCustomizationChange]);

  const updateCustomization = (updates: Partial<EllieCustomization>) => {
    setCustomization(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="ellie-customizer">
      <div className="customizer-header">
        <h3 className="text-lg font-semibold mb-4">🐾 Customize Ellie</h3>
      </div>

      <div className="customizer-section">
        <label className="customizer-label">Size</label>
        <div className="size-options">
          {SIZES.map((size) => (
            <button
              key={size.value}
              className={`size-button ${customization.size === size.value ? 'active' : ''}`}
              onClick={() => updateCustomization({ size: size.value })}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>

      <div className="customizer-section">
        <label className="customizer-label">Collar Style</label>
        <div className="collar-style-grid">
          {COLLAR_STYLES.map((style) => (
            <button
              key={style.value}
              className={`collar-style-button ${customization.collarStyle === style.value ? 'active' : ''}`}
              onClick={() => updateCustomization({ collarStyle: style.value as any })}
              title={style.label}
            >
              <span className="text-2xl">{style.icon}</span>
              <span className="text-xs mt-1">{style.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="customizer-section">
        <label className="customizer-label">Collar Color</label>
        <div className="collar-color-grid">
          {COLLAR_COLORS.map((color) => (
            <button
              key={color.value}
              className={`collar-color-button ${customization.collarColor === color.value ? 'active' : ''}`}
              style={{ backgroundColor: color.value }}
              onClick={() => updateCustomization({ collarColor: color.value })}
              title={color.label}
            />
          ))}
        </div>
      </div>

      <div className="customizer-section">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={customization.collarTag}
            onChange={(e) => updateCustomization({ collarTag: e.target.checked })}
            className="checkbox"
          />
          <span className="customizer-label mb-0">Show Name Tag</span>
        </label>
      </div>

      <style>{`
        .ellie-customizer {
          padding: 1rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          max-width: 320px;
        }

        .customizer-header {
          border-bottom: 2px solid #f0f0f0;
          padding-bottom: 0.75rem;
          margin-bottom: 1rem;
        }

        .customizer-section {
          margin-bottom: 1.5rem;
        }

        .customizer-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .size-options {
          display: flex;
          gap: 0.5rem;
        }

        .size-button {
          flex: 1;
          padding: 0.5rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .size-button:hover {
          border-color: #9ca3af;
        }

        .size-button.active {
          border-color: #8B4513;
          background: #fef3c7;
          color: #8B4513;
        }

        .collar-style-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }

        .collar-style-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .collar-style-button:hover {
          border-color: #9ca3af;
          transform: translateY(-2px);
        }

        .collar-style-button.active {
          border-color: #8B4513;
          background: #fef3c7;
          box-shadow: 0 4px 6px rgba(139, 69, 19, 0.1);
        }

        .collar-color-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
        }

        .collar-color-button {
          width: 100%;
          aspect-ratio: 1;
          border: 3px solid transparent;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
        }

        .collar-color-button:hover {
          transform: scale(1.1);
        }

        .collar-color-button.active {
          border-color: #8B4513;
          box-shadow: 0 0 0 2px white, 0 0 0 4px #8B4513;
        }

        .checkbox {
          width: 1.25rem;
          height: 1.25rem;
          border: 2px solid #d1d5db;
          border-radius: 4px;
          cursor: pointer;
        }

        .checkbox:checked {
          background-color: #8B4513;
          border-color: #8B4513;
        }
      `}</style>
    </div>
  );
};

export default EllieCustomizer;
