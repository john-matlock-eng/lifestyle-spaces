import { useTheme } from '../../theme/useTheme'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

export function ThemeToggle({ className = '', showLabel = true }: ThemeToggleProps) {
  const { darkMode, setDarkMode, isDark } = useTheme()

  const toggleDarkMode = () => {
    if (darkMode === 'system') {
      setDarkMode(isDark ? 'light' : 'dark')
    } else {
      setDarkMode(darkMode === 'light' ? 'dark' : 'light')
    }
  }

  const getIcon = () => {
    if (isDark) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Light mode">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    } else {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Dark mode">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )
    }
  }

  return (
    <button
      onClick={toggleDarkMode}
      className={`flex items-center px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${className}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {getIcon()}
      {showLabel && (
        <span className="ml-2 text-sm font-medium">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  )
}

export default ThemeToggle
