// Google Analytics 4 — dynamic initialization for Vite SPA
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID

export function initGA4() {
  if (!GA_MEASUREMENT_ID) return

  // Load gtag.js script
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  document.head.appendChild(script)

  // Initialize dataLayer and gtag
  window.dataLayer = window.dataLayer || []
  window.gtag = function () {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false })
}

export function trackPageView(path, title) {
  if (!GA_MEASUREMENT_ID || !window.gtag) return
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
  })
}
