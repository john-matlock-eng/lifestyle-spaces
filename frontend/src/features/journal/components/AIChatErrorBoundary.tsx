/**
 * Error Boundary for AI Chat Component
 * Prevents crashes and provides graceful error handling
 */

import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import '../styles/ai-chat.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class AIChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AI Chat Error:', error)
    console.error('Error Info:', errorInfo)

    // Log component stack
    if (errorInfo.componentStack) {
      console.error('Component Stack:', errorInfo.componentStack)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })

    // Clear any corrupted localStorage data
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('chat_')) {
          localStorage.removeItem(key)
        }
      })
    } catch (err) {
      console.error('Failed to clear chat data:', err)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="ai-chat-error-boundary">
          <div className="error-content">
            <AlertCircle size={48} className="error-icon" />
            <h3>AI Assistant Encountered an Error</h3>
            <p className="error-message">
              The chat assistant ran into an unexpected problem. This has been logged.
            </p>
            {this.state.error && (
              <details className="error-details">
                <summary>Technical Details</summary>
                <pre>{this.state.error.message}</pre>
              </details>
            )}
            <button onClick={this.handleReset} className="error-reset-btn">
              <RefreshCw size={16} />
              Reset and Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
