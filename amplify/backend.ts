import { defineBackend } from '@aws-amplify/backend'
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam'

import { auth } from './auth/resource.ts'
import {
  data,
  getAnalyticsDashboardFunction,
  generateReportNarrativeFunction,
  NARRATIVE_BASE_MODEL_ID,
  NARRATIVE_MODEL_ID,
} from './data/resource.ts'

const backend = defineBackend({
  auth,
  data,
  generateReportNarrativeFunction,
  getAnalyticsDashboardFunction,
})

const analyticsTable = backend.data.resources.tables.AnalyticsEvent
backend.getAnalyticsDashboardFunction.addEnvironment(
  'ANALYTICS_TABLE_NAME',
  analyticsTable.tableName,
)
backend.getAnalyticsDashboardFunction.addEnvironment(
  'USER_POOL_ID',
  backend.auth.resources.userPool.userPoolId,
)
analyticsTable.grantReadData(
  backend.getAnalyticsDashboardFunction.resources.lambda,
)
backend.getAnalyticsDashboardFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['cognito-idp:AdminGetUser'],
    resources: [backend.auth.resources.userPool.userPoolArn],
  }),
)

backend.generateReportNarrativeFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['bedrock:InvokeModel'],
    resources: [
      `arn:aws:bedrock:*:*:inference-profile/${NARRATIVE_MODEL_ID}`,
      `arn:aws:bedrock:*::foundation-model/${NARRATIVE_BASE_MODEL_ID}`,
    ],
  }),
)

// Cognito requires the {####} token and replaces it with the recipient's code.
// Keep this message calm, recognizable, and explicit about code safety.
backend.auth.resources.cfnResources.cfnUserPool.emailVerificationSubject =
  'Your Grove confirmation code'
backend.auth.resources.cfnResources.cfnUserPool.emailVerificationMessage =
  'Welcome to Grove. Your confirmation code is {####}. Enter it in the Grove app to finish creating your account. Grove will never ask you to share this code with another person.'
