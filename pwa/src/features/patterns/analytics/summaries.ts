/**
 * Overview summaries: a small set of safe, human-readable headline insights.
 *
 * This is the copy caregivers see first, so every sentence is checked against
 * the language rules: non-blaming, non-medical, never causal. We lean on
 * "appears", "seems", "worth watching". Numbers are described softly ("slightly
 * higher", "about the same") rather than thrown at the reader.
 */

import { formatDayLabel } from './dateUtils'
import { composeTrendSummary, composeWeeklyObservation } from './observations'
import type {
  Confidence,
  CorrelationInsight,
  DailyHouseholdScore,
  InsightTone,
  MovementFact,
  OverviewSummary,
  PatternInsight,
  TrendResult,
  TurningPointInsight,
} from './types'

/** Sum a field across the last `n` days of the series (most recent slice). */
function sumRecent(
  series: DailyHouseholdScore[],
  n: number,
  field: 'incidentCount' | 'positiveCount' | 'negativeCount',
  offset = 0,
): number {
  const end = series.length - offset
  const start = Math.max(0, end - n)
  return series.slice(start, end).reduce((sum, d) => sum + d[field], 0)
}

/** Identify the most notable recent movement, if any, as structured facts. */
function detectMovement(
  series: DailyHouseholdScore[],
  turningPoints: TurningPointInsight[],
): MovementFact | null {
  const recentIncidents = sumRecent(series, 7, 'incidentCount')
  const priorIncidents = sumRecent(series, 7, 'incidentCount', 7)
  const latestTurning = turningPoints[turningPoints.length - 1]
  const dateLabel = latestTurning ? formatDayLabel(latestTurning.date) : undefined

  if (recentIncidents > priorIncidents && recentIncidents > 0) {
    return { kind: 'incidents-up', dateLabel }
  }
  if (latestTurning && latestTurning.type === 'sustainedDecrease') {
    return { kind: 'harder-since', dateLabel }
  }
  if (
    latestTurning &&
    (latestTurning.type === 'recovery' || latestTurning.type === 'sustainedIncrease')
  ) {
    return { kind: 'looking-up', dateLabel }
  }
  return null
}

function toneFromTrend(trend: TrendResult): PatternInsight['tone'] {
  if (trend.direction === 'worsening') return 'watch'
  if (trend.direction === 'improving') return 'positive'
  return 'neutral'
}

function turningPointTitle(tp: TurningPointInsight, positive: boolean): string {
  const when = formatDayLabel(tp.date)
  if (tp.type === 'spike') return `A hard day around ${when}`
  return positive ? `Things looked up around ${when}` : `A dip around ${when}`
}

function turningPointTone(tp: TurningPointInsight, positive: boolean): InsightTone {
  if (tp.type === 'spike') return 'neutral'
  return positive ? 'positive' : 'watch'
}

/** A card for one turning point. */
function turningPointCard(tp: TurningPointInsight): PatternInsight {
  const positive = tp.type === 'sustainedIncrease' || tp.type === 'recovery'
  return {
    id: `tp:${tp.date}`,
    kind: 'change',
    title: turningPointTitle(tp, positive),
    detail: tp.summary,
    tone: turningPointTone(tp, positive),
    confidence: tp.severity,
  }
}

/** A week-over-week incident movement card, or null when it isn't notable. */
function incidentCard(series: DailyHouseholdScore[]): PatternInsight | null {
  const recent = sumRecent(series, 7, 'incidentCount')
  const prior = sumRecent(series, 7, 'incidentCount', 7)
  if (recent === prior || recent + prior < 2) return null

  const up = recent > prior
  return {
    id: 'incidents-wow',
    kind: 'change',
    title: up ? 'Incidents increased this week' : 'Fewer incidents this week',
    detail: up
      ? `There were ${recent} incidents in the last 7 days, up from ${prior}. Worth keeping an eye on.`
      : `Incidents eased to ${recent} in the last 7 days, down from ${prior}.`,
    tone: up ? 'watch' : 'positive',
    confidence: 'moderate',
  }
}

/** A card for the strongest solid correlation, or null when none qualifies. */
function correlationCard(correlations: CorrelationInsight[]): PatternInsight | null {
  const top = correlations.find((c) => c.confidence !== 'low')
  if (!top) return null
  return {
    id: `corr:${top.sourceLabel}:${top.targetLabel}`,
    kind: 'change',
    title: 'A connection worth noticing',
    detail: top.summary,
    tone: 'neutral',
    confidence: top.confidence,
  }
}

/** Build the noteworthy change cards (2–4), strongest signal first. */
function buildNoteworthy(
  series: DailyHouseholdScore[],
  turningPoints: TurningPointInsight[],
  correlations: CorrelationInsight[],
): PatternInsight[] {
  const cards: (PatternInsight | null)[] = [
    ...[...turningPoints].reverse().slice(0, 2).map(turningPointCard),
    incidentCard(series),
    correlationCard(correlations),
  ]
  // Keep 2–4. If we somehow have fewer than 2, that's fine — the caller renders
  // whatever is meaningful rather than padding with filler.
  return cards.filter((c): c is PatternInsight => c !== null).slice(0, 4)
}

/** Overall confidence: blend the trend confidence with how much moved. */
function overallConfidence(
  trend: TrendResult,
  noteworthy: PatternInsight[],
): Confidence {
  if (trend.direction === 'insufficient') return 'low'
  const hasHigh = noteworthy.some((c) => c.confidence === 'high')
  if (trend.confidence === 'high' && hasHigh) return 'high'
  if (trend.confidence === 'low') return 'low'
  return 'moderate'
}

/**
 * Build the overview summary shown at the top of the Patterns section.
 *
 * `subjectName` (a person's display name) scopes the spoken copy to that
 * person; omit it for the household. The prose itself is produced by
 * `observations.ts`, which is where an LLM could later take over.
 */
export function buildOverview(params: {
  householdTrend: TrendResult
  householdDailyScores: DailyHouseholdScore[]
  turningPoints: TurningPointInsight[]
  correlations: CorrelationInsight[]
  subjectName?: string | null
}): OverviewSummary {
  const { householdTrend, householdDailyScores, turningPoints, correlations } = params
  const subjectName = params.subjectName ?? null

  const movement = detectMovement(householdDailyScores, turningPoints)
  const weeklyDetail = composeWeeklyObservation({
    direction: householdTrend.direction,
    delta: householdTrend.delta,
    currentAverage: householdTrend.current7DayAverage,
    subjectName,
    movement,
  })

  const noteworthy = buildNoteworthy(householdDailyScores, turningPoints, correlations)

  const weeklyInsight: PatternInsight = {
    id: 'weekly',
    kind: 'weekly',
    title: 'This week’s insight',
    detail: weeklyDetail,
    tone: toneFromTrend(householdTrend),
    confidence: householdTrend.confidence,
  }

  return {
    weeklyInsight,
    noteworthy,
    overallTrend: {
      direction: householdTrend.direction,
      current: householdTrend.current7DayAverage,
      previous: householdTrend.previous7DayAverage,
      summary: composeTrendSummary(householdTrend.direction, subjectName),
    },
    confidence: overallConfidence(householdTrend, noteworthy),
  }
}
