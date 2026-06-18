import React from 'react'
import { createRoot } from 'react-dom/client'
import { setupIonicReact } from '@ionic/react'
import { Amplify } from 'aws-amplify'
import App from './app/App'
import '@aws-amplify/ui-react/styles.css'

import '@ionic/react/css/core.css'
import '@ionic/react/css/normalize.css'
import '@ionic/react/css/structure.css'
import '@ionic/react/css/typography.css'
import '@ionic/react/css/padding.css'
import '@ionic/react/css/flex-utils.css'
import './theme/variables.css'
import './theme/app.css'
import outputs from '../../amplify_outputs.json'

setupIonicReact({ mode: 'ios' })
Amplify.configure(outputs)

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
