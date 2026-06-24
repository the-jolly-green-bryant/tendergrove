// Drop-in replacement for Amplify's internal
// @aws-amplify/auth/.../cognito/utils/oauth/getRedirectUrl (swapped in via the
// resolveId plugin in vite.config.ts).
//
// Why: Amplify's web build of getRedirectUrl only ever returns an http(s)
// same-origin redirect and throws on a custom-scheme-only list, so under
// Capacitor it always picks http://localhost and never the app's deep-link
// scheme. On native we instead return the custom scheme so Cognito redirects
// back into the app; on web we mirror Amplify's original behavior exactly.
//
// NOTE: pinned to Amplify's internal contract — recheck after any aws-amplify
// upgrade (see getRedirectUrl.ts in @aws-amplify/auth).
import { Capacitor } from '@capacitor/core'

/** @internal */
export function getRedirectUrl(
  redirects: string[],
  preferredRedirectUrl?: string,
): string {
  if (Capacitor.isNativePlatform()) {
    const appScheme = redirects?.find(
      (redirect) => !redirect.startsWith('http://') && !redirect.startsWith('https://'),
    )
    if (appScheme) {
      if (
        preferredRedirectUrl &&
        preferredRedirectUrl !== appScheme &&
        redirects.includes(preferredRedirectUrl)
      ) {
        return preferredRedirectUrl
      }
      return appScheme
    }
    // fall through to the web logic if no custom scheme is configured
  }

  // --- mirrors @aws-amplify/auth getRedirectUrl.ts (web) ---
  if (preferredRedirectUrl) {
    const match = redirects?.find((redirect) => redirect === preferredRedirectUrl)
    if (!match) {
      throw new Error('Preferred redirect URL is not in the configured list')
    }
    return match
  }

  const originAndPath = String(
    window.location.origin + (window.location.pathname || '/'),
  )
  const sameOrigin =
    redirects?.find((redirect) => redirect.startsWith(originAndPath)) ??
    redirects?.find((redirect) => redirect.includes(String(window.location.hostname)))
  if (sameOrigin) {
    return sameOrigin
  }

  const differentOrigin =
    redirects?.find((redirect) => redirect.startsWith('https://')) ??
    redirects?.find((redirect) => redirect.startsWith('http://'))
  if (differentOrigin) {
    throw new Error('Redirect URL did not match the current origin')
  }

  throw new Error('No valid redirect URL was configured')
}
