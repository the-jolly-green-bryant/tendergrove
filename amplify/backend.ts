import { defineBackend } from '@aws-amplify/backend'

import { auth } from './auth/resource.ts'
import { data } from './data/resource.ts'

const backend = defineBackend({
  auth,
  data,
})

// Cognito requires the {####} token and replaces it with the recipient's code.
// Keep this message calm, recognizable, and explicit about code safety.
backend.auth.resources.cfnResources.cfnUserPool.emailVerificationSubject =
  'Your Grove confirmation code'
backend.auth.resources.cfnResources.cfnUserPool.emailVerificationMessage =
  'Welcome to Grove. Your confirmation code is {####}. Enter it in the Grove app to finish creating your account. Grove will never ask you to share this code with another person.'
