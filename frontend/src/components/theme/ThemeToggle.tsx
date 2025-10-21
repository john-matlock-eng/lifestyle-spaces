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
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Light mode">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    } else {
      return (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Dark mode">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )
    }
  }

  return (
    <button
      onClick={toggleDarkMode}
      className={`theme-toggle ${className}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0.5rem 0.75rem',
        borderRadius: '0.5rem',
        backgroundColor: 'transparent',
        color: 'var(--theme-text-primary)',
        border: '1px solid var(--theme-border-light)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--theme-bg-elevated)'
        e.currentTarget.style.borderColor = 'var(--theme-primary-500)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
        e.currentTarget.style.borderColor = 'var(--theme-border-light)'
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', width: '20px', height: '20px' }}>
        {getIcon()}
      </span>
      {showLabel && (
        <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  )
}

export default ThemeToggle
