import React, { type ReactNode } from 'react';
import './auth.css';

interface AuthLayoutProps {
  children: ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="auth-layout" data-testid="auth-layout">
      <header className="auth-header">
        <h1 className="app-title">Lifestyle Spaces</h1>
        <p className="app-subtitle">Share your spaces, connect with others</p>
      </header>
      
      <main role="main" aria-label="Authentication" className="auth-main">
        {children}
      </main>
      
      <footer className="auth-footer">
        <p>&copy; 2024 Lifestyle Spaces. All rights reserved.</p>
      </footer>
      
    </div>
  );
};