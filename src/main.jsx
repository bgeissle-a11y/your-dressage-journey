import './sentry.js'
import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.jsx'
import './index.css'

function FallbackError() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'Work Sans, sans-serif' }}>
      <h1 style={{ fontFamily: 'Playfair Display, serif', color: '#8B7355' }}>
        Something went wrong
      </h1>
      <p>We've been notified of the issue. Please refresh the page to try again.</p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1.5rem',
          background: '#8B7355',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontFamily: 'Work Sans, sans-serif',
        }}
      >
        Refresh Page
      </button>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<FallbackError />}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)
