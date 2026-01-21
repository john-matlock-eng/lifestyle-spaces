import React, { useState, useEffect, useCallback } from 'react'
import { EllieCustomizationContext, type EllieCustomization } from './EllieCustomizationContext'
import { useAuth } from '../stores/authStore'
import { apiService } from '../services/api'

const STORAGE_KEY = 'ellie-customization'

const DEFAULT_CUSTOMIZATION: EllieCustomization = {
  petName: 'Lily',
  furColor: '#FFFFFF',
  furPattern: 'parti',
  accentColor: '#000000',
  collarStyle: 'none',
  collarColor: '#8B4513',
  collarTag: false
}

// Migrate old customization format to new format
const migrateCustomization = (saved: Partial<EllieCustomization>): EllieCustomization => {
  return {
    petName: saved.petName ?? DEFAULT_CUSTOMIZATION.petName,
    furColor: saved.furColor ?? DEFAULT_CUSTOMIZATION.furColor,
    furPattern: saved.furPattern ?? DEFAULT_CUSTOMIZATION.furPattern,
    accentColor: saved.accentColor ?? DEFAULT_CUSTOMIZATION.accentColor,
    collarStyle: saved.collarStyle ?? DEFAULT_CUSTOMIZATION.collarStyle,
    collarColor: saved.collarColor ?? DEFAULT_CUSTOMIZATION.collarColor,
    collarTag: saved.collarTag ?? DEFAULT_CUSTOMIZATION.collarTag,
  }
}

export const EllieCustomizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth()
  const [customization, setCustomization] = useState<EllieCustomization>(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return migrateCustomization(parsed)
      } catch {
        return DEFAULT_CUSTOMIZATION
      }
    }
    return DEFAULT_CUSTOMIZATION
  })
  const [hasSyncedFromBackend, setHasSyncedFromBackend] = useState(false)

  // Save to localStorage whenever customization changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customization))
  }, [customization])

  // Load from backend when authenticated
  useEffect(() => {
    const loadFromBackend = async () => {
      if (!isAuthenticated || hasSyncedFromBackend) return

      try {
        const response = await apiService.get<{ pet_settings?: {
          pet_name?: string
          fur_color?: string
          fur_pattern?: string
          accent_color?: string
          collar_style?: string
          collar_color?: string
          collar_tag?: boolean
        } }>('/api/user/profile')

        if (response.pet_settings) {
          const backendSettings = response.pet_settings
          setCustomization(prev => ({
            petName: backendSettings.pet_name ?? prev.petName,
            furColor: backendSettings.fur_color ?? prev.furColor,
            furPattern: (backendSettings.fur_pattern as 'solid' | 'parti') ?? prev.furPattern,
            accentColor: backendSettings.accent_color ?? prev.accentColor,
            collarStyle: (backendSettings.collar_style as EllieCustomization['collarStyle']) ?? prev.collarStyle,
            collarColor: backendSettings.collar_color ?? prev.collarColor,
            collarTag: backendSettings.collar_tag ?? prev.collarTag,
          }))
        }
        setHasSyncedFromBackend(true)
      } catch {
        // Silently fail - use localStorage values
        setHasSyncedFromBackend(true)
      }
    }

    loadFromBackend()
  }, [isAuthenticated, hasSyncedFromBackend])

  // Save to backend (debounced)
  const saveToBackend = useCallback(async (settings: EllieCustomization) => {
    if (!isAuthenticated) return

    try {
      await apiService.put('/api/user/profile', {
        pet_settings: {
          pet_name: settings.petName,
          fur_color: settings.furColor,
          fur_pattern: settings.furPattern,
          accent_color: settings.accentColor,
          collar_style: settings.collarStyle,
          collar_color: settings.collarColor,
          collar_tag: settings.collarTag,
        }
      })
    } catch {
      // Silently fail - localStorage is the fallback
    }
  }, [isAuthenticated])

  const updateCustomization = useCallback((updates: Partial<EllieCustomization>) => {
    setCustomization(prev => {
      const newCustomization = { ...prev, ...updates }
      // Save to backend after state update
      if (isAuthenticated && hasSyncedFromBackend) {
        saveToBackend(newCustomization)
      }
      return newCustomization
    })
  }, [isAuthenticated, hasSyncedFromBackend, saveToBackend])

  const resetCustomization = useCallback(() => {
    setCustomization(DEFAULT_CUSTOMIZATION)
    if (isAuthenticated) {
      saveToBackend(DEFAULT_CUSTOMIZATION)
    }
  }, [isAuthenticated, saveToBackend])

  return (
    <EllieCustomizationContext.Provider value={{ customization, updateCustomization, resetCustomization }}>
      {children}
    </EllieCustomizationContext.Provider>
  )
}
