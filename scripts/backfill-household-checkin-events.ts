/**
 * Add the union of household events for each date to every existing check-in
 * on that date. This migration is additive: it never removes event ids, never
 * changes signals or notes, and never creates check-ins.
 *
 * Dry run: pnpm tsx scripts/backfill-household-checkin-events.ts
 * Apply:   pnpm tsx scripts/backfill-household-checkin-events.ts --apply
 */

import { execFileSync } from 'node:child_process'

const REGION = 'us-west-2'
const PERSON_TABLE = 'Person-dwoibtanijguhot2azh4z4z4ua-NONE'
const CHECK_IN_TABLE = 'CheckIn-dwoibtanijguhot2azh4z4z4ua-NONE'
const apply = process.argv.includes('--apply')

type AttributeValue = {
  S?: string
  N?: string
  BOOL?: boolean
  NULL?: boolean
  L?: AttributeValue[]
  M?: Record<string, AttributeValue>
}

interface ScanResult {
  Items?: Array<Record<string, AttributeValue>>
}

const aws = (args: string[]): string =>
  execFileSync('aws', args, {
    encoding: 'utf8',
    env: { ...process.env, AWS_EC2_METADATA_DISABLED: 'true' },
    stdio: ['ignore', 'pipe', 'inherit'],
  })

const scan = (tableName: string, projection: string): ScanResult =>
  JSON.parse(
    aws([
      'dynamodb',
      'scan',
      '--table-name',
      tableName,
      '--region',
      REGION,
      '--projection-expression',
      projection,
      '--output',
      'json',
    ]),
  ) as ScanResult

const unmarshall = (value: AttributeValue | undefined): unknown => {
  if (!value) return undefined
  if (value.S !== undefined) return value.S
  if (value.N !== undefined) return Number(value.N)
  if (value.BOOL !== undefined) return value.BOOL
  if (value.NULL) return null
  if (value.L) return value.L.map(unmarshall)
  if (value.M) {
    return Object.fromEntries(
      Object.entries(value.M).map(([key, nested]) => [key, unmarshall(nested)]),
    )
  }
  return undefined
}

const marshall = (value: unknown): AttributeValue => {
  if (value === null || value === undefined) return { NULL: true }
  if (typeof value === 'string') return { S: value }
  if (typeof value === 'number') return { N: String(value) }
  if (typeof value === 'boolean') return { BOOL: value }
  if (Array.isArray(value)) return { L: value.map(marshall) }
  if (typeof value === 'object') {
    return {
      M: Object.fromEntries(
        Object.entries(value).map(([key, nested]) => [key, marshall(nested)]),
      ),
    }
  }
  throw new Error(`Unsupported DynamoDB value: ${typeof value}`)
}

const parseAnswers = (value: AttributeValue | undefined): Record<string, unknown> => {
  const decoded = unmarshall(value)
  if (typeof decoded === 'string') {
    try {
      const parsed = JSON.parse(decoded) as unknown
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : {}
    } catch {
      return {}
    }
  }
  return decoded && typeof decoded === 'object'
    ? (decoded as Record<string, unknown>)
    : {}
}

const stringIds = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : []

const dateKey = (occurredAt: string): string => occurredAt.slice(0, 10)

const people = scan(PERSON_TABLE, 'id, householdId').Items ?? []
const householdByPerson = new Map(
  people.flatMap((person) =>
    person.id?.S && person.householdId?.S
      ? ([[person.id.S, person.householdId.S]] as const)
      : [],
  ),
)

const checkIns = (
  scan(CHECK_IN_TABLE, 'id, personId, occurredAt, answersJson').Items ?? []
).flatMap((item) => {
  const id = item.id?.S
  const personId = item.personId?.S
  const occurredAt = item.occurredAt?.S
  const householdId = personId ? householdByPerson.get(personId) : undefined
  if (!id || !personId || !occurredAt || !householdId) return []
  const answers = parseAnswers(item.answersJson)
  return [{ id, householdId, occurredAt, answers, events: stringIds(answers.events) }]
})

const eventUnionByDay = new Map<string, Set<string>>()
for (const checkIn of checkIns) {
  const key = `${checkIn.householdId}:${dateKey(checkIn.occurredAt)}`
  const union = eventUnionByDay.get(key) ?? new Set<string>()
  for (const eventId of checkIn.events) union.add(eventId)
  eventUnionByDay.set(key, union)
}

const changes = checkIns.flatMap((checkIn) => {
  const key = `${checkIn.householdId}:${dateKey(checkIn.occurredAt)}`
  const union = eventUnionByDay.get(key) ?? new Set<string>()
  const merged = [...new Set([...checkIn.events, ...union])].sort()
  const added = merged.filter((eventId) => !checkIn.events.includes(eventId))
  return added.length ? [{ ...checkIn, merged, added }] : []
})

const affectedDates = new Set(
  changes.map((change) => `${change.householdId}:${dateKey(change.occurredAt)}`),
)
const additions = changes.reduce((total, change) => total + change.added.length, 0)

console.log(
  `${apply ? 'Applying' : 'Dry run'}: ${additions} event additions across ${changes.length} check-ins on ${affectedDates.size} household-days.`,
)

if (!apply) {
  console.log(
    'No records changed. Re-run with --apply to perform the additive backfill.',
  )
  process.exit(0)
}

for (const [index, change] of changes.entries()) {
  const answers = { ...change.answers, events: change.merged }
  aws([
    'dynamodb',
    'update-item',
    '--table-name',
    CHECK_IN_TABLE,
    '--region',
    REGION,
    '--key',
    JSON.stringify({ id: { S: change.id } }),
    '--update-expression',
    'SET answersJson = :answers, updatedAt = :updatedAt',
    '--expression-attribute-values',
    JSON.stringify({
      ':answers': marshall(answers),
      ':updatedAt': { S: new Date().toISOString() },
    }),
    '--condition-expression',
    'attribute_exists(id)',
  ])
  if ((index + 1) % 25 === 0)
    console.log(`Updated ${index + 1}/${changes.length} check-ins…`)
}

console.log(
  `Backfill complete: ${additions} event additions across ${changes.length} check-ins.`,
)
