import type { RawPerson } from '../features/patterns/analytics'
import { currentPersonGroveAnalysis } from './groveScore'
import { client } from './api'

export const ANALYTICS_SCHEMA_VERSION = 1

const SCREEN_NAMES = [
  'dashboard',
  'onboarding',
  'person',
  'check_in',
  'patterns',
  'reports',
  'safety',
  'settings',
  'research',
  'legal',
  'other',
] as const

type ScreenName = (typeof SCREEN_NAMES)[number]
type RoleGroup = 'child' | 'self' | 'adult' | 'other'
type StrainBand =
  | 'insufficient'
  | 'low'
  | 'emerging'
  | 'elevated'
  | 'sustained'
  | 'intensive'

type AnalyticsPayloads = {
  screen_viewed: { screen: ScreenName }
  household_profile: {
    peopleCount: number
    selfTracked: boolean
    profiles: Array<{
      role: RoleGroup
      wellnessBand: number | null
      strain: StrainBand
      observationCountBand: number
    }>
  }
  check_in_saved: {
    mode: 'created' | 'updated'
    selectedSignalCountBand: number
    selectedEventCountBand: number
    hasNote: boolean
  }
  onboarding_completed: {
    peopleCount: number
    selfTracked: boolean
  }
  report_downloaded: {
    format: 'pdf'
    strain: StrainBand
    wellnessBand: number | null
  }
  collaboration_granted: { access: 'read_only' }
}

export type AnalyticsEventName = keyof AnalyticsPayloads

const clampInteger = (value: number, maximum: number) =>
  Math.max(0, Math.min(maximum, Math.round(value)))

export const wellnessBand = (score: number | null | undefined): number | null =>
  score === null || score === undefined
    ? null
    : Math.min(9, Math.max(0, Math.floor(score / 10)))

export const countBand = (count: number): number => {
  if (count <= 0) return 0
  if (count <= 2) return 1
  if (count <= 5) return 2
  if (count <= 10) return 3
  if (count <= 20) return 4
  if (count <= 50) return 5
  return 6
}

const roleGroup = (role: RawPerson['role']): RoleGroup => {
  if (role === 'child') return 'child'
  if (role === 'self') return 'self'
  if (role === 'parent' || role === 'spouse' || role === 'caregiver') return 'adult'
  return 'other'
}

const strainBand = (
  band: ReturnType<typeof currentPersonGroveAnalysis>['dynamics']['band'] | undefined,
): StrainBand => band ?? 'insufficient'

export const screenNameForPath = (pathname: string): ScreenName => {
  if (pathname === '/dashboard') return 'dashboard'
  if (pathname === '/onboarding') return 'onboarding'
  if (pathname.includes('check-in')) return 'check_in'
  if (pathname.startsWith('/person/')) return 'person'
  if (pathname.startsWith('/patterns')) return 'patterns'
  if (pathname.startsWith('/reports')) return 'reports'
  if (pathname === '/help-now') return 'safety'
  if (pathname === '/settings') return 'settings'
  if (pathname.startsWith('/about/')) return 'research'
  if (pathname === '/privacy' || pathname === '/terms') return 'legal'
  return 'other'
}

export const buildHouseholdProfile = (
  people: RawPerson[],
): AnalyticsPayloads['household_profile'] => {
  const active = people.filter((person) => !person.archived).slice(0, 20)
  return {
    peopleCount: active.length,
    selfTracked: active.some((person) => person.role === 'self'),
    profiles: active.map((person) => {
      const analysis = currentPersonGroveAnalysis(person)
      return {
        role: roleGroup(person.role),
        wellnessBand: wellnessBand(analysis.score?.score),
        strain: strainBand(analysis.dynamics.band),
        observationCountBand: countBand(person.checkIns?.length ?? 0),
      }
    }),
  }
}

/**
 * This is the analytics privacy boundary. Callers cannot send arbitrary
 * properties, and the runtime copy below strips unexpected keys before storage.
 */
export const sanitizeAnalyticsPayload = <Name extends AnalyticsEventName>(
  name: Name,
  payload: AnalyticsPayloads[Name],
): AnalyticsPayloads[Name] => {
  switch (name) {
    case 'screen_viewed':
      return {
        screen: SCREEN_NAMES.includes(
          (payload as AnalyticsPayloads['screen_viewed']).screen,
        )
          ? (payload as AnalyticsPayloads['screen_viewed']).screen
          : 'other',
      } as AnalyticsPayloads[Name]
    case 'household_profile': {
      const value = payload as AnalyticsPayloads['household_profile']
      return {
        peopleCount: clampInteger(value.peopleCount, 20),
        selfTracked: Boolean(value.selfTracked),
        profiles: value.profiles.slice(0, 20).map((profile) => ({
          role: ['child', 'self', 'adult', 'other'].includes(profile.role)
            ? profile.role
            : 'other',
          wellnessBand:
            profile.wellnessBand === null
              ? null
              : clampInteger(profile.wellnessBand, 9),
          strain: [
            'insufficient',
            'low',
            'emerging',
            'elevated',
            'sustained',
            'intensive',
          ].includes(profile.strain)
            ? profile.strain
            : 'insufficient',
          observationCountBand: clampInteger(profile.observationCountBand, 6),
        })),
      } as AnalyticsPayloads[Name]
    }
    case 'check_in_saved': {
      const value = payload as AnalyticsPayloads['check_in_saved']
      return {
        mode: value.mode === 'updated' ? 'updated' : 'created',
        selectedSignalCountBand: clampInteger(value.selectedSignalCountBand, 6),
        selectedEventCountBand: clampInteger(value.selectedEventCountBand, 6),
        hasNote: Boolean(value.hasNote),
      } as AnalyticsPayloads[Name]
    }
    case 'onboarding_completed': {
      const value = payload as AnalyticsPayloads['onboarding_completed']
      return {
        peopleCount: clampInteger(value.peopleCount, 20),
        selfTracked: Boolean(value.selfTracked),
      } as AnalyticsPayloads[Name]
    }
    case 'report_downloaded': {
      const value = payload as AnalyticsPayloads['report_downloaded']
      return {
        format: 'pdf',
        strain: [
          'insufficient',
          'low',
          'emerging',
          'elevated',
          'sustained',
          'intensive',
        ].includes(value.strain)
          ? value.strain
          : 'insufficient',
        wellnessBand:
          value.wellnessBand === null
            ? null
            : clampInteger(value.wellnessBand, 9),
      } as AnalyticsPayloads[Name]
    }
    case 'collaboration_granted':
      return { access: 'read_only' } as AnalyticsPayloads[Name]
  }
}

export const trackProductEvent = async <Name extends AnalyticsEventName>(
  name: Name,
  payload: AnalyticsPayloads[Name],
): Promise<void> => {
  try {
    await client.models.AnalyticsEvent.create({
      eventName: name,
      schemaVersion: ANALYTICS_SCHEMA_VERSION,
      occurredAt: new Date().toISOString(),
      propertiesJson: sanitizeAnalyticsPayload(name, payload),
    })
  } catch {
    // Analytics must never interrupt care documentation or navigation.
  }
}
