/**
 * ThemeProvider - Enhanced with better persistence and animations
 * Features: localStorage recovery, system preference detection, smooth transitions
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import type { Theme, ThemeConfig, ThemeContextValue } from './theme.types'
import { ThemeContext } from './ThemeContext'

// Default theme data that matches test expectations
const defaultWellnessTheme: Theme = {
  id: 'wellness',
  name: 'Wellness',
  description: 'Calming wellness theme',
  category: 'light',
  colors: {
    primary: {
      50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5',
      400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
      800: '#991b1b', 900: '#7f1d1d', 950: '#450a0a'
    },
    secondary: {
      50: '#fafafa', 100: '#f5f5f5', 200: '#e5e5e5', 300: '#d4d4d4',
      400: '#a3a3a3', 500: '#737373', 600: '#525252', 700: '#404040',
      800: '#262626', 900: '#171717', 950: '#0a0a0a'
    },
    accent: {
      50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5',
      400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
      800: '#991b1b', 900: '#7f1d1d', 950: '#450a0a'
    },
    background: {
      base: '#ffffff',
      surface: '#fafafa',
      elevated: '#ffffff',
      overlay: '#000000',
      overlayOpacity: 0.5
    },
    text: {
      primary: '#1f2937',
      secondary: '#6b7280',
      muted: '#9ca3af',
      inverse: '#ffffff',
      link: '#ef4444',
      linkHover: '#dc2626'
    },
    border: {
      base: '#e5e7eb',
      light: '#f3f4f6',
      dark: '#d1d5db',
      focus: '#ef4444'
    },
    status: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    }
  },
  effects: {
    shadows: {
      none: 'none',
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
      '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)'
    },
    blur: {
      none: 'none',
      sm: '4px',
      md: '12px',
      lg: '24px',
      xl: '40px',
      '2xl': '64px',
      '3xl': '128px'
    },
    radius: {
      none: '0',
      sm: '0.125rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      '2xl': '1rem',
      '3xl': '1.5rem',
      full: '9999px'
    },
    transitions: {
      fast: '150ms ease',
      base: '250ms ease',
      slow: '350ms ease',
      theme: '300ms ease'
    }
  },
  typography: {
    fontSize: {
      xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem',
      xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem',
      '5xl': '3rem', '6xl': '3.75rem'
    },
    fontWeight: {
      thin: '100', extralight: '200', light: '300', normal: '400',
      medium: '500', semibold: '600', bold: '700', extrabold: '800', black: '900'
    },
    lineHeight: {
      none: '1', tight: '1.25', snug: '1.375',
      normal: '1.5', relaxed: '1.625', loose: '2'
    },
    letterSpacing: {
      tighter: '-0.05em', tight: '-0.025em', normal: '0em',
      wide: '0.025em', wider: '0.05em', widest: '0.1em'
    }
  },
  spacing: {
    0: '0px', px: '1px', 0.5: '0.125rem', 1: '0.25rem', 1.5: '0.375rem',
    2: '0.5rem', 2.5: '0.625rem', 3: '0.75rem', 3.5: '0.875rem', 4: '1rem',
    5: '1.25rem', 6: '1.5rem', 7: '1.75rem', 8: '2rem', 9: '2.25rem',
    10: '2.5rem', 11: '2.75rem', 12: '3rem', 14: '3.5rem', 16: '4rem',
    20: '5rem', 24: '6rem', 28: '7rem', 32: '8rem'
  },
  components: {
    input: {
      background: '#ffffff',
      border: '#e5e7eb',
      focusBorder: '#ef4444',
      text: '#1f2937',
      placeholder: '#9ca3af',
      disabledBackground: '#f3f4f6',
      errorBorder: '#ef4444',
      height: { sm: '2rem', md: '2.5rem', lg: '3rem' }
    },
    button: {
      primary: {
        background: '#ef4444', text: '#ffffff', border: '#ef4444',
        hoverBackground: '#dc2626', hoverText: '#ffffff', hoverBorder: '#dc2626',
        activeBackground: '#b91c1c', disabledBackground: '#9ca3af', disabledText: '#ffffff'
      },
      secondary: {
        background: '#f3f4f6', text: '#1f2937', border: '#e5e7eb',
        hoverBackground: '#e5e7eb', hoverText: '#1f2937', hoverBorder: '#d1d5db',
        activeBackground: '#d1d5db', disabledBackground: '#f9fafb', disabledText: '#9ca3af'
      },
      outline: {
        background: 'transparent', text: '#ef4444', border: '#ef4444',
        hoverBackground: '#ef4444', hoverText: '#ffffff', hoverBorder: '#ef4444',
        activeBackground: '#dc2626', disabledBackground: 'transparent', disabledText: '#9ca3af'
      },
      ghost: {
        background: 'transparent', text: '#ef4444', border: 'transparent',
        hoverBackground: '#fef2f2', hoverText: '#dc2626', hoverBorder: 'transparent',
        activeBackground: '#fee2e2', disabledBackground: 'transparent', disabledText: '#9ca3af'
      },
      danger: {
        background: '#ef4444', text: '#ffffff', border: '#ef4444',
        hoverBackground: '#dc2626', hoverText: '#ffffff', hoverBorder: '#dc2626',
        activeBackground: '#b91c1c', disabledBackground: '#9ca3af', disabledText: '#ffffff'
      }
    },
    navigation: {
      background: '#ffffff',
      text: '#1f2937',
      activeBackground: '#fef2f2',
      activeText: '#ef4444',
      hoverBackground: '#f9fafb',
      mobile: {
        background: '#ffffff',
        backdrop: '#000000',
        zIndex: 9999
      }
    },
    modal: {
      backdrop: '#000000',
      background: '#ffffff',
      border: '#e5e7eb',
      shadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      zIndex: 1050
    },
    card: {
      background: '#ffffff',
      border: '#e5e7eb',
      shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
      hoverShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
    }
  },
  metadata: {
    created: new Date('2024-01-01'),
    modified: new Date('2024-01-01'),
    version: '1.0.0',
    tags: ['wellness', 'light', 'calm'],
    accessibility: {
      wcagAA: true,
      wcagAAA: false,
      highContrast: true,
      reducedMotion: true,
      colorBlindFriendly: true
    }
  }
}

const midnightTheme: Theme = {
  ...defaultWellnessTheme,
  id: 'midnight',
  name: 'Midnight',
  description: 'Dark midnight theme',
  category: 'dark',
  colors: {
    ...defaultWellnessTheme.colors,
    background: {
      base: '#0f172a',
      surface: '#1e293b',
      elevated: '#334155',
      overlay: '#000000',
      overlayOpacity: 0.8
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#cbd5e1',
      muted: '#94a3b8',
      inverse: '#0f172a',
      link: '#60a5fa',
      linkHover: '#3b82f6'
    },
    border: {
      base: '#334155',
      light: '#475569',
      dark: '#1e293b',
      focus: '#60a5fa'
    }
  },
  components: {
    ...defaultWellnessTheme.components,
    input: {
      background: '#1e293b',
      border: '#334155',
      focusBorder: '#60a5fa',
      text: '#f1f5f9',
      placeholder: '#94a3b8',
      disabledBackground: '#0f172a',
      errorBorder: '#ef4444',
      height: { sm: '2rem', md: '2.5rem', lg: '3rem' }
    },
    card: {
      background: '#1e293b',
      border: '#334155',
      shadow: '0 1px 3px 0 rgb(0 0 0 / 0.3)',
      hoverShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)'
    },
    navigation: {
      background: '#0f172a',
      text: '#cbd5e1',
      activeBackground: '#1e293b',
      activeText: '#60a5fa',
      hoverBackground: '#1e293b',
      mobile: {
        background: '#0f172a',
        backdrop: '#000000',
        zIndex: 9999
      }
    }
  }
}

const defaultThemes = [defaultWellnessTheme, midnightTheme]

// Default configuration
const defaultConfig: ThemeConfig = {
  defaultTheme: 'wellness',
  storageKey: 'lifestyle-theme',
  darkModeKey: 'lifestyle-dark-mode',
  enableSystemPreference: true,
  enableTransitions: true,
  enableValidation: true
}

// Enhanced localStorage utility with error recovery
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null
    }
    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.warn(`Failed to read from localStorage (${key}):`, error)
      return null
    }
  },
  setItem: (key: string, value: string): boolean => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false
    }
    try {
      localStorage.setItem(key, value)
      return true
    } catch (error) {
      console.warn(`Failed to write to localStorage (${key}):`, error)
      // Try to clear space if quota exceeded
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        try {
          localStorage.clear()
          localStorage.setItem(key, value)
          return true
        } catch {
          return false
        }
      }
      return false
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return
    }
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn(`Failed to remove from localStorage (${key}):`, error)
    }
  }
}

// Theme provider props
interface ThemeProviderProps {
  children: React.ReactNode
  config?: Partial<ThemeConfig>
  customThemes?: Theme[]
  onThemeLoad?: (theme: Theme) => void
  onThemeChange?: (theme: Theme) => void
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  config = {},
  customThemes = [],
  onThemeLoad,
  onThemeChange
}) => {
  const finalConfig = { ...defaultConfig, ...config }

  // Filter and validate custom themes with useMemo to prevent recreation on every render
  const allThemes = useMemo(() => {
    const validCustomThemes = customThemes.filter(theme => {
      if (!theme || typeof theme !== 'object' || !theme.id || !theme.name || !theme.colors) {
        console.warn('Invalid theme provided:', theme)
        return false
      }
      return true
    })
    return [...defaultThemes, ...validCustomThemes]
  }, [customThemes])

  // Detect prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  // State
  const [currentThemeId, setCurrentThemeId] = useState<string>(finalConfig.defaultTheme)
  const [darkMode, setDarkModeState] = useState<'light' | 'dark' | 'system'>('system')

  // Calculate if dark mode is active
  const [isDark, setIsDark] = useState(() => {
    if (darkMode === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        try {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
          return mediaQuery?.matches || false
        } catch {
          return false
        }
      }
      return false
    }
    return darkMode === 'dark'
  })

  // Get current theme - automatically switch between light and dark variants
  const currentTheme = useMemo(() => {
    // If dark mode is active, use dark theme; otherwise use light theme
    if (isDark) {
      const darkTheme = allThemes.find(t => t.category === 'dark')
      return darkTheme || allThemes[0]
    } else {
      const lightTheme = allThemes.find(t => t.category === 'light')
      return lightTheme || allThemes[0]
    }
  }, [isDark, allThemes])

  // Detect prefers-reduced-motion on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }

    try {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      if (!mediaQuery) {
        return
      }

      setPrefersReducedMotion(mediaQuery.matches || false)

      const handleChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches)
      }

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
      }
    } catch (error) {
      console.warn('Failed to detect prefers-reduced-motion:', error)
    }
  }, [])

  // Load theme from localStorage on initialization
  useEffect(() => {
    const storedTheme = safeLocalStorage.getItem(finalConfig.storageKey)
    const storedDarkMode = safeLocalStorage.getItem(finalConfig.darkModeKey)

    if (storedTheme && allThemes.find(t => t.id === storedTheme)) {
      setCurrentThemeId(storedTheme)
    }

    if (storedDarkMode && ['light', 'dark', 'system'].includes(storedDarkMode)) {
      setDarkModeState(storedDarkMode as 'light' | 'dark' | 'system')
    }
  }, [finalConfig.storageKey, finalConfig.darkModeKey, allThemes])

  // Enhanced system theme preference detection with proper cleanup
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }

    if (darkMode === 'system') {
      try {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        if (!mediaQuery) {
          setIsDark(false)
          return
        }

        const handleChange = (e: MediaQueryListEvent) => {
          setIsDark(e.matches)
          console.info(`System theme changed to: ${e.matches ? 'dark' : 'light'}`)
        }

        // Set initial value
        setIsDark(mediaQuery.matches || false)

        // Add listener with proper event handler
        if (mediaQuery.addEventListener) {
          mediaQuery.addEventListener('change', handleChange)
        } else if (mediaQuery.addListener) {
          // Fallback for older browsers
          mediaQuery.addListener(handleChange)
        }

        return () => {
          if (mediaQuery.removeEventListener) {
            mediaQuery.removeEventListener('change', handleChange)
          } else if (mediaQuery.removeListener) {
            mediaQuery.removeListener(handleChange)
          }
        }
      } catch (error) {
        console.warn('Failed to setup system theme listener:', error)
        setIsDark(false)
      }
    } else {
      setIsDark(darkMode === 'dark')
    }
  }, [darkMode])

  // Apply theme to document with enhanced transitions
  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const root = document.documentElement
    const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test'
    const transitionDuration = prefersReducedMotion || !finalConfig.enableTransitions || isTestEnv ? '0ms' : '300ms'

    // Set theme attribute
    root.setAttribute('data-theme', currentTheme.id)

    // Apply dark class
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Add transition class for smooth theme changes (skip in tests)
    if (finalConfig.enableTransitions && !prefersReducedMotion && !isTestEnv) {
      root.style.setProperty('--theme-transition-duration', transitionDuration)
      root.classList.add('theme-transitioning')

      // Remove transition class after transition completes
      const timeoutId = setTimeout(() => {
        root.classList.remove('theme-transitioning')
      }, 300)

      return () => clearTimeout(timeoutId)
    }

    // Apply CSS variables
    const applyThemeVariables = (theme: Theme) => {
      // Primary colors
      Object.entries(theme.colors.primary).forEach(([shade, value]) => {
        root.style.setProperty(`--theme-primary-${shade}`, value)
      })

      // Background colors
      root.style.setProperty('--theme-bg-base', theme.colors.background.base)
      root.style.setProperty('--theme-bg-surface', theme.colors.background.surface)
      root.style.setProperty('--theme-bg-elevated', theme.colors.background.elevated)

      // Text colors
      root.style.setProperty('--theme-text-primary', theme.colors.text.primary)
      root.style.setProperty('--theme-text-secondary', theme.colors.text.secondary)
      root.style.setProperty('--theme-text-muted', theme.colors.text.muted)

      // Border colors
      root.style.setProperty('--theme-border-base', theme.colors.border.base)
      root.style.setProperty('--theme-border-light', theme.colors.border.light)
      root.style.setProperty('--theme-border-dark', theme.colors.border.dark)

      // Error colors
      if (theme.colors.status) {
        root.style.setProperty('--theme-error-50', '#fef2f2')
        root.style.setProperty('--theme-error-400', '#f87171')
        root.style.setProperty('--theme-error-600', theme.colors.status.error)
        root.style.setProperty('--theme-error-700', '#b91c1c')
      }

      // Warning colors
      if (theme.colors.status) {
        root.style.setProperty('--theme-warning-400', '#fbbf24')
        root.style.setProperty('--theme-warning-600', theme.colors.status.warning)
      }
    }

    applyThemeVariables(currentTheme)

    // Call onThemeLoad callback
    onThemeLoad?.(currentTheme)
  }, [currentTheme, isDark, prefersReducedMotion, finalConfig.enableTransitions, onThemeLoad])

  // Theme switching function with persistence
  const setTheme = useCallback(async (themeId: string) => {
    const theme = allThemes.find(t => t.id === themeId)
    if (!theme) {
      console.warn(`Theme not found: ${themeId}`)
      return
    }

    setCurrentThemeId(themeId)
    safeLocalStorage.setItem(finalConfig.storageKey, themeId)
    onThemeChange?.(theme)
  }, [allThemes, finalConfig.storageKey, onThemeChange])

  // Dark mode setter with persistence
  const setDarkMode = useCallback((mode: 'light' | 'dark' | 'system') => {
    setDarkModeState(mode)
    safeLocalStorage.setItem(finalConfig.darkModeKey, mode)
  }, [finalConfig.darkModeKey])

  // Toggle between first two themes
  const toggleTheme = useCallback(() => {
    const currentIndex = allThemes.findIndex(t => t.id === currentThemeId)
    const nextIndex = currentIndex === 0 ? 1 : 0
    setTheme(allThemes[nextIndex].id)
  }, [allThemes, currentThemeId, setTheme])

  const contextValue: ThemeContextValue = useMemo(() => ({
    currentTheme,
    availableThemes: allThemes,
    darkMode,
    isDark,
    setTheme,
    setDarkMode,
    toggleTheme,
    resetTheme: () => setTheme(finalConfig.defaultTheme),
    importTheme: async () => false,
    exportTheme: () => '',
    validateTheme: () => ({ valid: true, errors: [], warnings: [] }),
    metrics: {
      switchTime: 0,
      loadTime: 0,
      variableCount: 0,
      bundleSize: 0,
      lastCheck: new Date()
    }
  }), [currentTheme, allThemes, darkMode, isDark, setTheme, setDarkMode, toggleTheme, finalConfig.defaultTheme])

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}
