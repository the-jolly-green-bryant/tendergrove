// src/App.tsx
import { useState } from 'react'
import { IonApp } from '@ionic/react'
import { Authenticator } from '@aws-amplify/ui-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Capacitor } from '@capacitor/core'

import { AuthProvider } from '../auth/AuthContext'
import { signInWithGoogleNative } from '../auth/nativeGoogleSignIn'
import { SelectedDateProvider } from '../context/SelectedDateContext'
import AppShell from './AppShell'

const isNative = Capacitor.isNativePlatform()

// On native, Amplify's built-in social button can't complete a deep-link
// redirect, so we hide it and drive sign-in through signInWithGoogleNative().
const NativeGoogleButton = () => {
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (busy) return
          setBusy(true)
          setErrorMessage(null)
          try {
            await signInWithGoogleNative()
          } catch (error) {
            // A native alert can collide with the OAuth browser sheet's
            // dismissal transition and abort the iOS app. Keep feedback in
            // the web view so presentation remains safe.
            setErrorMessage(
              error instanceof Error
                ? error.message
                : 'Google sign-in could not be completed. Please try again.',
            )
          } finally {
            setBusy(false)
          }
        }}
        style={{
          width: '100%',
          padding: '12px',
          marginTop: 8,
          borderRadius: 8,
          border: '1px solid #d0d0d0',
          background: '#fff',
          color: '#3c4043',
          fontWeight: 600,
          cursor: busy ? 'default' : 'pointer',
        }}
      >
        {busy ? 'Opening Google…' : 'Sign in with Google'}
      </button>
      {errorMessage && (
        <p
          role="alert"
          style={{ margin: '8px 0 0', color: '#b42318', fontSize: 14 }}
        >
          {errorMessage}
        </p>
      )}
    </div>
  )
}

const authComponents = {
  Header() {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
        <img
          src="/favicon.png"
          alt="Tendergrove"
          style={{ width: 80, height: 80, borderRadius: 16 }}
        />
        <h2 style={{ margin: '8px 0 0', color: '#4A2D8B', fontWeight: 600 }}>
          Tendergrove
        </h2>
      </div>
    )
  },
  // On native, render our own Google button under the sign-in form.
  ...(isNative ? { SignIn: { Footer: NativeGoogleButton } } : {}),
}

const handleGlobalError = (error: unknown) => {
  console.error('Tendergrove request failed', error)
  alert(
    'We couldn’t complete that action. Your entries are still on this screen—check your connection and try again.',
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
    },
    mutations: {
      onError: handleGlobalError,
    },
  },
})

queryClient.getQueryCache().config.onError = handleGlobalError
queryClient.getMutationCache().config.onError = handleGlobalError

const App = () => (
  <Authenticator
    socialProviders={isNative ? [] : ['google']}
    components={authComponents}
  >
    {({ signOut, user }) => (
      <AuthProvider
        user={user}
        signOut={signOut}
      >
        <QueryClientProvider client={queryClient}>
          <SelectedDateProvider>
            <IonApp>
              <AppShell />
            </IonApp>
          </SelectedDateProvider>
        </QueryClientProvider>
      </AuthProvider>
    )}
  </Authenticator>
)

export default App
