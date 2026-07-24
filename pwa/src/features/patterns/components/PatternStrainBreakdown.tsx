import {
  calculatePatternDynamics,
  PATTERN_STRAIN_LABELS,
  patternDimensionLevel,
  type AnalyticsResult,
  type PatternDynamicsDay,
  type ScopedPatternsView,
} from '../analytics'
import { RESEARCH_METHODOLOGY_PATH } from '../../about/researchReferences'
import { IonIcon } from '@ionic/react'
import { informationCircleOutline } from 'ionicons/icons'
import { PatternStrainSparkline } from './PatternStrainSparkline'

const shiftDate = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + days)
  return value.toISOString().slice(0, 10)
}

const levelClass = (value: number) => patternDimensionLevel(value).toLowerCase()

const patternDaysForView = (
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
  const patternDays = patternDaysForView(result, view)
  const dimensions = [
    {
      label: 'Burden',
      value: dynamics.burden,
      detail: 'Frequency and concentration of recorded challenges.',
    },
    {
      label: 'Instability',
      value: dynamics.instability,
      detail:
        dynamics.largestDecline >= 15
          ? `Day-to-day change, including a largest decline of ${dynamics.largestDecline} points.`
          : 'Day-to-day changes between nearby observations.',
    },
    {
      label: 'Persistence',
      value: dynamics.persistence,
      detail: 'How often difficult observations carry across days.',
    },
    {
      label: 'Recovery difficulty',
      value: dynamics.recoveryDifficulty,
      detail: 'How consistently observations return toward the established range.',
    },
  ]

  return (
    <section
      className={`pattern-strain-breakdown pattern-strain-breakdown--${dynamics.band}`}
      aria-labelledby="patterns-strain-title"
    >
      <header>
        <p>Research-informed longitudinal analysis · Recent 28 days</p>
        <h2 id="patterns-strain-title">
          {view.personName ? `${view.personName} · ` : ''}
          {PATTERN_STRAIN_LABELS[dynamics.band]}
        </h2>
        <span>
          {dynamics.dataQuality.observedDays} observed days ·{' '}
          {dynamics.dataQuality.coverage}% coverage
        </span>
      </header>
      <p>{dynamics.summary}</p>
      <PatternStrainSparkline
        days={patternDays}
        endDate={result.window.endDate}
      />
      <div className="pattern-strain-breakdown__grid">
        {dimensions.map((dimension) => (
          <article
            className={`pattern-dimension pattern-dimension--${levelClass(dimension.value)}`}
            key={dimension.label}
          >
            <div>
              <h3>
                {dimension.label}
                <a
                  className="pattern-dimension__research-link"
                  href={`${RESEARCH_METHODOLOGY_PATH}#${dimension.label === 'Recovery difficulty' ? 'recovery' : dimension.label.toLowerCase()}`}
                  aria-label={`Research behind ${dimension.label}`}
                >
                  <IonIcon icon={informationCircleOutline} />
                </a>
              </h3>
              <strong>{patternDimensionLevel(dimension.value)}</strong>
            </div>
            <p>{dimension.detail}</p>
          </article>
        ))}
      </div>
      <p className="pattern-strain-breakdown__note">
        Days without check-ins remain unknown. They are excluded from burden,
        transitions, persistence, and recovery calculations rather than counted as
        easier days. Missing days lower the displayed coverage.
      </p>
      <a href={RESEARCH_METHODOLOGY_PATH}>How Pattern Strain is interpreted</a>
    </section>
  )
}
