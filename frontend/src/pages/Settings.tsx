import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../theme/useTheme'
import { useEllieCustomizationContext } from '../hooks/useEllieCustomizationContext'
import '../styles/settings.css'

export const Settings: React.FC = () => {
  const navigate = useNavigate()
  const { darkMode, setDarkMode } = useTheme()
  const { customization, updateCustomization, resetCustomization } = useEllieCustomizationContext()

  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    journalReminders: true,
    spaceInvites: true,
    weeklyDigest: false,
  })

  const [privacy, setPrivacy] = useState({
    profileVisibility: 'friends',
    showActivity: true,
    allowInvites: true,
  })

  const [activeSection, setActiveSection] = useState('appearance')

  const handleDeleteAccount = () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    )
    if (confirmed) {
      console.log('Deleting account...')
    }
  }

  const handleExportData = () => {
    console.log('Exporting user data...')
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <button
          onClick={() => navigate('/dashboard')}
          className="back-button"
        >
          ← Back to Dashboard
        </button>
        <h1>Settings</h1>
      </div>

      <div className="settings-content">
        <nav className="settings-nav">
          <button
            className={`settings-nav-item ${activeSection === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveSection('appearance')}
          >
            <span className="icon">🎨</span> Appearance
          </button>
          <button
            className={`settings-nav-item ${activeSection === 'companion' ? 'active' : ''}`}
            onClick={() => setActiveSection('companion')}
          >
            <span className="icon">🐕</span> Companion
          </button>
          <button
            className={`settings-nav-item ${activeSection === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveSection('notifications')}
          >
            <span className="icon">🔔</span> Notifications
          </button>
          <button
            className={`settings-nav-item ${activeSection === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveSection('privacy')}
          >
            <span className="icon">🛡️</span> Privacy & Security
          </button>
          <button
            className={`settings-nav-item ${activeSection === 'data' ? 'active' : ''}`}
            onClick={() => setActiveSection('data')}
          >
            <span className="icon">💾</span> Data & Storage
          </button>
        </nav>

        <div className="settings-panels">
          {/* Appearance Settings */}
          {activeSection === 'appearance' && (
            <section className="settings-section">
              <h2><span className="icon">🎨</span> Appearance</h2>

              <div className="setting-group">
                <div className="setting-item">
                  <div className="setting-info">
                    <span className="icon">🌙</span>
                    <div>
                      <h3>Theme</h3>
                      <p>Choose your preferred color theme</p>
                    </div>
                  </div>
                  <select
                    value={darkMode}
                    onChange={(e) => setDarkMode(e.target.value as 'light' | 'dark' | 'system')}
                    className="setting-select"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <span className="icon">🔤</span>
                    <div>
                      <h3>Font Size</h3>
                      <p>Adjust text size for better readability</p>
                    </div>
                  </div>
                  <select className="setting-select">
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="extra-large">Extra Large</option>
                  </select>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <span className="icon">🔊</span>
                    <div>
                      <h3>Sound Effects</h3>
                      <p>Play sounds for interactions</p>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </section>
          )}

          {/* Companion Settings */}
          {activeSection === 'companion' && (
            <section className="settings-section">
              <h2><span className="icon">🐕</span> Your Companion</h2>

              <div className="setting-group">
                <div className="setting-item">
                  <div className="setting-info">
                    <span className="icon">📛</span>
                    <div>
                      <h3>Name</h3>
                      <p>What would you like to call your companion?</p>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={customization.petName}
                    onChange={(e) => updateCustomization({ petName: e.target.value })}
                    maxLength={20}
                    className="setting-input"
                    placeholder="Lily"
                  />
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <span className="icon">🎨</span>
                    <div>
                      <h3>Fur Pattern</h3>
                      <p>Choose your companion's coat pattern</p>
                    </div>
                  </div>
                  <select
                    value={customization.furPattern}
                    onChange={(e) => updateCustomization({ furPattern: e.target.value as 'solid' | 'parti' })}
                    className="setting-select"
                  >
                    <option value="parti">Parti (Black & White)</option>
                    <option value="solid">Solid Color</option>
                  </select>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <span className="icon">🖌️</span>
                    <div>
                      <h3>Base Fur Color</h3>
                      <p>Main coat color</p>
                    </div>
                  </div>
                  <input
                    type="color"
                    value={customization.furColor}
                    onChange={(e) => updateCustomization({ furColor: e.target.value })}
                    className="setting-color-input"
                  />
                </div>

                {customization.furPattern === 'parti' && (
                  <div className="setting-item">
                    <div className="setting-info">
                      <span className="icon">🖤</span>
                      <div>
                        <h3>Patch Color</h3>
                        <p>Color of the spots/patches</p>
                      </div>
                    </div>
                    <input
                      type="color"
                      value={customization.accentColor}
                      onChange={(e) => updateCustomization({ accentColor: e.target.value })}
                      className="setting-color-input"
                    />
                  </div>
                )}

                <div className="setting-item">
                  <div className="setting-info">
                    <span className="icon">🎀</span>
                    <div>
                      <h3>Collar Style</h3>
                      <p>Choose an accessory</p>
                    </div>
                  </div>
                  <select
                    value={customization.collarStyle}
                    onChange={(e) => updateCustomization({ collarStyle: e.target.value as 'none' | 'leather' | 'fabric' | 'bowtie' | 'bandana' })}
                    className="setting-select"
                  >
                    <option value="none">None</option>
                    <option value="leather">Leather Collar</option>
                    <option value="fabric">Fabric Collar</option>
                    <option value="bowtie">Bowtie</option>
                    <option value="bandana">Bandana</option>
                  </select>
                </div>

                {customization.collarStyle !== 'none' && (
                  <>
                    <div className="setting-item">
                      <div className="setting-info">
                        <span className="icon">🎨</span>
                        <div>
                          <h3>Collar Color</h3>
                          <p>Choose the collar color</p>
                        </div>
                      </div>
                      <input
                        type="color"
                        value={customization.collarColor}
                        onChange={(e) => updateCustomization({ collarColor: e.target.value })}
                        className="setting-color-input"
                      />
                    </div>

                    <div className="setting-item">
                      <div className="setting-info">
                        <div>
                          <h3>Name Tag</h3>
                          <p>Show a name tag on the collar</p>
                        </div>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={customization.collarTag}
                          onChange={(e) => updateCustomization({ collarTag: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </>
                )}

                <button
                  onClick={resetCustomization}
                  className="button-secondary settings-action-btn"
                >
                  Reset to Defaults
                </button>
              </div>
            </section>
          )}

          {/* Notification Settings */}
          {activeSection === 'notifications' && (
            <section className="settings-section">
              <h2><span className="icon">🔔</span> Notifications</h2>

              <div className="setting-group">
                <div className="setting-item">
                  <div className="setting-info">
                    <span className="icon">📧</span>
                    <div>
                      <h3>Email Notifications</h3>
                      <p>Receive updates via email</p>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.email}
                      onChange={(e) => setNotifications({...notifications, email: e.target.checked})}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <span className="icon">📱</span>
                    <div>
                      <h3>Push Notifications</h3>
                      <p>Receive notifications on your device</p>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.push}
                      onChange={(e) => setNotifications({...notifications, push: e.target.checked})}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-subsection">
                  <h4>Notification Types</h4>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div>
                        <h3>Journal Reminders</h3>
                        <p>Daily reminders to write in your journal</p>
                      </div>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notifications.journalReminders}
                        onChange={(e) => setNotifications({...notifications, journalReminders: e.target.checked})}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div>
                        <h3>Space Invitations</h3>
                        <p>When someone invites you to a space</p>
                      </div>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notifications.spaceInvites}
                        onChange={(e) => setNotifications({...notifications, spaceInvites: e.target.checked})}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Privacy Settings */}
          {activeSection === 'privacy' && (
            <section className="settings-section">
              <h2><span className="icon">🛡️</span> Privacy & Security</h2>

              <div className="setting-group">
                <div className="setting-item">
                  <div className="setting-info">
                    <div>
                      <h3>Profile Visibility</h3>
                      <p>Who can see your profile</p>
                    </div>
                  </div>
                  <select
                    value={privacy.profileVisibility}
                    onChange={(e) => setPrivacy({...privacy, profileVisibility: e.target.value})}
                    className="setting-select"
                  >
                    <option value="public">Public</option>
                    <option value="friends">Friends Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <div>
                      <h3>Show Activity Status</h3>
                      <p>Let others see when you're active</p>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={privacy.showActivity}
                      onChange={(e) => setPrivacy({...privacy, showActivity: e.target.checked})}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <button className="settings-link-button" disabled>
                  Change Password →
                </button>
                <button className="settings-link-button" disabled>
                  Two-Factor Authentication →
                </button>
                <button className="settings-link-button" disabled>
                  Active Sessions →
                </button>
              </div>
            </section>
          )}

          {/* Data Management */}
          {activeSection === 'data' && (
            <section className="settings-section">
              <h2><span className="icon">💾</span> Data & Storage</h2>

              <div className="setting-group">
                <button
                  onClick={handleExportData}
                  className="button-secondary settings-action-btn"
                >
                  📥 Export Your Data
                </button>

                <div className="danger-zone">
                  <h3>⚠️ Danger Zone</h3>
                  <p>Irreversible actions that affect your account</p>
                  <button
                    onClick={handleDeleteAccount}
                    className="button-danger"
                  >
                    🗑️ Delete Account
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
