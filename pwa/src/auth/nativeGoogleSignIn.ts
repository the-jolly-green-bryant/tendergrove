import { signInWithRedirect } from 'aws-amplify/auth'
import { openAuthSession } from './amplifyOpenAuthSession'

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
export const signInWithGoogleNative = async (): Promise<void> => {
  await signInWithRedirect({
    provider: 'Google',
    // authSessionOpener is a real signInWithRedirect option but is not in the
    // public input type; cast to reach it.
    options: { authSessionOpener: openAuthSession },
  } as unknown as Parameters<typeof signInWithRedirect>[0])
}
