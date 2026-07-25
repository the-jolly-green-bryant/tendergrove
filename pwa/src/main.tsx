import React from 'react'
import { createRoot } from 'react-dom/client'
import { setupIonicReact } from '@ionic/react'
import { Amplify } from 'aws-amplify'
import { Capacitor } from '@capacitor/core'
import App from './app/App'
import '@aws-amplify/ui-react/styles.css'

import '@ionic/react/css/core.css'
import '@ionic/react/css/normalize.css'
import '@ionic/react/css/structure.css'
import '@ionic/react/css/typography.css'
import '@ionic/react/css/padding.css'
import '@ionic/react/css/flex-utils.css'
import './theme/variables.css'
import './theme/foundation.scss'
import './theme/app.scss'
import outputs from '../../amplify_outputs.json'

setupIonicReact({ mode: 'ios' })

const isNative = Capacitor.isNativePlatform()

if (isNative) {
  // Amplify's completeOAuthFlow strips ?code= by calling
  // history.replaceState(..., redirectUri). On native redirectUri is the custom
  // app scheme, which throws a cross-origin SecurityError in the https://localhost
  // webview and aborts sign-in before the `signedIn` event fires. The URL cleanup
  // is cosmetic in a webview, so skip replaceState to custom-scheme targets.
  const originalReplaceState = window.history.replaceState.bind(window.history)
  window.history.replaceState = (
    data: unknown,
    unused: string,
    url?: string | URL | null,
  ) => {
    if (
      typeof url === 'string' &&
      !/^https?:\/\//i.test(url) &&
      /^[a-z][\w+.-]*:/i.test(url)
    ) {
      return
    }
    return originalReplaceState(data, unused, url as string | URL | null | undefined)
  }
}
// On native the Hosted UI opens in an external Custom Tab, so Cognito must
// redirect back via this custom scheme deep link (registered in the Android
// intent filter + Cognito callback URLs). The getRedirectUrl shim
// (see vite.config.ts) ensures Amplify selects it instead of localhost.
const nativeRedirect = 'com.bryantjames.tendergrove://callback/'
const webRedirect = 'http://localhost:8100/'

Amplify.configure({
  ...outputs,
  auth: {
    ...outputs.auth,
    oauth: {
      ...outputs.auth.oauth,
      redirect_sign_in_uri: isNative ? [nativeRedirect] : [webRedirect],
      redirect_sign_out_uri: isNative ? [nativeRedirect] : [webRedirect],
    },
  },
})

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
