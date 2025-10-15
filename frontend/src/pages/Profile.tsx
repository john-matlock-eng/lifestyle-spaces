import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../stores/authStore'
import '../styles/profile.css'

export const Profile: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
  })

  const handleSave = async () => {
    try {
      // TODO: Implement updateProfile in auth store
      // await updateProfile(formData)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }

  const handleCancel = () => {
    setFormData({
      displayName: user?.displayName || '',
    })
    setIsEditing(false)
  }

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Unknown'

  return (
    <div className="profile-container">
      <div className="profile-header">
        <button
          onClick={() => navigate('/dashboard')}
          className="back-button"
        >
          ← Back to Dashboard
        </button>
        <h1>My Profile</h1>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="avatar-section">
              <div className="avatar-container">
                <div className="avatar-placeholder">
                  {user?.displayName?.[0]?.toUpperCase() || 'U'}
                </div>
              </div>
            </div>

            <div className="profile-info">
              {isEditing ? (
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  className="profile-input name-input"
                  placeholder="Display name"
                />
              ) : (
                <h2 className="profile-name">{user?.displayName || 'Anonymous User'}</h2>
              )}
              <p className="profile-email">
                <span className="icon">📧</span>
                {user?.email}
              </p>
              <p className="profile-joined">
                <span className="icon">📅</span>
                Member since {memberSince}
              </p>
            </div>

            <div className="profile-actions">
              {isEditing ? (
                <>
                  <button onClick={handleSave} className="button-primary">
                    💾 Save Changes
                  </button>
                  <button onClick={handleCancel} className="button-secondary">
                    ✖️ Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} className="button-primary">
                  ✏️ Edit Profile
                </button>
              )}
            </div>
          </div>

          <div className="profile-card-body">
            <div className="profile-section">
              <h3>Account Information</h3>
              <div className="profile-fields">
                <div className="field-group">
                  <label>User ID</label>
                  <p>{user?.userId || 'N/A'}</p>
                </div>
                <div className="field-group">
                  <label>Email</label>
                  <p>{user?.email || 'N/A'}</p>
                </div>
                <div className="field-group">
                  <label>Display Name</label>
                  <p>{user?.displayName || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-stats-card">
          <h3>Activity Overview</h3>
          <p className="stats-placeholder">Statistics will be available soon</p>
        </div>

        <div className="profile-security-card">
          <h3><span className="icon">🛡️</span> Account Security</h3>
          <div className="security-items">
            <div className="security-item">
              <div>
                <h4>Password</h4>
                <p>Manage your password through AWS Cognito</p>
              </div>
              <button className="button-secondary" disabled>
                Change Password
              </button>
            </div>
            <div className="security-item">
              <div>
                <h4>Two-Factor Authentication</h4>
                <p>Not enabled</p>
              </div>
              <button className="button-secondary" disabled>
                Enable 2FA
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
