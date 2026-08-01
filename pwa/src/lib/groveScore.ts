import {
  buildDailyScores,
  computeTrend,
  normalizeHousehold,
  type RawPerson,
  type TrendPoint,
} from '../features/patterns/analytics'
import {
  calculatePatternDynamics,
  DEFAULT_ANALYSIS_DAYS,
  type PatternDynamics,
  type PatternDynamicsDay,
} from '../features/patterns/analytics/patternDynamics'

export const GROVE_SCORE_VERSION = 'v1' as const
export const GROVE_SCORE_HISTORY_DAYS = 1095
export const GROVE_SCORE_STRAIN_DAYS = 90

export const GROVE_SCORE_WEIGHTS = {
  wellness: 0.8,
  burden: 0.08,
  persistence: 0.04,
  recoveryDifficulty: 0.05,
  instability: 0.03,
} as const

export const GROVE_SCORE_PRESSURE_LIMITS = {
  negativeTrajectory: 16,
  worseningEvents: 12,
} as const

export const GROVE_SCORE_RECOVERY_RATES = {
  low: 0.22,
  emerging: 0.16,
  elevated: 0.11,
  sustained: 0.07,
  standard: 0.13,
} as const

export const GROVE_SCORE_REGRESSION_RATES = {
  low: 0.22,
  emerging: 0.32,
  elevatedOrHigher: 0.42,
} as const

export const GROVE_SCORE_SETBACK_DECAY = {
  low: 0.55,
  emerging: 0.72,
  elevatedOrHigher: 0.84,
} as const

/**
 * Controls the soft lower bound applied after longitudinal pressures.
 * A smaller value stays closer to a hard zero; this value preserves visible
 * distinctions among very low scores without materially lifting them.
 */
export const GROVE_SCORE_SOFT_FLOOR_SCALE = 5

export interface GroveScoreBreakdown {
  version: typeof GROVE_SCORE_VERSION
  score: number
  rawWellness: number
  confidenceFactor: number
  effectiveWeights: {
    wellness: number
    burden: number
    persistence: number
    recoveryDifficulty: number
    instability: number
  }
  components: {
    burden: number
    persistence: number
    recoveryDifficulty: number
    instability: number
  }
}

export interface GroveScoreAnalysis {
  score: GroveScoreBreakdown | null
  dynamics: PatternDynamics
}

const personAnalysisCache = new WeakMap<
  RawPerson,
  Map<string, GroveScoreAnalysis>
>()

const clamp = (value: number) => Math.max(0, Math.min(100, value))
const round = (value: number) => Math.round(clamp(value))
const roundTrend = (value: number) => Math.round(clamp(value) * 10) / 10

/**
 * A softplus floor keeps severely pressured values ordered instead of
 * collapsing every latent value below zero to the same displayed zero.
 */
export const applyGroveScoreSoftFloor = (value: number): number => {
  const scaled = value / GROVE_SCORE_SOFT_FLOOR_SCALE
  if (scaled > 20) return Math.min(100, value)
  if (scaled < -20) return 0
  return Math.min(
    100,
    GROVE_SCORE_SOFT_FLOOR_SCALE * Math.log1p(Math.exp(scaled)),
  )
}

/**
 * Grove Score v1 combines the current observation-based wellness score with
 * longitudinal Pattern Strain dimensions. At full confidence the documented
 * 80/8/4/5/3 weights apply. With limited longitudinal evidence, the
 * temporal weights fade toward zero and the observed wellness score carries
 * the result, so missing history cannot manufacture strain.
 */
export const calculateGroveScore = (
  rawWellness: number | null,
  dynamics: PatternDynamics,
): GroveScoreBreakdown | null => {
  if (rawWellness === null) return null

  const confidenceFactor = dynamics.dataQuality.isSufficient
    ? clamp(dynamics.confidence) / 100
    : 0
  const effectiveWeights = {
    burden: GROVE_SCORE_WEIGHTS.burden * confidenceFactor,
    persistence: GROVE_SCORE_WEIGHTS.persistence * confidenceFactor,
    recoveryDifficulty:
      GROVE_SCORE_WEIGHTS.recoveryDifficulty * confidenceFactor,
    instability: GROVE_SCORE_WEIGHTS.instability * confidenceFactor,
  }
  const temporalWeight =
    effectiveWeights.burden +
    effectiveWeights.persistence +
    effectiveWeights.recoveryDifficulty +
    effectiveWeights.instability
  const wellnessWeight = 1 - temporalWeight
  const components = {
    burden: 100 - dynamics.burden,
    persistence: 100 - dynamics.persistence,
    recoveryDifficulty: 100 - dynamics.recoveryDifficulty,
    instability: 100 - dynamics.instability,
  }
  const score =
    rawWellness * wellnessWeight +
    components.burden * effectiveWeights.burden +
    components.persistence * effectiveWeights.persistence +
    components.recoveryDifficulty * effectiveWeights.recoveryDifficulty +
    components.instability * effectiveWeights.instability

  return {
    version: GROVE_SCORE_VERSION,
    score: round(score),
    rawWellness: round(rawWellness),
    confidenceFactor,
    effectiveWeights: {
      wellness: wellnessWeight,
      ...effectiveWeights,
    },
    components,
  }
}

const shiftDate = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + days)
  return value.toISOString().slice(0, 10)
}

const mean = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null

const observedBetween = (
  days: PatternDynamicsDay[],
  start: string,
  end: string,
) =>
  days.filter(
    (day) =>
      day.score !== null &&
      day.date >= start &&
      day.date <= end,
  )

export const negativeTrajectoryPressure = (
  days: PatternDynamicsDay[],
  date: string,
): number => {
  const recentStart = shiftDate(date, -13)
  const priorEnd = shiftDate(recentStart, -1)
  const priorStart = shiftDate(priorEnd, -13)
  const recent = observedBetween(days, recentStart, date)
  const prior = observedBetween(days, priorStart, priorEnd)
  if (recent.length < 3 || prior.length < 3) return 0

  const recentCount = mean(recent.map((day) => day.challengeCount)) ?? 0
  const priorCount = mean(prior.map((day) => day.challengeCount)) ?? 0
  const recentFrequency =
    recent.filter((day) => day.hasChallenges).length / recent.length
  const priorFrequency =
    prior.filter((day) => day.hasChallenges).length / prior.length
  const countIncrease = Math.max(0, recentCount - priorCount)
  const frequencyIncrease = Math.max(0, recentFrequency - priorFrequency)

  return Math.min(
    GROVE_SCORE_PRESSURE_LIMITS.negativeTrajectory,
    Math.round(countIncrease * 2.5 + frequencyIncrease * 14),
  )
}

const worseningEventPressure = (
  points: readonly TrendPoint[],
  index: number,
): number => {
  const eventScores = points
    .slice(0, index + 1)
    .flatMap((point) =>
      point.eventCount > 0 && point.score !== null ? [point.score] : [],
    )
    .slice(-6)
  if (eventScores.length < 4) return 0
  const split = Math.floor(eventScores.length / 2)
  const earlier = mean(eventScores.slice(0, split))
  const later = mean(eventScores.slice(split))
  if (earlier === null || later === null || later >= earlier) return 0
  return Math.min(
    GROVE_SCORE_PRESSURE_LIMITS.worseningEvents,
    Math.round((earlier - later) * 0.25),
  )
}

export const groveScoreRecoveryAlpha = (
  dynamics: Pick<
    PatternDynamics,
    'band' | 'persistence' | 'recoveryDifficulty'
  >,
): number => {
  if (dynamics.band === 'low') return GROVE_SCORE_RECOVERY_RATES.low
  if (dynamics.band === 'emerging')
    return GROVE_SCORE_RECOVERY_RATES.emerging
  if (dynamics.band === 'elevated')
    return GROVE_SCORE_RECOVERY_RATES.elevated
  if (
    dynamics.band === 'sustained' ||
    dynamics.band === 'intensive' ||
    dynamics.persistence >= 50 ||
    dynamics.recoveryDifficulty >= 50
  ) {
    return GROVE_SCORE_RECOVERY_RATES.sustained
  }
  return GROVE_SCORE_RECOVERY_RATES.standard
}

export const groveScoreRegressionAlpha = (
  dynamics: Pick<PatternDynamics, 'band'>,
): number => {
  if (dynamics.band === 'low') return GROVE_SCORE_REGRESSION_RATES.low
  if (dynamics.band === 'emerging')
    return GROVE_SCORE_REGRESSION_RATES.emerging
  return GROVE_SCORE_REGRESSION_RATES.elevatedOrHigher
}

/** Applies Grove Score v1 independently at every chart date. */
export const buildGroveScoreTrend = (
  points: readonly TrendPoint[],
  days: PatternDynamicsDay[],
): TrendPoint[] => {
  let weightedScore: number | null = null
  let setbackMemory = 0
  return points.map((point, index) => {
    if (point.score === null) {
      return {
        ...point,
        rollingAverage:
          weightedScore === null ? null : roundTrend(weightedScore),
      }
    }
    const currentStart = shiftDate(point.date, -(DEFAULT_ANALYSIS_DAYS - 1))
    const strainStart = shiftDate(point.date, -(GROVE_SCORE_STRAIN_DAYS - 1))
    const dynamics = calculatePatternDynamics(
      days.filter((day) => day.date >= currentStart && day.date <= point.date),
      days.filter(
        (day) =>
          day.date >= strainStart &&
          day.date < currentStart,
      ),
    )
    const dailyScore = calculateGroveScore(point.score, dynamics)?.score ?? null
    if (dailyScore !== null) {
      const priorScores = points
        .slice(Math.max(0, index - 28), index)
        .flatMap((candidate) =>
          candidate.score === null ? [] : [candidate.score],
        )
      const personalRange = mean(priorScores)
      const disproportionateDrop =
        personalRange === null
          ? 0
          : Math.max(0, personalRange - point.score - 15)
      const setbackDecay =
        dynamics.band === 'low'
          ? GROVE_SCORE_SETBACK_DECAY.low
          : dynamics.band === 'emerging'
            ? GROVE_SCORE_SETBACK_DECAY.emerging
            : GROVE_SCORE_SETBACK_DECAY.elevatedOrHigher
      setbackMemory = Math.max(
        setbackMemory * setbackDecay,
        disproportionateDrop * 0.45,
      )
      const trajectoryPressure = negativeTrajectoryPressure(days, point.date)
      const eventPressure = worseningEventPressure(points, index)
      const adjustedDailyScore = applyGroveScoreSoftFloor(
        dailyScore - trajectoryPressure - eventPressure - setbackMemory,
      )
      if (weightedScore === null) {
        weightedScore = adjustedDailyScore
      } else {
        const alpha =
          adjustedDailyScore < weightedScore
            ? groveScoreRegressionAlpha(dynamics)
            : groveScoreRecoveryAlpha(dynamics)
        weightedScore =
          alpha * adjustedDailyScore + (1 - alpha) * weightedScore
      }
    }
    return {
      ...point,
      score: dailyScore,
      rollingAverage:
        weightedScore === null ? null : roundTrend(weightedScore),
    }
  })
}

const dateKeysEndingAt = (now: Date, days: number) => {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  const start = new Date(end)
  start.setDate(start.getDate() - days + 1)
  const keys: string[] = []
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    keys.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`,
    )
  }
  return keys
}

/** Current raw trend value used as the observation component everywhere. */
export const currentTrendWellness = (
  person: RawPerson,
  now: Date = new Date(),
): number | null => {
  const dates = dateKeysEndingAt(now, GROVE_SCORE_HISTORY_DAYS)
  const normalized = normalizeHousehold([person], {
    now,
    windowDays: GROVE_SCORE_HISTORY_DAYS,
  })
  const scores =
    buildDailyScores(normalized.people, dates).personDailyScores[person.id] ?? []
  return (
    computeTrend(
      scores.map((day) => ({
        date: day.date,
        score: day.score,
        eventCount: day.eventCount,
      })),
    ).points.at(-1)?.rollingAverage ?? null
  )
}

export const currentPersonGroveAnalysis = (
  person: RawPerson,
  now: Date = new Date(),
): GroveScoreAnalysis => {
  const cacheKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
  const cached = personAnalysisCache.get(person)?.get(cacheKey)
  if (cached) return cached

  const dates = dateKeysEndingAt(now, GROVE_SCORE_HISTORY_DAYS)
  const normalized = normalizeHousehold([person], {
    now,
    windowDays: GROVE_SCORE_HISTORY_DAYS,
  })
  const scores =
    buildDailyScores(normalized.people, dates).personDailyScores[person.id] ?? []
  const rawTrend = computeTrend(
    scores.map((day) => ({
      date: day.date,
      score: day.score,
      eventCount: day.eventCount,
    })),
  )
  const patternDays: PatternDynamicsDay[] = scores.map((day) => ({
    date: day.date,
    score: day.score,
    challengeCount: day.negativeCount,
    positiveCount: day.positiveCount,
    hasChallenges: day.negativeCount > 0,
    hasPositiveSigns: day.positiveCount > 0,
  }))
  const endDate = dates.at(-1)!
  const currentStart = shiftDate(endDate, -(DEFAULT_ANALYSIS_DAYS - 1))
  const strainStart = shiftDate(endDate, -(GROVE_SCORE_STRAIN_DAYS - 1))
  const dynamics = calculatePatternDynamics(
    patternDays.filter((day) => day.date >= currentStart),
    patternDays.filter(
      (day) => day.date >= strainStart && day.date < currentStart,
    ),
  )
  const base = calculateGroveScore(
    rawTrend.points.at(-1)?.rollingAverage ?? null,
    dynamics,
  )
  const score = base
    ? {
        ...base,
        score:
          round(
            buildGroveScoreTrend(rawTrend.points, patternDays).at(-1)
              ?.rollingAverage ?? base.score,
          ),
      }
    : null
  const analysis = { score, dynamics }
  const personCache = personAnalysisCache.get(person) ?? new Map()
  personCache.set(cacheKey, analysis)
  personAnalysisCache.set(person, personCache)
  return analysis
}

export const currentPersonGroveScore = (
  person: RawPerson,
  now: Date = new Date(),
): GroveScoreBreakdown | null => currentPersonGroveAnalysis(person, now).score
