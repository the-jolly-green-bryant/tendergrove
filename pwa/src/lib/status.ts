import { parseAnswers } from '../features/people/checkin/checkInUtils'
import { RawIndicator } from '../features/patterns/analytics'

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

  let positives = 0
  for (const ind of active) {
    const wasChecked = checked.has(ind.id)
    const isDesired = ind.polarity === 'desired'

    if ((isDesired && wasChecked) || (!isDesired && !wasChecked)) {
      positives++
    }
  }

  return Math.round((positives / active.length) * 100)
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
  good: { label: 'Doing Well', color: 'success' },
  trouble: { label: 'Moderate Risk', color: 'warning' },
  'at-risk': { label: 'Needs attention', color: 'danger' },
  unknown: { label: 'No Data', color: 'medium' },
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
): Status => statusFromScore(computeWeightedScore(indicators, checkIns, now))

export const explainPersonStatus = (
  indicators: RawIndicator[],
  checkIns: CheckInLike[],
  now: Date = new Date(),
): string => {
  const active = indicators.filter((indicator) => indicator.active !== false)
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
    `This status uses ${active.length} active signals and ${recent.length} check-ins from the last ${STATUS_LOOKBACK_DAYS} days.`,
    'Desired signals count positively when checked. Difficult signals count positively when absent and lower the daily score when checked. Recent check-ins receive more weight. Missing days are ignored—not scored as good or bad.',
    lines.length ? `Recent contributions:\n${lines.join('\n')}` : 'There are no scoreable recent check-ins.',
    'This score reflects only what was recorded. It is not a diagnosis or a measure of immediate safety.',
  ].join('\n\n')
}
