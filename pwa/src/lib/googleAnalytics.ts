import { Capacitor } from '@capacitor/core'

export const GA_MEASUREMENT_ID = 'G-X0MQYM9M9X'

declare global {
  interface Window {
    dataLayer?: unknown[][]
    gtag?: (...args: unknown[]) => void
  }
}

export const initializeGoogleAnalytics = () => {
  const isNativeApp = Capacitor.isNativePlatform()

  // Keep local browser development out of production reports. Capacitor apps
  // also run on localhost, so native detection must take precedence.
  if (!import.meta.env.PROD && !isNativeApp) return

  window.dataLayer = window.dataLayer || []
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args)
    }

  if (!document.querySelector(`script[data-ga-measurement="${GA_MEASUREMENT_ID}"]`)) {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
    script.dataset.gaMeasurement = GA_MEASUREMENT_ID
    document.head.appendChild(script)
  }

  window.gtag('js', new Date())
  window.gtag('config', GA_MEASUREMENT_ID, {
    app_surface: isNativeApp ? 'app' : 'web',
    app_platform: Capacitor.getPlatform(),
  })
}
