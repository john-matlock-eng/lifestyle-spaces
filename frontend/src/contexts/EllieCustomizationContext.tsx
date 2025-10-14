import React, { useState, useEffect } from 'react'
import { EllieCustomizationContext, type EllieCustomization } from './EllieCustomizationContext'

const STORAGE_KEY = 'ellie-customization'

const DEFAULT_CUSTOMIZATION: EllieCustomization = {
  furColor: undefined,
  collarStyle: 'none',
  collarColor: '#8B4513',
  collarTag: false
}

export const EllieCustomizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customization, setCustomization] = useState<EllieCustomization>(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return DEFAULT_CUSTOMIZATION
      }
    }
    return DEFAULT_CUSTOMIZATION
  })

  // Save to localStorage whenever customization changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customization))
  }, [customization])

  const updateCustomization = (updates: Partial<EllieCustomization>) => {
    setCustomization(prev => ({ ...prev, ...updates }))
  }

  const resetCustomization = () => {
    setCustomization(DEFAULT_CUSTOMIZATION)
  }

  return (
    <EllieCustomizationContext.Provider value={{ customization, updateCustomization, resetCustomization }}>
      {children}
    </EllieCustomizationContext.Provider>
  )
}
