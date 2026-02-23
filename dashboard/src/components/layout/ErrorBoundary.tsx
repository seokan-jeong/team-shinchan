/**
 * ErrorBoundary.tsx
 *
 * Catches rendering errors in child components and displays
 * a fallback UI instead of crashing the entire app.
 */
import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            gap: '16px',
            fontFamily: 'system-ui, sans-serif',
            color: '#e0e0e0',
            background: '#1a1a2e',
          }}
        >
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h2 style={{ margin: 0 }}>Dashboard Error</h2>
          <p style={{ margin: 0, color: '#999', maxWidth: '400px', textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '8px 24px',
              border: '1px solid #444',
              borderRadius: '6px',
              background: '#2a2a4a',
              color: '#e0e0e0',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
