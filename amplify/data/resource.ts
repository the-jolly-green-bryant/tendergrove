import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

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

    Event: a
        .model({
            personId: a.id().required(),
            person: a.belongsTo('Person', 'personId'),

            owner: a.string(),
            occurredAt: a.datetime().required(),
            type: a.enum(['note', 'incident', 'school', 'medical', 'sleep', 'medication', 'other', 'interaction', 'event']),
            title: a.string().required(),
            description: a.string(),
            metadataJson: a.json(),
        })
        .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
    schema,
    authorizationModes: {
        defaultAuthorizationMode: 'userPool',
    },
});