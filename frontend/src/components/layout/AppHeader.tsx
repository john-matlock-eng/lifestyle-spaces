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
import { useEllieCustomization } from '../../hooks/useEllieCustomization'

export const AppHeader: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { darkMode, setDarkMode } = useTheme()
  const { customization, updateCustomization } = useEllieCustomization()

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
    type?: 'divider' | 'theme-section' | 'ellie-section'
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
    { type: 'ellie-section' },
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
    console.log('🔘 [AppHeader] Theme button clicked! Current:', darkMode)
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(darkMode)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    console.log('➡️ [AppHeader] Cycling to:', nextTheme)
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

                    if (item.type === 'ellie-section') {
                      const collarStyles = [
                        { value: 'none' as const, label: 'None', emoji: '🚫' },
                        { value: 'leather' as const, label: 'Leather', emoji: '🦴' },
                        { value: 'fabric' as const, label: 'Fabric', emoji: '🎀' },
                        { value: 'bowtie' as const, label: 'Bowtie', emoji: '🎀' },
                        { value: 'bandana' as const, label: 'Bandana', emoji: '🧣' }
                      ]

                      const collarColors = [
                        { value: '#8B4513', label: 'Brown' },
                        { value: '#FF0000', label: 'Red' },
                        { value: '#0000FF', label: 'Blue' },
                        { value: '#00FF00', label: 'Green' },
                        { value: '#FFC0CB', label: 'Pink' },
                        { value: '#FFD700', label: 'Gold' },
                        { value: '#800080', label: 'Purple' },
                        { value: '#000000', label: 'Black' }
                      ]

                      const furColors = [
                        { value: undefined, label: 'Default' },
                        { value: '#FFFFFF', label: 'White' },
                        { value: '#F5DEB3', label: 'Cream' },
                        { value: '#D2691E', label: 'Chocolate' },
                        { value: '#8B4513', label: 'Brown' },
                        { value: '#696969', label: 'Gray' },
                        { value: '#000000', label: 'Black' }
                      ]

                      return (
                        <div key="ellie-section" className="theme-section">
                          <div className="theme-section-header">
                            <span className="theme-section-title">🐾 Customize Ellie</span>
                          </div>

                          {/* Fur Color */}
                          <div style={{ padding: '8px 0' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-primary)' }}>
                              Fur Color
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                              {furColors.map((color) => (
                                <button
                                  key={color.label}
                                  className={`theme-option ${customization.furColor === color.value ? 'active' : ''}`}
                                  onClick={() => updateCustomization({ furColor: color.value })}
                                  style={{
                                    padding: '6px',
                                    fontSize: '11px',
                                    background: color.value || 'linear-gradient(135deg, #FDE2E4 0%, #E0B1CB 100%)'
                                  }}
                                  title={color.label}
                                >
                                  {customization.furColor === color.value && '✓'}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Collar Style */}
                          <div style={{ padding: '8px 0' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-primary)' }}>
                              Collar Style
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                              {collarStyles.map((style) => (
                                <button
                                  key={style.value}
                                  className={`theme-option ${customization.collarStyle === style.value ? 'active' : ''}`}
                                  onClick={() => updateCustomization({ collarStyle: style.value })}
                                  style={{ padding: '6px', fontSize: '11px' }}
                                >
                                  <span>{style.emoji}</span>
                                  <span style={{ marginLeft: '4px', fontSize: '10px' }}>{style.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Collar Color */}
                          {customization.collarStyle !== 'none' && (
                            <div style={{ padding: '8px 0' }}>
                              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-primary)' }}>
                                Collar Color
                              </label>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                                {collarColors.map((color) => (
                                  <button
                                    key={color.value}
                                    className={`theme-option ${customization.collarColor === color.value ? 'active' : ''}`}
                                    onClick={() => updateCustomization({ collarColor: color.value })}
                                    style={{
                                      padding: '8px',
                                      background: color.value,
                                      border: customization.collarColor === color.value ? '2px solid #8B4513' : '1px solid #ddd'
                                    }}
                                    title={color.label}
                                  >
                                    {customization.collarColor === color.value && <span style={{ color: color.value === '#000000' ? 'white' : 'black' }}>✓</span>}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Collar Tag */}
                          {customization.collarStyle !== 'none' && customization.collarStyle !== 'bandana' && (
                            <div style={{ padding: '8px 0' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={customization.collarTag}
                                  onChange={(e) => updateCustomization({ collarTag: e.target.checked })}
                                  style={{ width: '16px', height: '16px' }}
                                />
                                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  Show Name Tag
                                </span>
                              </label>
                            </div>
                          )}
                        </div>
                      )
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
