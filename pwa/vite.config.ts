import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Swap Amplify's internal getRedirectUrl for our shim so OAuth on native
// returns the custom app scheme instead of localhost. See
// src/auth/amplifyGetRedirectUrl.ts for the why.
//
// Aliased (not a resolveId plugin) because the consumers import it from
// several different folders — e.g. cognito/apis/signInWithRedirect.mjs imports
// '../utils/oauth/getRedirectUrl.mjs' directly — and resolve.alias is honored
// by both the dep optimizer and the production build. The regex matches the
// whole specifier so the replacement fully replaces it.
const amplifyRedirectShim = fileURLToPath(
  new URL('./src/auth/amplifyGetRedirectUrl.ts', import.meta.url),
)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^.*[\\/]getRedirectUrl(\.native)?\.mjs$/,
        replacement: amplifyRedirectShim,
      },
    ],
  },
})
