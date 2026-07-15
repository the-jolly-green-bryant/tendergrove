import { signInWithRedirect } from 'aws-amplify/auth'
import { App as CapApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'

// The custom-scheme deep link registered in Cognito callback URLs and in the
// Android intent filter (AndroidManifest.xml). Cognito redirects here once the
// Google sign-in completes.
const CALLBACK_SCHEME = 'com.bryantjames.tendergrove://callback'

interface OpenAuthSessionResult {
  type: 'success' | 'canceled' | 'error'
  error?: unknown
  url?: string
}

/**
 * Custom authSessionOpener for Amplify v6 on Capacitor.
 *
 * Amplify's default opener does a `window.location` redirect, which under
 * Capacitor escapes into the external browser and never returns. Instead we
 * open the Cognito Hosted UI in a Custom Tab (which Google allows, unlike an
 * embedded webview) and resolve with the deep-link URL once the OS hands the
 * `com.bryantjames.tendergrove://callback` redirect back to the app. Amplify then runs
 * completeOAuthFlow() with that URL — doing the PKCE exchange, storing the
 * session, and firing the `signedIn` Hub event.
 */
const capacitorAuthSessionOpener = (url: string): Promise<OpenAuthSessionResult> =>
  new Promise((resolve) => {
    let settled = false

    const finish = (result: OpenAuthSessionResult) => {
      if (settled) return
      settled = true
      void urlSub.then((s) => s.remove())
      void finishedSub.then((s) => s.remove())
      resolve(result)
    }

    // The redirect back into the app. Resolve success FIRST, then close the
    // tab — closing fires `browserFinished`, and if we awaited the close before
    // resolving, that event would win the race and report a false cancellation.
    const urlSub = CapApp.addListener('appUrlOpen', ({ url: openedUrl }) => {
      if (!openedUrl.startsWith(CALLBACK_SCHEME)) return
      finish({ type: 'success', url: openedUrl })
      void Browser.close().catch(() => {})
    })

    // The Custom Tab also closes as part of the redirect, so don't treat a
    // close as cancellation until the deep link has had a moment to arrive.
    const finishedSub = Browser.addListener('browserFinished', () => {
      setTimeout(() => finish({ type: 'canceled' }), 1200)
    })

    Browser.open({ url }).catch((error) => {
      finish({ type: 'error', error })
    })
  })

export const signInWithGoogleNative = async (): Promise<void> => {
  await signInWithRedirect({
    provider: 'Google',
    // authSessionOpener is a real signInWithRedirect option but is not in the
    // public input type; cast to reach it.
    options: { authSessionOpener: capacitorAuthSessionOpener },
  } as unknown as Parameters<typeof signInWithRedirect>[0])
}
