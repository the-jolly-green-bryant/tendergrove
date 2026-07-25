import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  ScanCommand,
  type ScanCommandInput,
} from '@aws-sdk/lib-dynamodb'

type AppSyncEvent = {
  identity?: {
    claims?: Record<string, unknown>
  }
}

type AnalyticsItem = {
  owner?: string
  eventName?: string
  occurredAt?: string
  propertiesJson?: unknown
}

type Profile = {
  role?: string
  wellnessBand?: number | null
  strain?: string
  observationCountBand?: number
}

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}))

const parseProperties = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : {}
    } catch {
      return {}
    }
  }
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {}
}

const dayKey = (date: Date) => date.toISOString().slice(0, 10)
const daysAgo = (days: number) => {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - days)
  return date
}

const increment = (record: Record<string, number>, key: string) => {
  record[key] = (record[key] ?? 0) + 1
}

export const handler = async (event: AppSyncEvent): Promise<string> => {
  const email = String(event.identity?.claims?.email ?? '').trim().toLowerCase()
  const emailVerified = event.identity?.claims?.email_verified
  if (
    !email.endsWith('@bryantjames.com') ||
    (emailVerified !== true && emailVerified !== 'true')
  ) {
    throw new Error('Analytics dashboard access is restricted.')
  }

  const tableName = process.env.ANALYTICS_TABLE_NAME
  if (!tableName) throw new Error('Analytics storage is not configured.')

  const items: AnalyticsItem[] = []
  let exclusiveStartKey: ScanCommandInput['ExclusiveStartKey']
  do {
    const result = await documentClient.send(
      new ScanCommand({
        TableName: tableName,
        ProjectionExpression:
          '#owner, eventName, occurredAt, propertiesJson',
        ExpressionAttributeNames: { '#owner': 'owner' },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    )
    items.push(...((result.Items ?? []) as AnalyticsItem[]))
    exclusiveStartKey = result.LastEvaluatedKey
  } while (exclusiveStartKey)

  const sevenDayStart = daysAgo(6)
  const thirtyDayStart = daysAgo(29)
  const active7 = new Set<string>()
  const active30 = new Set<string>()
  const allAccounts = new Set<string>()
  const onboardingAccounts = new Set<string>()
  const reportAccounts = new Set<string>()
  const collaborationAccounts = new Set<string>()
  const screenViews: Record<string, number> = {}
  const strainDistribution: Record<string, number> = {}
  const wellnessDistribution: Record<string, number> = {}
  const roleDistribution: Record<string, number> = {}
  const daily = new Map<
    string,
    { accounts: Set<string>; events: number; checkIns: number; reports: number }
  >()
  const latestProfiles = new Map<
    string,
    { occurredAt: string; properties: Record<string, unknown> }
  >()

  for (const item of items) {
    if (!item.owner || !item.eventName || !item.occurredAt) continue
    const date = new Date(item.occurredAt)
    if (Number.isNaN(date.getTime())) continue
    const properties = parseProperties(item.propertiesJson)
    allAccounts.add(item.owner)
    if (date >= sevenDayStart) active7.add(item.owner)
    if (date >= thirtyDayStart) active30.add(item.owner)

    const day = dayKey(date)
    const dailyItem = daily.get(day) ?? {
      accounts: new Set<string>(),
      events: 0,
      checkIns: 0,
      reports: 0,
    }
    dailyItem.accounts.add(item.owner)
    dailyItem.events += 1
    if (item.eventName === 'check_in_saved') dailyItem.checkIns += 1
    if (item.eventName === 'report_downloaded') dailyItem.reports += 1
    daily.set(day, dailyItem)

    if (item.eventName === 'screen_viewed') {
      increment(screenViews, String(properties.screen ?? 'other'))
    }
    if (item.eventName === 'onboarding_completed') {
      onboardingAccounts.add(item.owner)
    }
    if (item.eventName === 'report_downloaded') reportAccounts.add(item.owner)
    if (item.eventName === 'collaboration_granted') {
      collaborationAccounts.add(item.owner)
    }
    if (item.eventName === 'household_profile') {
      const existing = latestProfiles.get(item.owner)
      if (!existing || existing.occurredAt < item.occurredAt) {
        latestProfiles.set(item.owner, {
          occurredAt: item.occurredAt,
          properties,
        })
      }
    }
  }

  let totalPeople = 0
  let selfTrackingAccounts = 0
  for (const { properties } of latestProfiles.values()) {
    totalPeople += Number(properties.peopleCount ?? 0)
    if (properties.selfTracked === true) selfTrackingAccounts += 1
    const profiles = Array.isArray(properties.profiles)
      ? (properties.profiles as Profile[])
      : []
    for (const profile of profiles) {
      increment(roleDistribution, profile.role ?? 'other')
      increment(strainDistribution, profile.strain ?? 'insufficient')
      const band =
        typeof profile.wellnessBand === 'number'
          ? String(profile.wellnessBand)
          : 'unknown'
      increment(wellnessDistribution, band)
    }
  }

  const recentDaily = [...daily.entries()]
    .filter(([date]) => date >= dayKey(thirtyDayStart))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({
      date,
      activeAccounts: value.accounts.size,
      events: value.events,
      checkIns: value.checkIns,
      reports: value.reports,
    }))

  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    accounts: {
      totalObserved: allAccounts.size,
      active7Days: active7.size,
      active30Days: active30.size,
      onboardingCompleted: onboardingAccounts.size,
      downloadedReport: reportAccounts.size,
      collaborationActivated: collaborationAccounts.size,
    },
    households: {
      profilesAvailable: latestProfiles.size,
      averagePeopleTracked: latestProfiles.size
        ? Math.round((totalPeople / latestProfiles.size) * 10) / 10
        : 0,
      selfTrackingAccounts,
    },
    totalEvents: items.length,
    screenViews,
    strainDistribution,
    wellnessDistribution,
    roleDistribution,
    daily: recentDaily,
  })
}

