import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Menu,
  X,
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  ChevronDown,
  Home,
  Users,
  Monitor
} from 'lucide-react'
import { useAuth } from '../../stores/authStore'
import { useTheme } from '../../theme/useTheme'

export const AppHeader: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { darkMode, setDarkMode } = useTheme()

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Spaces', href: '/spaces', icon: Users },
  ]

  interface MenuItem {
    label?: string
    icon?: typeof User
    onClick?: () => void
    className?: string
    type?: 'divider' | 'theme-section'
    isActive?: boolean
  }

  const profileMenuItems: MenuItem[] = [
    {
      label: 'Profile',
      icon: User,
      onClick: () => {
        navigate('/profile')
        setIsProfileMenuOpen(false)
      }
    },
    {
      label: 'Settings',
      icon: Settings,
      onClick: () => {
        navigate('/settings')
        setIsProfileMenuOpen(false)
      }
    },
    { type: 'divider' },
    { type: 'theme-section' },
    { type: 'divider' },
    {
      label: 'Sign Out',
      icon: LogOut,
      onClick: async () => {
        await signOut()
        navigate('/signin')
      },
      className: 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
    }
  ]

  const themeOptions = [
    { mode: 'light' as const, icon: Sun, label: 'Light' },
    { mode: 'dark' as const, icon: Moon, label: 'Dark' },
    { mode: 'system' as const, icon: Monitor, label: 'System' }
  ]

  const getThemeIcon = () => {
    if (darkMode === 'dark') return <Sun size={18} />
    if (darkMode === 'light') return <Moon size={18} />
    return <Monitor size={18} />
  }

  const getThemeLabel = () => {
    if (darkMode === 'dark') return 'Dark'
    if (darkMode === 'light') return 'Light'
    return 'System'
  }

  const cycleTheme = () => {
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(darkMode)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    setDarkMode(nextTheme)
  }

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard'
    }
    return location.pathname.startsWith(href)
  }

  const getUserInitial = () => {
    if (user?.displayName) return user.displayName[0].toUpperCase()
    if (user?.username) return user.username[0].toUpperCase()
    if (user?.email) return user.email[0].toUpperCase()
    return 'U'
  }

  return (
    <header className="app-header">
      <div className="app-header-container">
        {/* Logo/Brand */}
        <div className="app-header-brand">
          <Link to="/dashboard" className="brand-link">
            <span className="brand-logo">🏡</span>
            <span className="brand-name">Lifestyle Spaces</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="app-header-nav desktop-only">
          {navigation.map(item => {
            const Icon = item.icon
            const isActive = isActiveRoute(item.href)

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right Side Actions */}
        <div className="app-header-actions">
          {/* Theme Toggle */}
          <button
            className="header-action-btn theme-toggle"
            title={`Theme: ${getThemeLabel()} (click to cycle)`}
            onClick={cycleTheme}
            aria-label={`Current theme: ${getThemeLabel()}. Click to cycle themes.`}
          >
            {getThemeIcon()}
            <span className="theme-label desktop-only">{getThemeLabel()}</span>
          </button>

          {/* Profile Dropdown */}
          <div className="profile-menu-container" ref={profileMenuRef}>
            <button
              className="profile-menu-trigger"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            >
              <div className="user-avatar">
                <span>{getUserInitial()}</span>
              </div>
              <span className="user-name desktop-only">{user?.displayName || user?.username || user?.email}</span>
              <ChevronDown size={16} className={`chevron ${isProfileMenuOpen ? 'rotated' : ''}`} />
            </button>

            {isProfileMenuOpen && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-header">
                  <div className="user-info">
                    <div className="user-name">{user?.displayName || user?.username || 'User'}</div>
                    <div className="user-email">{user?.email}</div>
                  </div>
                </div>

                <div className="profile-dropdown-menu">
                  {profileMenuItems.map((item, index) => {
                    if (item.type === 'divider') {
                      return <div key={index} className="menu-divider" />
                    }

                    if (item.type === 'theme-section') {
                      return (
                        <div key="theme-section" className="theme-section">
                          <div className="theme-section-header">
                            <span className="theme-section-title">Theme</span>
                          </div>
                          <div className="theme-options">
                            {themeOptions.map((option) => {
                              const Icon = option.icon
                              const isActive = darkMode === option.mode
                              return (
                                <button
                                  key={option.mode}
                                  className={`theme-option ${isActive ? 'active' : ''}`}
                                  onClick={() => setDarkMode(option.mode)}
                                  aria-label={`Switch to ${option.label} theme`}
                                  aria-pressed={isActive}
                                >
                                  <Icon size={16} />
                                  <span>{option.label}</span>
                                  {isActive && (
                                    <span className="theme-option-check">✓</span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    }

                    const Icon = item.icon!
                    return (
                      <button
                        key={item.label}
                        className={`profile-menu-item ${item.className || ''}`}
                        onClick={item.onClick}
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="mobile-menu-toggle mobile-only"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <nav className="mobile-nav">
          {navigation.map(item => {
            const Icon = item.icon
            const isActive = isActiveRoute(item.href)

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`mobile-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      )}
    </header>
  )
}
