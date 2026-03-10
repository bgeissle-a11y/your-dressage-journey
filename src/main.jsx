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

// Catch IndexedDB connection-lost errors from Firebase persistence and show a
// user-friendly refresh banner instead of letting them surface as unhandled.
function showRefreshBanner() {
  if (document.getElementById('ydj-refresh-banner')) return
  const banner = document.createElement('div')
  banner.id = 'ydj-refresh-banner'
  Object.assign(banner.style, {
    position: 'fixed', top: '0', left: '0', right: '0', zIndex: '99999',
    background: '#8B7355', color: '#fff', padding: '0.75rem 1rem',
    textAlign: 'center', fontFamily: 'Work Sans, sans-serif', fontSize: '0.95rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
  })
  banner.innerHTML = `
    <span>Connection lost — please refresh to continue.</span>
    <button onclick="window.location.reload()" style="
      background: #fff; color: #8B7355; border: none; border-radius: 4px;
      padding: 0.35rem 1rem; cursor: pointer; font-family: Work Sans, sans-serif;
      font-weight: 600;
    ">Refresh</button>
  `
  document.body.prepend(banner)
}

function isIndexedDBError(msg) {
  return typeof msg === 'string' && (
    msg.includes('Indexed Database server lost') ||
    msg.includes('IndexedDB') ||
    msg.includes('internal error opening backing store')
  )
}

window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || String(event.reason || '')
  if (isIndexedDBError(msg)) {
    event.preventDefault()
    showRefreshBanner()
  }
})

window.addEventListener('error', (event) => {
  const msg = event.message || event.error?.message || ''
  if (isIndexedDBError(msg)) {
    event.preventDefault()
    showRefreshBanner()
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<FallbackError />}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)
