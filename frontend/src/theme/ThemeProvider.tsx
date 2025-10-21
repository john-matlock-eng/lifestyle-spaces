/**
 * ThemeProvider - Enhanced with better persistence and animations
 * Features: localStorage recovery, system preference detection, smooth transitions
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import type { Theme, ThemeConfig, ThemeContextValue } from './theme.types'
import { ThemeContext } from './ThemeContext'

// Default theme data with vibrant teal, purple, and pink accents
const defaultWellnessTheme: Theme = {
  id: 'wellness',
  name: 'Wellness',
  description: 'Vibrant wellness theme with teal, purple, and pink accents',
  category: 'light',
  colors: {
    primary: {
      50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4',
      400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e',
      800: '#115e59', 900: '#134e4a', 950: '#042f2e'
    },
    secondary: {
      50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe',
      400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce',
      800: '#6b21a8', 900: '#581c87', 950: '#3b0764'
    },
    accent: {
      50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4',
      400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d',
      800: '#9d174d', 900: '#831843', 950: '#500724'
    },
    background: {
      base: '#ffffff',
      surface: '#f8fafc',
      elevated: '#ffffff',
      overlay: '#000000',
      overlayOpacity: 0.5
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
      muted: '#94a3b8',
      inverse: '#ffffff',
      link: '#0d9488',
      linkHover: '#0f766e'
    },
    border: {
      base: '#e2e8f0',
      light: '#f1f5f9',
      dark: '#cbd5e1',
      focus: '#14b8a6'
    },
    status: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#0ea5e9'
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
      border: '#e2e8f0',
      focusBorder: '#14b8a6',
      text: '#1e293b',
      placeholder: '#94a3b8',
      disabledBackground: '#f1f5f9',
      errorBorder: '#ef4444',
      height: { sm: '2rem', md: '2.5rem', lg: '3rem' }
    },
    button: {
      primary: {
        background: '#14b8a6', text: '#ffffff', border: '#14b8a6',
        hoverBackground: '#0d9488', hoverText: '#ffffff', hoverBorder: '#0d9488',
        activeBackground: '#0f766e', disabledBackground: '#94a3b8', disabledText: '#ffffff'
      },
      secondary: {
        background: '#f1f5f9', text: '#1e293b', border: '#e2e8f0',
        hoverBackground: '#e2e8f0', hoverText: '#1e293b', hoverBorder: '#cbd5e1',
        activeBackground: '#cbd5e1', disabledBackground: '#f8fafc', disabledText: '#94a3b8'
      },
      outline: {
        background: 'transparent', text: '#14b8a6', border: '#14b8a6',
        hoverBackground: '#14b8a6', hoverText: '#ffffff', hoverBorder: '#14b8a6',
        activeBackground: '#0d9488', disabledBackground: 'transparent', disabledText: '#94a3b8'
      },
      ghost: {
        background: 'transparent', text: '#0d9488', border: 'transparent',
        hoverBackground: '#f0fdfa', hoverText: '#0f766e', hoverBorder: 'transparent',
        activeBackground: '#ccfbf1', disabledBackground: 'transparent', disabledText: '#94a3b8'
      },
      danger: {
        background: '#ef4444', text: '#ffffff', border: '#ef4444',
        hoverBackground: '#dc2626', hoverText: '#ffffff', hoverBorder: '#dc2626',
        activeBackground: '#b91c1c', disabledBackground: '#94a3b8', disabledText: '#ffffff'
      }
    },
    navigation: {
      background: '#ffffff',
      text: '#1e293b',
      activeBackground: '#f0fdfa',
      activeText: '#0d9488',
      hoverBackground: '#f8fafc',
      mobile: {
        background: '#ffffff',
        backdrop: '#000000',
        zIndex: 9999
      }
    },
    modal: {
      backdrop: '#000000',
      background: '#ffffff',
      border: '#e2e8f0',
      shadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      zIndex: 1050
    },
    card: {
      background: '#ffffff',
      border: '#e2e8f0',
      shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
      hoverShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
    }
  },
  metadata: {
    created: new Date('2024-01-01'),
    modified: new Date('2024-01-01'),
    version: '1.0.0',
    tags: ['wellness', 'light', 'vibrant', 'teal', 'purple', 'pink'],
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
    console.log('🔄 [ThemeProvider] darkMode changed to:', darkMode)

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
        }

        // Set initial value
        const systemPrefersDark = mediaQuery.matches || false
        console.log('💻 [ThemeProvider] System prefers dark:', systemPrefersDark)
        setIsDark(systemPrefersDark)

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
      const newIsDark = darkMode === 'dark'
      console.log('⚡ [ThemeProvider] Setting isDark to:', newIsDark)
      setIsDark(newIsDark)
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
      console.log('🌙 [ThemeProvider] Adding dark class to <html>')
      root.classList.add('dark')
    } else {
      console.log('☀️ [ThemeProvider] Removing dark class from <html>')
      root.classList.remove('dark')
    }

    // Log applied theme
    console.log('🎨 [ThemeProvider] Current theme:', currentTheme.id, '- isDark:', isDark)

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
    console.log('🎨 [ThemeProvider] setDarkMode called with:', mode)
    setDarkModeState(mode)
    safeLocalStorage.setItem(finalConfig.darkModeKey, mode)
    console.log('✅ [ThemeProvider] State and localStorage updated')
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
