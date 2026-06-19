// src/App.tsx
import { IonApp } from '@ionic/react'
import { Authenticator } from '@aws-amplify/ui-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '../auth/AuthContext'
import AppShell from './AppShell'

function handleGlobalError(error: unknown) {
  const message =
    error instanceof Error ? error.message : JSON.stringify(error, null, 2);
  alert(`Request failed:\n\n${message}`);
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
});

queryClient.getQueryCache().config.onError = handleGlobalError;
queryClient.getMutationCache().config.onError = handleGlobalError;

export default function App() {
  return (
    <Authenticator socialProviders={['google']}>
      {({ signOut, user }) => (
        <AuthProvider
          user={user}
          signOut={signOut}
        >
          <QueryClientProvider client={queryClient}>
          <IonApp>
            <AppShell />
          </IonApp>
          </QueryClientProvider>
        </AuthProvider>
      )}
    </Authenticator>
  )
}
