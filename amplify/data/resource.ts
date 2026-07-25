import { a, defineData, defineFunction, type ClientSchema } from '@aws-amplify/backend'

export const NARRATIVE_BASE_MODEL_ID = 'amazon.nova-micro-v1:0'
export const NARRATIVE_MODEL_ID = `us.${NARRATIVE_BASE_MODEL_ID}`

export const generateReportNarrativeFunction = defineFunction({
  entry: './generateReportNarrative.ts',
  name: 'grove-report-narrative',
  timeoutSeconds: 20,
  memoryMB: 256,
  environment: {
    MODEL_ID: NARRATIVE_MODEL_ID,
  },
})

export const getAnalyticsDashboardFunction = defineFunction({
  entry: './getAnalyticsDashboard.ts',
  name: 'grove-analytics-dashboard',
  resourceGroupName: 'data',
  timeoutSeconds: 20,
  memoryMB: 256,
})

const schema = a.schema({
  AnalyticsEvent: a
    .model({
      eventName: a.enum([
        'screen_viewed',
        'household_profile',
        'check_in_saved',
        'onboarding_completed',
        'report_downloaded',
        'collaboration_granted',
      ]),
      schemaVersion: a.integer().required(),
      occurredAt: a.datetime().required(),
      propertiesJson: a.json().required(),
    })
    .secondaryIndexes((index) => [
      index('eventName').sortKeys(['occurredAt']).queryField('analyticsByEvent'),
    ])
    .authorization((allow) => [
      allow.owner().to(['create', 'read', 'delete']),
      allow.groups(['Admin']).to(['read', 'delete']),
    ]),

  getAnalyticsDashboard: a
    .query()
    .returns(a.string())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(getAnalyticsDashboardFunction)),

  ReportNarrative: a
    .model({
      personId: a.id().required(),
      factsHash: a.string().required(),
      schemaVersion: a.integer().required(),
      narrative: a.string().required(),
      model: a.string().required(),
    })
    .authorization((allow) => [allow.owner()]),

  generateReportNarrative: a
    .query()
    .arguments({
      factsJson: a.string().required(),
      factsHash: a.string().required(),
    })
    .returns(a.string())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(generateReportNarrativeFunction)),

  Household: a
    .model({
      name: a.string().required(),
      owner: a.string(),
      collaborators: a.string().array(),
      people: a.hasMany('Person', 'householdId'),
    })
    .authorization((allow) => [allow.owner(), allow.ownersDefinedIn('collaborators').to(['read'])]),

  Person: a
    .model({
      householdId: a.id().required(),
      household: a.belongsTo('Household', 'householdId'),

      owner: a.string(),
      collaborators: a.string().array(),
      displayName: a.string().required(),
      role: a.enum(['child', 'parent', 'spouse', 'self', 'caregiver', 'other']),
      avatarUrl: a.string(),
      archived: a.boolean().default(false),

      indicators: a.hasMany('Indicator', 'personId'),
      checkIns: a.hasMany('CheckIn', 'personId'),
      events: a.hasMany('Event', 'personId'),
    })
    .authorization((allow) => [allow.owner(), allow.ownersDefinedIn('collaborators').to(['read'])]),

  Indicator: a
    .model({
      personId: a.id().required(),
      person: a.belongsTo('Person', 'personId'),

      owner: a.string(),
      collaborators: a.string().array(),
      name: a.string().required(),
      description: a.string(),
      questionText: a.string(),
      notes: a.string().authorization((allow) => [allow.owner()]),
      polarity: a.enum(['desired', 'undesired']),
      inputType: a.enum(['boolean', 'frequency', 'scale', 'count', 'duration', 'text']),
      active: a.boolean().default(true),
    })
    .authorization((allow) => [allow.owner(), allow.ownersDefinedIn('collaborators').to(['read'])]),

  // A configurable "thing that happened today" (School, Therapy, Vacation…),
  // checked off during check-ins for context. Distinct from `Event` (timeline
  // items/incidents) and from `Indicator` (observed behaviours). Deliberately
  // minimal: no polarity, categories, icons, colours, or templates.
  //
  // Household-scoped: events live in one shared pool per household (keyed by the
  // scalar `householdId`), so every person's check-in can pick from the same
  // list. Standalone on purpose — no relation on the Person/Household models —
  // so adding it is a purely additive schema change (one new table, no existing
  // model or data touched).
  LifeEvent: a
    .model({
      householdId: a.id().required(),

      owner: a.string(),
      label: a.string().required(),
      archived: a.boolean().default(false),
      sortOrder: a.integer(),
    })
    .authorization((allow) => [allow.owner()]),

  CheckIn: a
    .model({
      personId: a.id().required(),
      person: a.belongsTo('Person', 'personId'),

      owner: a.string(),
      collaborators: a.string().array(),
      occurredAt: a.datetime().required(),
      answersJson: a.json(),
      note: a.string().authorization((allow) => [allow.owner()]),
    })
    .authorization((allow) => [allow.owner(), allow.ownersDefinedIn('collaborators').to(['read'])]),

  RoleTemplate: a
    .model({
      role: a.enum(['child', 'parent', 'spouse', 'self', 'caregiver', 'other']),
      label: a.string().required(),
      version: a.integer().required(),
      indicatorsJson: a.json().required(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.groups(['Admin']),
    ]),

  Event: a
    .model({
      personId: a.id().required(),
      person: a.belongsTo('Person', 'personId'),

      owner: a.string(),
      collaborators: a.string().array(),
      occurredAt: a.datetime().required(),
      type: a.enum([
        'note',
        'incident',
        'school',
        'medical',
        'sleep',
        'medication',
        'other',
        'interaction',
        'event',
      ]),
      title: a.string().required(),
      description: a.string().authorization((allow) => [allow.owner()]),
      metadataJson: a.json(),
    })
    .authorization((allow) => [allow.owner(), allow.ownersDefinedIn('collaborators').to(['read'])]),

  CaregiverAccess: a
    .model({
      personId: a.id().required(),
      personName: a.string().required(),
      invitedUserId: a.string().required(),
      role: a.enum(['viewer']),
      collaborators: a.string().array(),
    })
    .authorization((allow) => [allow.owner(), allow.ownersDefinedIn('collaborators').to(['read'])]),

  CollaborationAudit: a
    .model({
      personId: a.id().required(),
      action: a.enum(['granted', 'revoked']),
      invitedUserId: a.string().required(),
    })
    .authorization((allow) => [allow.owner()]),
})

/**
 *
 */
export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
})
