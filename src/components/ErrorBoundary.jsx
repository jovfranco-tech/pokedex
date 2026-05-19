import { Component } from 'react'

/**
 * Send error telemetry to the Vercel function log (no external service needed).
 * Uses sendBeacon so it never blocks the main thread and survives page unload.
 * Only fires in production to avoid noise during development.
 */
function reportError(error, info) {
  if (typeof window === 'undefined') return
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return

  try {
    const payload = JSON.stringify({
      error: error?.message ?? String(error),
      stack: error?.stack?.slice(0, 600),
      componentStack: info?.componentStack?.slice(0, 600),
      url: window.location.href,
      time: new Date().toISOString(),
    })
    navigator.sendBeacon?.('/api/report-error', payload)
  } catch {
    // sendBeacon failure is non-critical — silently ignore
  }
}

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
    reportError(error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="error-boundary-fallback">
          <span>🙈</span>
          <p>{this.props.message ?? 'Algo salió mal aquí.'}</p>
          <button type="button" aria-label="Reintentar" onClick={() => this.setState({ hasError: false })}>
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
