import { App as CapApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'

const CALLBACK_SCHEME = 'com.bryantjames.tendergrove://callback'

export interface OpenAuthSessionResult {
  type: 'success' | 'canceled' | 'error'
  error?: unknown
  url?: string
}

/**
 * Capacitor implementation of Amplify's auth-session opener. Listener
 * registration must finish before opening the browser: cached OAuth sessions
 * can redirect back quickly enough to otherwise lose the deep-link event.
 */
export const openAuthSession = (
  url: string,
): Promise<OpenAuthSessionResult | undefined> => {
  if (!Capacitor.isNativePlatform()) {
    window.location.href = url.replace('http://', 'https://')
    return Promise.resolve(undefined)
  }

  return new Promise((resolve) => {
    let settled = false
    let cancellationTimer: ReturnType<typeof setTimeout> | undefined
    let urlSub: PluginListenerHandle | undefined
    let finishedSub: PluginListenerHandle | undefined

    const finish = (result: OpenAuthSessionResult) => {
      if (settled) return
      settled = true
      if (cancellationTimer) clearTimeout(cancellationTimer)
      void urlSub?.remove()
      void finishedSub?.remove()
      resolve(result)
    }

    void (async () => {
      try {
        // Await both registrations before Browser.open. This closes the race
        // that surfaced as "User cancelled OAuth flow" on fast redirects.
        urlSub = await CapApp.addListener('appUrlOpen', ({ url: openedUrl }) => {
          if (!openedUrl.startsWith(CALLBACK_SCHEME)) return
          finish({ type: 'success', url: openedUrl })
          void Browser.close().catch(() => {})
        })

        finishedSub = await Browser.addListener('browserFinished', () => {
          // iOS may report the sheet closing before delivering appUrlOpen.
          // Leave enough room for the deep link to win that race.
          cancellationTimer = setTimeout(
            () => finish({ type: 'canceled' }),
            5000,
          )
        })

        await Browser.open({ url })
      } catch (error) {
        finish({ type: 'error', error })
      }
    })()
  })
}

