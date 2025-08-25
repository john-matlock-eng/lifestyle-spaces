import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import './index.css'
import App from './App.tsx'
import { getValidatedAmplifyConfig } from './config/amplify'

// Initialize Amplify with configuration
// Skip Amplify configuration in test environment
if (import.meta.env.NODE_ENV !== 'test' && !import.meta.env.VITE_TEST_ENV) {
  try {
    const amplifyConfig = getValidatedAmplifyConfig()
    Amplify.configure(amplifyConfig)
  } catch (error) {
    console.error('Failed to configure Amplify:', error)
    // In development, allow the app to continue without Amplify
    if (import.meta.env.DEV) {
      console.warn('Running in development mode without Amplify configuration')
    } else {
      throw error
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
