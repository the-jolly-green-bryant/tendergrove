import { parseAnswers } from '../features/people/checkin/checkInUtils'
import {
  buildDailyScores,
  normalizeHousehold,
  type RawIndicator,
  type RawPerson,
} from '../features/patterns/analytics'
import { balancedIndicatorWellness } from './indicatorScoring'
import {
  currentPersonGroveAnalysis,
  GROVE_SCORE_STRAIN_DAYS,
} from './groveScore'
import {
  calculatePatternDynamics,
  DEFAULT_ANALYSIS_DAYS,
  MIN_ANALYSIS_OBSERVATIONS,
  PATTERN_STRAIN_LABELS,
  type PatternDynamics,
  type PatternDynamicsDay,
  type PatternStrainBand,
} from '../features/patterns/analytics/patternDynamics'

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

/** Number of days to look back when computing weighted status. */
export const STATUS_LOOKBACK_DAYS = 30

export const STATUS_THRESHOLDS = {
  good: 80,
  trouble: 60,
} as const

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/**
 *
 */
export type StatusLevel = 'good' | 'trouble' | 'at-risk' | 'unknown'

/**
 *
 */
export interface Status {
  /** 0 – 100 weighted score. `null` when we can't compute. */
  score: number | null
  level: StatusLevel
  label: string
  color: 'success' | 'warning' | 'danger' | 'medium'
}

interface CheckInLike {
  occurredAt: string
  answersJson?: unknown
}

/* ------------------------------------------------------------------ */
/*  Core scoring                                                       */
/* ------------------------------------------------------------------ */

export const computeScore = (
  indicators: RawIndicator[],
  checkIn: CheckInLike,
): number | null => {
  const active = indicators.filter((i) => i.active !== false)
  if (active.length === 0) return null

  const checked = new Set(parseAnswers(checkIn.answersJson).checked)

  return balancedIndicatorWellness(active, checked)
}

/* ------------------------------------------------------------------ */
/*  Weighted average over a lookback window                            */
/* ------------------------------------------------------------------ */

export const computeWeightedScore = (
  indicators: RawIndicator[],
  checkIns: CheckInLike[],
  now: Date = new Date(),
  lookbackDays: number = STATUS_LOOKBACK_DAYS,
): number | null => {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  let weightedSum = 0
  let totalWeight = 0

  for (const ci of checkIns) {
    const ciDate = new Date(ci.occurredAt)
    const ciDay = new Date(ciDate.getFullYear(), ciDate.getMonth(), ciDate.getDate())
    const daysAgo = Math.round(
      (startOfToday.getTime() - ciDay.getTime()) / (1000 * 60 * 60 * 24),
    )

    if (daysAgo < 0 || daysAgo >= lookbackDays) continue

    const score = computeScore(indicators, ci)
    if (score === null) continue

    // weight: today (daysAgo=0) → 1, oldest day → 1/lookbackDays
    const weight = (lookbackDays - daysAgo) / lookbackDays

    weightedSum += score * weight
    totalWeight += weight
  }

  if (totalWeight === 0) return null
  return Math.round(weightedSum / totalWeight)
}

/* ------------------------------------------------------------------ */
/*  Level / label derivation                                           */
/* ------------------------------------------------------------------ */

export const levelFromScore = (score: number): StatusLevel => {
  if (score >= STATUS_THRESHOLDS.good) return 'good'
  if (score >= STATUS_THRESHOLDS.trouble) return 'trouble'
  return 'at-risk'
}

const levelMeta: Record<StatusLevel, { label: string; color: Status['color'] }> = {
  good: { label: 'Steady', color: 'success' },
  trouble: { label: 'Watch', color: 'warning' },
  'at-risk': { label: 'Concern', color: 'danger' },
  unknown: { label: 'No data', color: 'medium' },
}

export const statusFromScore = (score: number | null): Status => {
  if (score === null) {
    return { score: null, level: 'unknown', ...levelMeta.unknown }
  }
  const level = levelFromScore(score)
  return { score, level, ...levelMeta[level] }
}

/* ------------------------------------------------------------------ */
/*  Today's mood emoji                                                 */
/* ------------------------------------------------------------------ */

const hashCode = (str: string): number => {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export const todayEmoji = (
  indicators: RawIndicator[],
  checkIns: CheckInLike[],
  now: Date = new Date(),
  personId = '',
): string | null => {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const todayCheckIns = checkIns.filter((ci) => {
    const d = new Date(ci.occurredAt)
    return (
      d.getFullYear() === startOfToday.getFullYear() &&
      d.getMonth() === startOfToday.getMonth() &&
      d.getDate() === startOfToday.getDate()
    )
  })

  if (todayCheckIns.length === 0) return null

  // Use the simple (unweighted) score for just today's check-ins
  const scores = todayCheckIns
    .map((ci) => computeScore(indicators, ci))
    .filter((s): s is number => s !== null)

  if (scores.length === 0) return null

  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  const level = levelFromScore(avg)

  // Deterministic pick based on personId + date + level so the emoji
  // stays stable across re-renders / page navigations within the same day.
  const dateKey = `${startOfToday.getFullYear()}-${startOfToday.getMonth()}-${startOfToday.getDate()}`
  const seed = hashCode(`${personId}:${dateKey}:${level}`)
  const pick = (arr: string[]) => arr[seed % arr.length]

  if (level === 'good')
    return pick(['😎', '😄', '🤩', '😁', '🥳', '😊', '🌟', '😃', '🙌', '💪'])
  if (level === 'trouble')
    return pick(['😕', '😟', '🤔', '😐', '😶', '🫤', '😬', '🥺', '😮‍💨', '😣'])
  return pick(['😰', '😢', '😤', '😩', '🥵', '😖', '😫', '😭', '😡', '🤯'])
}

/* ------------------------------------------------------------------ */
/*  Convenience: derive status for a person given their data           */
/* ------------------------------------------------------------------ */

export const derivePersonStatus = (
  indicators: RawIndicator[],
  checkIns: CheckInLike[],
  now?: Date,
): Status => {
  const scoreStatus = statusFromScore(computeWeightedScore(indicators, checkIns, now))
  const dynamics = derivePatternDynamics(indicators, checkIns, now)
  if (dynamics.dataQuality.observedDays < MIN_ANALYSIS_OBSERVATIONS) {
    return { ...scoreStatus, label: scoreStatus.score === null ? 'No data' : 'Pattern forming', color: 'medium' }
  }
  const colorByBand: Record<PatternStrainBand, Status['color']> = {
    low: 'success',
    emerging: 'medium',
    elevated: 'warning',
    sustained: 'danger',
    intensive: 'danger',
  }
  return { ...scoreStatus, label: PATTERN_STRAIN_LABELS[dynamics.band], color: colorByBand[dynamics.band] }
}

/**
 * Authoritative person status for UI surfaces that have the complete person
 * record. This keeps labels aligned with reports and Pattern Strain cards,
 * which include normalized check-ins, incidents, and historical signal timing.
 */
export const derivePersonStatusFromPerson = (
  person: RawPerson,
  now: Date = new Date(),
): Status => {
  const analysis = currentPersonGroveAnalysis(person, now)
  const dynamics = analysis.dynamics
  const scoreStatus = statusFromScore(
    analysis.score?.score ?? null,
  )
  if (!dynamics.dataQuality.isSufficient) {
    return {
      ...scoreStatus,
      label: scoreStatus.score === null ? 'No data' : 'Pattern forming',
      color: 'medium',
    }
  }
  const colorByBand: Record<PatternStrainBand, Status['color']> = {
    low: 'success',
    emerging: 'medium',
    elevated: 'warning',
    sustained: 'danger',
    intensive: 'danger',
  }
  return {
    ...scoreStatus,
    label: PATTERN_STRAIN_LABELS[dynamics.band],
    color: colorByBand[dynamics.band],
  }
}

export const derivePatternDynamics = (
  indicators: RawIndicator[],
  checkIns: CheckInLike[],
  now: Date = new Date(),
): PatternDynamics => {
  const currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - DEFAULT_ANALYSIS_DAYS + 1)
  const difficultIds = new Set(indicators.filter((indicator) => indicator.polarity === 'undesired').map((indicator) => indicator.id))
  const positiveIds = new Set(indicators.filter((indicator) => indicator.polarity === 'desired').map((indicator) => indicator.id))
  const grouped = new Map<string, { checked: Set<string>; challenges: Set<string>; positives: Set<string> }>()
  checkIns.forEach((checkIn) => {
    const occurredAt = new Date(checkIn.occurredAt)
    if (occurredAt > now) return
    const key = `${occurredAt.getFullYear()}-${String(occurredAt.getMonth() + 1).padStart(2, '0')}-${String(occurredAt.getDate()).padStart(2, '0')}`
    const values = grouped.get(key) ?? { checked: new Set<string>(), challenges: new Set<string>(), positives: new Set<string>() }
    parseAnswers(checkIn.answersJson).checked.forEach((id) => {
      values.checked.add(id)
      if (difficultIds.has(id)) values.challenges.add(id)
      if (positiveIds.has(id)) values.positives.add(id)
    })
    grouped.set(key, values)
  })
  const indicatorDateKey = (value: string) => {
    const date = new Date(value)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  const days: PatternDynamicsDay[] = [...grouped].flatMap(([date, values]) => {
    const scoreable = indicators.filter((indicator) => {
      if (values.checked.has(indicator.id)) return true
      if (indicator.createdAt && date < indicatorDateKey(indicator.createdAt))
        return false
      if (
        indicator.active === false &&
        (!indicator.updatedAt || date > indicatorDateKey(indicator.updatedAt))
      )
        return false
      return true
    })
    const score = balancedIndicatorWellness(scoreable, values.checked)
    if (score === null) return []
    return [{
      date,
      score,
      challengeCount: values.challenges.size,
      positiveCount: values.positives.size,
      hasChallenges: values.challenges.size > 0,
      hasPositiveSigns: values.positives.size > 0,
    }]
  })
  const currentKey = `${currentStart.getFullYear()}-${String(currentStart.getMonth() + 1).padStart(2, '0')}-${String(currentStart.getDate()).padStart(2, '0')}`
  return calculatePatternDynamics(
    days.filter((day) => day.date >= currentKey),
    days.filter((day) => day.date < currentKey),
  )
}

export const derivePersonPatternDynamics = (
  person: RawPerson,
  now: Date = new Date(),
  windowDays = GROVE_SCORE_STRAIN_DAYS,
): PatternDynamics => {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  const start = new Date(end)
  start.setDate(start.getDate() - windowDays + 1)
  const dateKeys: string[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    dateKeys.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`,
    )
    cursor.setDate(cursor.getDate() + 1)
  }
  const normalized = normalizeHousehold([person], { now, windowDays })
  const scored =
    buildDailyScores(normalized.people, dateKeys).personDailyScores[person.id] ?? []
  const dynamicsDays: PatternDynamicsDay[] = scored.flatMap((day) =>
    day.score === null
      ? []
      : [
          {
            date: day.date,
            score: day.score,
            challengeCount: day.negativeCount,
            positiveCount: day.positiveCount,
            hasChallenges: day.negativeCount > 0,
            hasPositiveSigns: day.positiveCount > 0,
          },
        ],
  )
  const currentStart = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate() - DEFAULT_ANALYSIS_DAYS + 1,
  )
  const currentKey = `${currentStart.getFullYear()}-${String(currentStart.getMonth() + 1).padStart(2, '0')}-${String(currentStart.getDate()).padStart(2, '0')}`
  return calculatePatternDynamics(
    dynamicsDays.filter((day) => day.date >= currentKey),
    dynamicsDays.filter((day) => day.date < currentKey),
  )
}

export const explainPersonStatus = (
  indicators: RawIndicator[],
  checkIns: CheckInLike[],
  now: Date = new Date(),
): string => {
  const active = indicators.filter((indicator) => indicator.active !== false)
  const dynamics = derivePatternDynamics(indicators, checkIns, now)
  const recent = [...checkIns]
    .filter((checkIn) => {
      const days = (now.getTime() - new Date(checkIn.occurredAt).getTime()) / 86_400_000
      return days >= 0 && days < STATUS_LOOKBACK_DAYS
    })
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  const lines = recent.slice(0, 7).map((checkIn) => {
    const score = computeScore(active, checkIn)
    const daysAgo = Math.max(0, Math.floor((now.getTime() - new Date(checkIn.occurredAt).getTime()) / 86_400_000))
    return `${new Date(checkIn.occurredAt).toLocaleDateString()}: ${score ?? 'not scored'}/100 · ${daysAgo === 0 ? 'full recent weight' : `weight decreases with age (${daysAgo} days ago)`}`
  })
  return [
    `Pattern Strain is ${PATTERN_STRAIN_LABELS[dynamics.band]}. It uses ${dynamics.dataQuality.observedDays} observed days from the recent ${DEFAULT_ANALYSIS_DAYS}-day window and ${dynamics.dataQuality.baselineDays} earlier baseline days.`,
    `Burden: ${dynamics.burden}/100. Instability: ${dynamics.instability}/100. Persistence: ${dynamics.persistence}/100. Recovery difficulty: ${dynamics.recoveryDifficulty}/100. These are descriptive pattern dimensions, not clinical scores.`,
    `This view also retains the existing wellness calculation using ${active.length} active signals and ${recent.length} check-ins from the last ${STATUS_LOOKBACK_DAYS} days.`,
    'Desired signals count positively when checked. Difficult signals lower the daily score only when they are explicitly recorded; leaving one unchecked is neutral. Recent check-ins receive more weight. Missing days are ignored—not scored as good or bad.',
    lines.length ? `Recent contributions:\n${lines.join('\n')}` : 'There are no scoreable recent check-ins.',
    'This score reflects only what was recorded. It is not a diagnosis or a measure of immediate safety.',
  ].join('\n\n')
}
