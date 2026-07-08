import { a, defineData, type ClientSchema } from '@aws-amplify/backend'

const schema = a.schema({
  Household: a
    .model({
      name: a.string().required(),
      owner: a.string(),
      people: a.hasMany('Person', 'householdId'),
    })
    .authorization((allow) => [allow.owner()]),

  Person: a
    .model({
      householdId: a.id().required(),
      household: a.belongsTo('Household', 'householdId'),

      owner: a.string(),
      displayName: a.string().required(),
      role: a.enum(['child', 'parent', 'spouse', 'self', 'caregiver', 'other']),
      avatarUrl: a.string(),
      archived: a.boolean().default(false),

      indicators: a.hasMany('Indicator', 'personId'),
      checkIns: a.hasMany('CheckIn', 'personId'),
      events: a.hasMany('Event', 'personId'),
    })
    .authorization((allow) => [allow.owner()]),

  Indicator: a
    .model({
      personId: a.id().required(),
      person: a.belongsTo('Person', 'personId'),

      owner: a.string(),
      name: a.string().required(),
      description: a.string(),
      questionText: a.string(),
      notes: a.string(),
      polarity: a.enum(['desired', 'undesired']),
      inputType: a.enum(['boolean', 'frequency', 'scale', 'count', 'duration', 'text']),
      active: a.boolean().default(true),
    })
    .authorization((allow) => [allow.owner()]),

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
      occurredAt: a.datetime().required(),
      answersJson: a.json(),
      note: a.string(),
    })
    .authorization((allow) => [allow.owner()]),

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
      description: a.string(),
      metadataJson: a.json(),
    })
    .authorization((allow) => [allow.owner()]),
})

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
})
