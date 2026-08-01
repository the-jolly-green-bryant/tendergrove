export const DEFAULT_ANALYSIS_DAYS = 28
export const MIN_ANALYSIS_OBSERVATIONS = 7
export const MIN_BASELINE_OBSERVATIONS = 14
export const MAX_CONTINUITY_GAP_DAYS = 2
export const MIN_CLASSIFICATION_CONFIDENCE = 45
export const ABSOLUTE_DIFFICULT_SCORE = 50

/** Descriptive band derived from the four Pattern Strain dimensions. */
export type PatternStrainBand =
  | 'low'
  | 'emerging'
  | 'elevated'
  | 'sustained'
  | 'intensive'
/** Dimension associated with a deterministic explanatory observation. */
export type PatternDynamicsDimension =
  | 'burden'
  | 'instability'
  | 'persistence'
  | 'recovery'
  | 'combined'
  | 'data-quality'

/** One observed calendar day used by Pattern Strain calculations. */
export interface PatternDynamicsDay {
  date: string
  score: number | null
  challengeCount: number
  positiveCount: number
  hasChallenges: boolean
  hasPositiveSigns: boolean
}

/** Human-readable evidence generated from one Pattern Strain dimension. */
export interface PatternDynamicsObservation {
  id: string
  dimension: PatternDynamicsDimension
  importance: 'primary' | 'supporting'
  title: string
  detail: string
}

/** Coverage and transition counts used to qualify Pattern Strain confidence. */
export interface PatternDynamicsDataQuality {
  observedDays: number
  expectedDays: number
  coverage: number
  observedTransitions: number
  baselineDays: number
  isSufficient: boolean
}

/** Complete descriptive result returned by the Pattern Strain engine. */
export interface PatternDynamics {
  burden: number
  instability: number
  persistence: number
  recoveryDifficulty: number
  largestDecline: number
  severeDeclines: number
  intensity: number
  band: PatternStrainBand
  confidence: number
  observations: PatternDynamicsObservation[]
  dataQuality: PatternDynamicsDataQuality
  summary: string
  analysisStart: string | null
  analysisEnd: string | null
  baselineStart: string | null
  baselineEnd: string | null
}

export interface PatternStrainTrendPoint {
  date: string
  intensity: number | null
  band: PatternStrainBand | null
}

interface DimensionInputs {
  burden: number
  instability: number
  persistence: number
  recoveryDifficulty: number
  intensity: number
  confidence: number
}

interface Episode {
  startIndex: number
  endIndex: number
  recoveryIndex: number | null
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)))
const formatPoints = (value: number) =>
  `${value} ${value === 1 ? 'point' : 'points'}`
const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
const dateValue = (date: string) => new Date(`${date}T12:00:00`).getTime()
const shiftDate = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + days)
  return value.toISOString().slice(0, 10)
}
const gapDays = (left: string, right: string) =>
  Math.round((dateValue(right) - dateValue(left)) / 86_400_000)
const observed = (days: PatternDynamicsDay[]) =>
  days
    .filter((day): day is PatternDynamicsDay & { score: number } => day.score !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
const range = (days: PatternDynamicsDay[]) => ({
  start: days[0]?.date ?? null,
  end: days.at(-1)?.date ?? null,
})
const standardDeviation = (values: number[]) => {
  if (values.length < 2) return 0
  const mean = average(values)
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)))
}

const validTransitions = (days: ReturnType<typeof observed>) =>
  days
    .slice(1)
    .flatMap((day, index) =>
      gapDays(days[index].date, day.date) <= MAX_CONTINUITY_GAP_DAYS
        ? [{ previous: days[index], current: day }]
        : [],
    )

// Persistence and recovery operate on the sequence of observations, not the
// calendar between them. Missing days remain unknown, while the observations
// on either side are treated as neighboring samples.
const adjacentObservedTransitions = (days: ReturnType<typeof observed>) =>
  days.slice(1).map((day, index) => ({
    previous: days[index],
    current: day,
  }))

export const rootMeanSquareSuccessiveDifference = (days: PatternDynamicsDay[]) => {
  const transitions = validTransitions(observed(days))
  if (!transitions.length) return 0
  return Math.sqrt(
    average(
      transitions.map(({ previous, current }) => (current.score - previous.score) ** 2),
    ),
  )
}

export const calculateBurden = (
  currentDays: PatternDynamicsDay[],
  baselineDays: PatternDynamicsDay[] = [],
): number => {
  const current = observed(currentDays)
  if (!current.length) return 0
  const baseline = observed(baselineDays)
  const challengeDayRate =
    current.filter((day) => day.hasChallenges).length / current.length
  const challengeDensity = average(current.map((day) => day.challengeCount))
  const coOccurrenceRate =
    current.filter((day) => day.challengeCount >= 2).length / current.length
  const positiveAvailability =
    current.filter((day) => day.hasPositiveSigns).length / current.length
  const baselinePositiveAvailability = baseline.length
    ? baseline.filter((day) => day.hasPositiveSigns).length / baseline.length
    : positiveAvailability
  const lostPositiveAvailability = Math.max(
    0,
    baselinePositiveAvailability - positiveAvailability,
  )
  return clamp(
    challengeDayRate * 40 +
      Math.min(1, challengeDensity / 2) * 25 +
      coOccurrenceRate * 20 +
      lostPositiveAvailability * 15,
  )
}

export const calculateInstability = (
  currentDays: PatternDynamicsDay[],
  baselineDays: PatternDynamicsDay[] = [],
): number => {
  const transitions = validTransitions(observed(currentDays))
  if (!transitions.length) return 0
  const rmssd = rootMeanSquareSuccessiveDifference(currentDays)
  const downward = transitions.map(({ previous, current }) =>
    Math.max(0, previous.score - current.score),
  )
  const largeDeclineRate =
    downward.filter((change) => change >= 15).length / transitions.length
  const largestDecline = Math.max(0, ...downward)
  const baselineRmssd = rootMeanSquareSuccessiveDifference(baselineDays)
  const relativeIncrease =
    baselineRmssd > 0 ? Math.max(0, (rmssd - baselineRmssd) / baselineRmssd) : 0
  return clamp(
    Math.min(1, rmssd / 30) * 35 +
      Math.min(1, average(downward) / 20) * 20 +
      largeDeclineRate * 15 +
      Math.min(1, relativeIncrease) * 10 +
      Math.min(1, largestDecline / 40) * 20,
  )
}

const baselineLowerBound = (
  currentDays: PatternDynamicsDay[],
  baselineDays: PatternDynamicsDay[],
) => {
  const baselineScores = observed(baselineDays).map((day) => day.score)
  const source = baselineScores.length
    ? baselineScores
    : observed(currentDays).map((day) => day.score)
  if (!source.length) return 0
  return Math.max(
    ABSOLUTE_DIFFICULT_SCORE,
    average(source) - Math.max(5, standardDeviation(source)),
  )
}

const isDifficultDay = (
  day: PatternDynamicsDay & { score: number },
  lowerBound: number,
) => day.score < lowerBound || day.hasChallenges

const findEpisodes = (
  days: ReturnType<typeof observed>,
  lowerBound: number,
): Episode[] => {
  const episodes: Episode[] = []
  let index = 0
  while (index < days.length) {
    if (!isDifficultDay(days[index], lowerBound)) {
      index += 1
      continue
    }
    const startIndex = index
    let endIndex = index
    let recoveryIndex: number | null = null
    index += 1
    while (index < days.length) {
      if (
        !isDifficultDay(days[index], lowerBound) &&
        days[index + 1] !== undefined &&
        !isDifficultDay(days[index + 1], lowerBound)
      ) {
        recoveryIndex = index + 1
        index += 2
        break
      }
      if (isDifficultDay(days[index], lowerBound)) endIndex = index
      index += 1
    }
    episodes.push({ startIndex, endIndex, recoveryIndex })
  }
  return episodes
}

export const calculatePersistence = (
  currentDays: PatternDynamicsDay[],
  baselineDays: PatternDynamicsDay[] = [],
): number => {
  const current = observed(currentDays)
  if (!current.length) return 0
  const lowerBound = baselineLowerBound(currentDays, baselineDays)
  const below = current.filter((day) => isDifficultDay(day, lowerBound))
  if (!below.length) return 0
  const transitions = adjacentObservedTransitions(current)
  const belowContinuations = transitions.filter(
    ({ previous, current: day }) =>
      isDifficultDay(previous, lowerBound) && isDifficultDay(day, lowerBound),
  ).length
  const belowTransitionStarts = transitions.filter(({ previous }) =>
    isDifficultDay(previous, lowerBound),
  ).length
  const episodes = findEpisodes(current, lowerBound)
  const longest = Math.max(
    ...episodes.map((episode) => episode.endIndex - episode.startIndex + 1),
  )
  const multiDayRate =
    episodes.filter((episode) => episode.endIndex > episode.startIndex).length /
    episodes.length
  return clamp(
    (below.length / current.length) * 35 +
      (belowTransitionStarts ? belowContinuations / belowTransitionStarts : 0) * 30 +
      Math.min(1, longest / 5) * 25 +
      multiDayRate * 10,
  )
}

export const calculateRecoveryDifficulty = (
  currentDays: PatternDynamicsDay[],
  baselineDays: PatternDynamicsDay[] = [],
): number => {
  const current = observed(currentDays)
  if (!current.length) return 0
  const lowerBound = baselineLowerBound(currentDays, baselineDays)
  const episodes = findEpisodes(current, lowerBound)
  if (!episodes.length) return 0
  const unresolvedRate =
    episodes.filter((episode) => episode.recoveryIndex === null).length /
    episodes.length
  const recoveryLengths = episodes.flatMap((episode) =>
    episode.recoveryIndex === null ? [] : [episode.recoveryIndex - episode.startIndex],
  )
  const recoveryDebt = average(
    current.map((day) => Math.max(0, lowerBound - day.score)),
  )
  const incompleteReturnRate =
    episodes.filter((episode) => {
      if (episode.recoveryIndex === null) return true
      return isDifficultDay(current[episode.recoveryIndex], lowerBound)
    }).length / episodes.length
  return clamp(
    unresolvedRate * 45 +
      Math.min(1, average(recoveryLengths) / 5) * 25 +
      Math.min(1, recoveryDebt / 20) * 20 +
      incompleteReturnRate * 10,
  )
}

export const determinePatternStrainBand = (
  dynamics: DimensionInputs,
): PatternStrainBand => {
  const {
    burden,
    instability,
    persistence,
    recoveryDifficulty,
    intensity,
    confidence,
  } = dynamics
  if (confidence < MIN_CLASSIFICATION_CONFIDENCE)
    return intensity < 50 ? 'low' : 'emerging'
  if (burden >= 70 && persistence >= 65 && recoveryDifficulty >= 65 && intensity >= 68)
    return 'intensive'
  if (
    (persistence >= 68 && burden >= 78) ||
    (burden >= 78 && recoveryDifficulty >= 65)
  )
    return 'sustained'
  const enduringDimensions = [burden, persistence, recoveryDifficulty].filter(
    (value) => value >= 55,
  ).length
  if (
    intensity >= 55 ||
    persistence >= 55 ||
    recoveryDifficulty >= 55 ||
    (burden >= 70 && persistence >= 45) ||
    enduringDimensions >= 2
  )
    return 'elevated'
  if (
    intensity >= 35 ||
    burden >= 55 ||
    instability >= 55 ||
    persistence >= 45 ||
    recoveryDifficulty >= 45
  )
    return 'emerging'
  return 'low'
}

export const PATTERN_STRAIN_LABELS: Record<PatternStrainBand, string> = {
  low: 'Low strain',
  emerging: 'Emerging strain',
  elevated: 'Elevated strain',
  sustained: 'Sustained strain',
  intensive: 'Intensive strain',
}

export const patternDimensionLevel = (value: number) => {
  if (value >= 70) return 'High'
  if (value >= 45) return 'Moderate'
  return 'Low'
}

const dimensionDetails: Record<
  Exclude<PatternDynamicsDimension, 'combined' | 'data-quality'>,
  { title: string; high: string; low: string }
> = {
  burden: {
    title: 'Recorded challenge burden',
    high: 'Challenges are appearing frequently or clustering together.',
    low: 'Recorded challenge burden remains relatively limited.',
  },
  instability: {
    title: 'Day-to-day instability',
    high: 'Observations are shifting more sharply from one recorded day to the next.',
    low: 'Recent observations have varied within a relatively consistent range.',
  },
  persistence: {
    title: 'Persistence of difficult periods',
    high: 'Difficult observations are carrying across multiple recorded days.',
    low: 'Recent difficult periods have generally remained brief.',
  },
  recovery: {
    title: 'Recovery toward the usual range',
    high: 'Returns toward the established range have been slower or less complete.',
    low: 'The person has generally returned toward their usual range after difficult periods.',
  },
}

export const buildPatternDynamicsObservations = (values: {
  burden: number
  instability: number
  persistence: number
  recoveryDifficulty: number
  largestDecline: number
  dataQuality: PatternDynamicsDataQuality
}): PatternDynamicsObservation[] => {
  const dimensions = [
    { dimension: 'burden' as const, value: values.burden },
    { dimension: 'instability' as const, value: values.instability },
    { dimension: 'persistence' as const, value: values.persistence },
    { dimension: 'recovery' as const, value: values.recoveryDifficulty },
  ].sort((left, right) => right.value - left.value)
  const selectedDimensions = dimensions.slice(0, 3)
  if (
    values.largestDecline >= 20 &&
    !selectedDimensions.some(({ dimension }) => dimension === 'instability')
  ) {
    selectedDimensions[selectedDimensions.length - 1] = dimensions.find(
      ({ dimension }) => dimension === 'instability',
    )!
  }
  const observations: PatternDynamicsObservation[] = selectedDimensions.map(
    ({ dimension, value }, index) => ({
      id: `pattern-${dimension}`,
      dimension,
      importance: index < 2 ? ('primary' as const) : ('supporting' as const),
      title: dimensionDetails[dimension].title,
      detail:
        dimension === 'instability' && values.largestDecline >= 15
          ? `${dimensionDetails[dimension].high} The largest recent decline was ${formatPoints(values.largestDecline)}.`
          : value >= 45
            ? dimensionDetails[dimension].high
            : dimensionDetails[dimension].low,
    }),
  )
  if (!values.dataQuality.isSufficient)
    observations.push({
      id: 'pattern-data-quality',
      dimension: 'data-quality',
      importance: 'supporting',
      title: 'The pattern is still forming',
      detail:
        'Only a limited number of observations are available, so persistence and recovery are less certain.',
    })
  return observations
}

const summaryForBand = (band: PatternStrainBand, sufficient: boolean) => {
  const prefix = sufficient ? '' : 'Available observations suggest '
  const summaries: Record<PatternStrainBand, string> = {
    low: 'recent observations remain close to this person’s established range. Difficult periods have generally been brief and followed by a return toward the usual pattern.',
    emerging:
      'an emerging change from this person’s usual pattern. Some increased burden or reduced recovery is present, but the change is not consistently sustained.',
    elevated:
      'elevated pattern strain. Challenges are appearing more often, and difficult periods are less predictable, more persistent, or slower to resolve.',
    sustained:
      'Challenges remain frequent or concentrated, and returns toward the established range are less frequent or less complete.',
    intensive:
      'a concentrated and persistent pattern of difficulty, with limited recovery between episodes. This may indicate a need for more intensive or coordinated support and professional review.',
  }
  return `${prefix}${summaries[band]}`
}

export const calculatePatternDynamics = (
  currentDays: PatternDynamicsDay[],
  baselineDays: PatternDynamicsDay[],
  expectedDays = DEFAULT_ANALYSIS_DAYS,
): PatternDynamics => {
  const current = observed(currentDays)
  const baseline = observed(baselineDays)
  const transitions = validTransitions(current)
  const downwardChanges = transitions.map(({ previous, current: day }) =>
    Math.max(0, previous.score - day.score),
  )
  const largestDecline = Math.max(0, ...downwardChanges)
  const severeDeclines = downwardChanges.filter((change) => change >= 20).length
  const coverage = expectedDays
    ? Math.min(100, Math.round((current.length / expectedDays) * 100))
    : 0
  const isSufficient = current.length >= MIN_ANALYSIS_OBSERVATIONS
  const observationReliability = Math.min(1, current.length / 14)
  const baselineReliability = Math.min(1, baseline.length / MIN_BASELINE_OBSERVATIONS)
  const transitionReliability = Math.min(1, transitions.length / 8)
  const confidence = clamp(
    100 *
      observationReliability *
      (0.5 + coverage / 200) *
      baselineReliability *
      transitionReliability,
  )
  const burden = calculateBurden(current, baseline)
  const instability = calculateInstability(current, baseline)
  const persistence = calculatePersistence(current, baseline)
  const recoveryDifficulty = calculateRecoveryDifficulty(current, baseline)
  // Initial product heuristics informed by longitudinal pattern concepts. These
  // weights are not clinically validated and intentionally remain easy to tune.
  const intensity = clamp(
    burden * 0.3 + instability * 0.15 + persistence * 0.25 + recoveryDifficulty * 0.3,
  )
  const band = determinePatternStrainBand({
    burden,
    instability,
    persistence,
    recoveryDifficulty,
    intensity,
    confidence,
  })
  const dataQuality = {
    observedDays: current.length,
    expectedDays,
    coverage,
    observedTransitions: transitions.length,
    baselineDays: baseline.length,
    isSufficient,
  }
  const currentRange = range(current)
  const baselineRange = range(baseline)
  return {
    burden,
    instability,
    persistence,
    recoveryDifficulty,
    largestDecline,
    severeDeclines,
    intensity,
    band,
    confidence,
    observations: buildPatternDynamicsObservations({
      burden,
      instability,
      persistence,
      recoveryDifficulty,
      largestDecline,
      dataQuality,
    }),
    dataQuality,
    summary: summaryForBand(
      band,
      isSufficient && confidence >= MIN_CLASSIFICATION_CONFIDENCE,
    ),
    analysisStart: currentRange.start,
    analysisEnd: currentRange.end,
    baselineStart: baselineRange.start,
    baselineEnd: baselineRange.end,
  }
}

export const buildPatternStrainTrend = (
  days: PatternDynamicsDay[],
  endDate: string,
  lookbackDays = 90,
  stepDays = 7,
): PatternStrainTrendPoint[] => {
  const startDate = shiftDate(endDate, -(lookbackDays - 1))
  const dates: string[] = []
  for (
    let date = startDate;
    date <= endDate;
    date = shiftDate(date, stepDays)
  )
    dates.push(date)
  if (dates.at(-1) !== endDate) dates.push(endDate)

  return dates.map((date) => {
    const currentStart = shiftDate(date, -(DEFAULT_ANALYSIS_DAYS - 1))
    const dynamics = calculatePatternDynamics(
      days.filter((day) => day.date >= currentStart && day.date <= date),
      days.filter((day) => day.date < currentStart),
    )
    return {
      date,
      intensity: dynamics.dataQuality.isSufficient ? dynamics.intensity : null,
      band: dynamics.dataQuality.isSufficient ? dynamics.band : null,
    }
  })
}
