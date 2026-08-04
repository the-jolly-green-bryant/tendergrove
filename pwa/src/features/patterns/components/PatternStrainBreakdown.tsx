import {
  calculatePatternDynamics,
  type AnalyticsResult,
  type PatternDynamicsDay,
  type ScopedPatternsView,
} from '../analytics'
import { PatternStrainBreakdown as SharedPatternStrainBreakdown } from '../../../components/PatternStrainBreakdown'

const shiftDate = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + days)
  return value.toISOString().slice(0, 10)
}

export const patternDaysForView = (
  result: AnalyticsResult,
  view: ScopedPatternsView,
): PatternDynamicsDay[] => {
  const source = view.personId
    ? (result.personDailyScores[view.personId] ?? [])
    : result.householdDailyScores
  return source.map((day) => ({
    date: day.date,
    score: day.score,
    challengeCount: day.negativeCount,
    positiveCount: day.positiveCount,
    hasChallenges: day.negativeCount > 0,
    hasPositiveSigns: day.positiveCount > 0,
  }))
}

export const calculatePatternDynamicsForView = (
  result: AnalyticsResult,
  view: ScopedPatternsView,
) => {
  const currentStart = shiftDate(result.window.endDate, -27)
  const days = patternDaysForView(result, view)
  return calculatePatternDynamics(
    days.filter((day) => day.date >= currentStart),
    days.filter((day) => day.date < currentStart),
  )
}

export const PatternStrainBreakdown = ({
  result,
  view,
}: {
  result: AnalyticsResult
  view: ScopedPatternsView
}) => {
  const dynamics = calculatePatternDynamicsForView(result, view)
  return <SharedPatternStrainBreakdown dynamics={dynamics} />
}
