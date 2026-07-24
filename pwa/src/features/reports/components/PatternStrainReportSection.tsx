import {
  PATTERN_STRAIN_LABELS,
  patternDimensionLevel,
  type PatternDynamics,
  type PatternDynamicsDay,
} from '../../patterns/analytics/patternDynamics'
import { IonButton, IonIcon } from '@ionic/react'
import { informationCircleOutline } from 'ionicons/icons'
import { RESEARCH_METHODOLOGY_PATH } from '../../about/researchReferences'
import type { ReportCalendarDay } from '../reportBuilder'
import { PatternStrainSparkline } from '../../patterns/components/PatternStrainSparkline'

const formatRange = (start: string | null, end: string | null) => {
  if (!start || !end) return 'Not enough recorded dates'
  const format = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  return `${format(start)} to ${format(end)}`
}

const dimensions = (dynamics: PatternDynamics) => [
  {
    key: 'burden',
    label: 'Burden',
    value: dynamics.burden,
    detail: 'How frequently recorded challenges appear or occur together.',
  },
  {
    key: 'instability',
    label: 'Instability',
    value: dynamics.instability,
    detail: 'How sharply wellness changes between nearby observed days.',
  },
  {
    key: 'persistence',
    label: 'Persistence',
    value: dynamics.persistence,
    detail: 'How often difficult observations carry across multiple days.',
  },
  {
    key: 'recovery',
    label: 'Recovery difficulty',
    value: dynamics.recoveryDifficulty,
    detail:
      'How consistently observations return toward the established personal range.',
  },
]

export const PatternStrainReportSection = ({
  dynamics,
  calendarDays = [],
}: {
  dynamics: PatternDynamics
  calendarDays?: ReportCalendarDay[]
}) => {
  const showStrainTrend = ['elevated', 'sustained', 'intensive'].includes(
    dynamics.band,
  )
  const trendDays: PatternDynamicsDay[] = calendarDays.map((day) => ({
    date: day.date,
    score: day.score,
    challengeCount: day.concernSignals,
    positiveCount: day.positiveSignals,
    hasChallenges: day.concernSignals > 0,
    hasPositiveSigns: day.positiveSignals > 0,
  }))

  return (
  <section
    className={`pattern-strain-report pattern-strain-report--${dynamics.band}`}
    aria-labelledby="pattern-strain-title"
  >
    <p className="pattern-strain-report__eyebrow">Research-informed pattern context</p>
    <div className="pattern-strain-report__heading">
      <div>
        <div className="pattern-strain-report__title">
          <h2 id="pattern-strain-title">Pattern Strain</h2>
          <IonButton
            fill="clear"
            size="small"
            routerLink={RESEARCH_METHODOLOGY_PATH}
            aria-label="Learn about Pattern Strain research and methodology"
          >
            <IonIcon icon={informationCircleOutline} />
          </IonButton>
        </div>
        <strong>{PATTERN_STRAIN_LABELS[dynamics.band]}</strong>
      </div>
      <span>{dynamics.confidence}% data confidence</span>
    </div>
    <p className="pattern-strain-report__summary">{dynamics.summary}</p>
    {showStrainTrend && calendarDays.length > 0 && (
      <PatternStrainSparkline
        days={trendDays}
        endDate={calendarDays.at(-1)!.date}
        showAxisLabels={false}
      />
    )}
    <div
      className="pattern-strain-report__dimensions"
      aria-label="Pattern Strain dimensions"
    >
      {dimensions(dynamics).map((dimension) => (
        <article
          className={`pattern-dimension pattern-dimension--${patternDimensionLevel(dimension.value).toLowerCase()}`}
          key={dimension.key}
        >
          <div>
            <h3>
              {dimension.label}
              <a
                className="pattern-dimension__research-link"
                href={`${RESEARCH_METHODOLOGY_PATH}#${dimension.key}`}
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
    <dl className="pattern-strain-report__context">
      <div>
        <dt>Current observations</dt>
        <dd>{formatRange(dynamics.analysisStart, dynamics.analysisEnd)}</dd>
      </div>
      <div>
        <dt>Comparison period</dt>
        <dd>{formatRange(dynamics.baselineStart, dynamics.baselineEnd)}</dd>
      </div>
      <div>
        <dt>Data available</dt>
        <dd>
          {dynamics.dataQuality.observedDays} observed days ·{' '}
          {dynamics.dataQuality.coverage}% coverage
        </dd>
      </div>
    </dl>
    <p className="pattern-strain-report__confidence">
      {dynamics.dataQuality.isSufficient
        ? 'There is enough recent data to describe the current pattern. Confidence also reflects baseline history and valid day-to-day transitions.'
        : 'The pattern is still forming because only a limited number of recent observations are available.'}{' '}
      Days without check-ins remain unknown and are not counted as easier days.
    </p>
    <details className="pattern-strain-methodology">
      <summary>How Pattern Strain is interpreted</summary>
      <p>
        Pattern strain looks at how frequently challenges appear, how sharply
        observations change, how long difficult periods persist, and how consistently
        the person returns toward their usual range.
      </p>
      <p>
        Grove looks at more than whether an individual day was easier or more difficult.
        Research on emotional and behavioral dynamics suggests that patterns over time
        can provide information beyond average levels alone. Grove compares recent
        caregiver-recorded observations with the person’s own established pattern.
      </p>
      <p>
        These concepts are informed by research into affect dynamics, emotional
        variability and instability, emotional inertia, persistence of negative affect,
        recovery, and ecological momentary assessment. Grove’s exact calculation is an
        initial product interpretation of those concepts, not a formula validated by
        those studies.
      </p>
      <p>
        This analysis is descriptive. It is not a diagnosis, validated clinical
        assessment, risk prediction, or recommendation for a specific level of care.
      </p>
      <a href={RESEARCH_METHODOLOGY_PATH}>Learn about the research and methodology</a>
    </details>
  </section>
  )
}
