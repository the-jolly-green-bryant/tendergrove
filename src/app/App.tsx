// src/App.tsx
import {
  IonApp,
} from '@ionic/react';
import { Authenticator } from '@aws-amplify/ui-react';

import { AuthProvider } from '../auth/AuthContext';
import AppShell from './AppShell';

export default function App() {
  return (
      <Authenticator socialProviders={['google']}>
        {({ signOut, user }) => (
            <AuthProvider user={user} signOut={signOut}>
              <IonApp>
                <AppShell />
              </IonApp>
            </AuthProvider>
        )}
      </Authenticator>
  );
}