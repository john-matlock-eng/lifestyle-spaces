import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { apiService } from './services/api'
import { config } from './config'

interface HealthStatus {
  status: string
  timestamp: string
}

function App() {
  const [count, setCount] = useState(0)
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [isLoadingHealth, setIsLoadingHealth] = useState(false)

  const checkApiHealth = async () => {
    setIsLoadingHealth(true)
    setHealthError(null)
    
    try {
      const health = await apiService.healthCheck()
      setHealthStatus(health)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setHealthError(errorMessage)
      setHealthStatus(null)
    } finally {
      setIsLoadingHealth(false)
    }
  }

  useEffect(() => {
    // Check API health on component mount
    checkApiHealth()
  }, [])

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Lifestyle Spaces</h1>
      
      <div className="card">
        <h2>API Configuration</h2>
        <p><strong>API URL:</strong> {config.apiUrl}</p>
        <p><strong>Environment:</strong> {config.isAWS ? 'AWS' : 'Local'}</p>
        
        <div style={{ marginTop: '1rem' }}>
          <h3>API Health Status</h3>
          <button 
            onClick={checkApiHealth} 
            disabled={isLoadingHealth}
            style={{ marginBottom: '1rem' }}
          >
            {isLoadingHealth ? 'Checking...' : 'Check API Health'}
          </button>
          
          {healthStatus && (
            <div style={{ color: 'green' }}>
              <p>✓ API is healthy</p>
              <p>Status: {healthStatus.status}</p>
              <p>Last checked: {new Date(healthStatus.timestamp).toLocaleString()}</p>
            </div>
          )}
          
          {healthError && (
            <div style={{ color: 'red' }}>
              <p>✗ API health check failed</p>
              <p>Error: {healthError}</p>
              <p><em>This is expected if the backend is not running</em></p>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
