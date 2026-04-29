import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Mirrors the /terms and /privacy rewrites in firebase.json so dev matches prod.
// Without this, Vite's SPA fallback serves index.html and React Router routes
// authenticated users to /quickstart instead of the legal page.
const legalPageRewrites = {
  name: 'legal-page-rewrites',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const path = (req.url || '').split('?')[0]
      if (path === '/terms') req.url = '/ydj-terms.html'
      else if (path === '/privacy') req.url = '/ydj-privacy.html'
      next()
    })
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), legalPageRewrites],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'build'
  }
})
