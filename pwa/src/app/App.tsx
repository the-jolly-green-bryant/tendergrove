// src/App.tsx
import { useEffect, useState } from 'react'
import { IonApp } from '@ionic/react'
import { Authenticator } from '@aws-amplify/ui-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Capacitor } from '@capacitor/core'

import { AuthProvider } from '../auth/AuthContext'
import { signInWithGoogleNative } from '../auth/nativeGoogleSignIn'
import { SelectedDateProvider } from '../context/SelectedDateContext'
import AppShell from './AppShell'
import { clearOfflineCache } from '../lib/resilientCache'
import { fetchUserAttributes, type AuthUser } from 'aws-amplify/auth'

const isNative = Capacitor.isNativePlatform()

type AuthIntent = 'signIn' | 'signUp'

const WELCOME_STEPS = [
  {
    eyebrow: 'Welcome to Grove',
    title: 'When every day is a lot, remembering the pattern shouldn’t be another burden.',
    body: 'Grove helps parents capture meaningful changes without requiring a diagnosis, a perfect timeline, or long journal entries.',
    icon: '🌿',
    review: ['Built for overwhelmed caregivers', 'A few taps when words are hard', 'Track your child and your own burnout'],
  },
  {
    eyebrow: 'Notice what changed',
    title: 'Start with the signals that matter in your home.',
    body: 'Choose a small set of difficult and positive signs—sleep, fear, withdrawal, communication, eating, accepting support, or your own exhaustion.',
    icon: '✓',
    review: ['No giant symptom checklist', 'Signals can change as you learn', 'Check in when you can—gaps simply stay blank'],
  },
  {
    eyebrow: 'Turn memory into evidence',
    title: 'See what happened, what came before, and what may be helping.',
    body: 'Grove organizes daily observations into timelines, gentle patterns, and explainable status changes. Every insight shows the observations behind it and other possible explanations.',
    icon: '⌁',
    review: ['Evidence and sample size', 'One practical thing to notice next', 'No diagnosis or false certainty'],
  },
  {
    eyebrow: 'Walk into the next conversation prepared',
    title: 'Bring a clearer story to the people helping your family.',
    body: 'Create an editable appointment summary with changes over time, frequent signals, interventions, notes, and the questions you need answered.',
    icon: '↗',
    review: ['Plain text, PDF, and CSV', 'Preview everything before sharing', 'Crisis support is always available'],
  },
] as const

const WelcomeJourney = ({ onContinue }: { readonly onContinue: (intent: AuthIntent) => void }) => {
  const [step, setStep] = useState(0)
  const content = WELCOME_STEPS[step]
  const last = step === WELCOME_STEPS.length - 1
  return (
    <IonApp>
      <main className="welcome-journey">
        <header className="welcome-journey__header">
          <div className="welcome-journey__brand"><img src="/assets/brand/grove-wordmark.png" alt="Grove" /></div>
          <button type="button" onClick={() => onContinue('signIn')}>Already have an account</button>
        </header>
        <section className="welcome-journey__card">
          <div className="welcome-journey__progress" aria-label={`Step ${step + 1} of ${WELCOME_STEPS.length}`}>
            {WELCOME_STEPS.map((item, index) => <i key={item.eyebrow} className={index <= step ? 'is-active' : ''} />)}
          </div>
          <span className="welcome-journey__icon" aria-hidden="true">{content.icon}</span>
          <p className="welcome-journey__eyebrow">{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p className="welcome-journey__body">{content.body}</p>
          <div className="welcome-journey__review">
            <p>What this means for you</p>
            {content.review.map((item) => <span key={item}><b>✓</b>{item}</span>)}
          </div>
          <div className="welcome-journey__actions">
            {step > 0 && <button type="button" className="welcome-journey__back" onClick={() => setStep((value) => value - 1)}>Back</button>}
            <button type="button" className="welcome-journey__next" onClick={() => last ? onContinue('signUp') : setStep((value) => value + 1)}>{last ? 'Create my account' : 'Continue'}</button>
          </div>
          <small>{step + 1} of {WELCOME_STEPS.length} · Grove does not diagnose or decide whether hospital care is needed.</small>
        </section>
      </main>
    </IonApp>
  )
}

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
      <div className="auth-brand">
        <img className="brand-wordmark-image brand-wordmark-image--auth" src="/assets/brand/grove-wordmark.png" alt="Grove" />
        <p>Notice gently. Remember clearly.</p>
      </div>
    )
  },
  SignIn: {
    Header() {
      return <div className="auth-form-intro"><h1>Welcome back</h1><p>Return to your household’s observations and notes.</p></div>
    },
    ...(isNative ? { Footer: NativeGoogleButton } : {}),
  },
  SignUp: {
    Header() {
      return <div className="auth-form-intro"><h1>Create your account</h1><p>Your household information stays connected to this private sign-in.</p></div>
    },
  },
  ConfirmSignUp: {
    Header() {
      return <div className="auth-code-intro"><img className="brand-wordmark-image brand-wordmark-image--compact" src="/assets/brand/grove-wordmark.png" alt="Grove" /><p className="auth-code-intro__eyebrow">One last step</p><h1>Check your email</h1><p>Enter the Grove confirmation code we sent you. This verifies that the email belongs to you.</p></div>
    },
    Footer() {
      return <p className="auth-code-footer">The code may take a minute to arrive. Check spam or request a new code if needed. Grove will never ask you to share this code with another person.</p>
    },
  },
}

const handleGlobalError = (error: unknown) => {
  console.error('Grove request failed', error)
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

queryClient.getMutationCache().config.onError = handleGlobalError

const AuthenticatedApp = ({
  user,
  signOut,
}: {
  readonly user: AuthUser
  readonly signOut?: () => Promise<void>
}) => {
  const [email, setEmail] = useState<string>()
  const [emailResolved, setEmailResolved] = useState(false)

  useEffect(() => {
    let active = true
    setEmailResolved(false)
    void fetchUserAttributes()
      .then((attributes) => {
        if (active) {
          setEmail(attributes.email)
          setEmailResolved(true)
        }
      })
      .catch(() => {
        if (active) {
          setEmail(undefined)
          setEmailResolved(true)
        }
      })
    return () => {
      active = false
    }
  }, [user.userId])

  const signOutToWelcome = async () => {
    await signOut?.()
    queryClient.clear()
    clearOfflineCache()
    localStorage.removeItem('tendergrove:welcome-seen')
  }

  return (
    <AuthProvider
      user={user}
      email={email}
      emailResolved={emailResolved}
      signOut={() => void signOutToWelcome()}
    >
      <QueryClientProvider client={queryClient}>
        <SelectedDateProvider>
          <IonApp>
            <AppShell />
          </IonApp>
        </SelectedDateProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

const App = () => {
  const [authIntent, setAuthIntent] = useState<AuthIntent | null>(() =>
    localStorage.getItem('tendergrove:welcome-seen') ? 'signIn' : null,
  )
  const continueToAuth = (intent: AuthIntent) => {
    localStorage.setItem('tendergrove:welcome-seen', 'true')
    setAuthIntent(intent)
  }
  if (!authIntent) return <WelcomeJourney onContinue={continueToAuth} />
  return <Authenticator
    initialState={authIntent}
    socialProviders={isNative ? [] : ['google']}
    components={authComponents}
  >
    {({ signOut, user }) => {
      if (!user) return <></>
      return <AuthenticatedApp user={user} signOut={async () => {
        await signOut?.()
        setAuthIntent(null)
      }} />
    }}
  </Authenticator>
}

export default App
