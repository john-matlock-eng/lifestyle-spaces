import { useState, useEffect } from 'react'

export interface EllieCustomization {
  furColor?: string
  collarStyle: 'none' | 'leather' | 'fabric' | 'bowtie' | 'bandana'
  collarColor: string
  collarTag: boolean
}

const STORAGE_KEY = 'ellie-customization'

const DEFAULT_CUSTOMIZATION: EllieCustomization = {
  furColor: undefined,
  collarStyle: 'none',
  collarColor: '#8B4513',
  collarTag: false
}

export const useEllieCustomization = () => {
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

  return {
    customization,
    updateCustomization,
    resetCustomization
  }
}
