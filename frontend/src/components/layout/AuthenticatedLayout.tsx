import React from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { useAuth } from '../../stores/authStore'

export const AuthenticatedLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />
  }

  return (
    <div className="app-layout">
      <AppHeader />

      <div className="app-body">
        <main className="app-main">
          <div className="app-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
