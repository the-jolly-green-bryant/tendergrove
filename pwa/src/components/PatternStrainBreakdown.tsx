import {
  PATTERN_STRAIN_LABELS,
  patternDimensionLevel,
  type PatternDynamics,
} from '../features/patterns/analytics/patternDynamics'
import { IonButton, IonIcon } from '@ionic/react'
import { informationCircleOutline } from 'ionicons/icons'
import { RESEARCH_METHODOLOGY_PATH } from '../features/about/researchReferences'
import { FlippableCard } from './FlippableCard'

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

const levelDescription = (
  dimension: 'burden' | 'instability' | 'persistence' | 'recovery',
  value: number,
) => {
  const level = patternDimensionLevel(value)
  const descriptions = {
    burden: {
      High: 'Challenges appeared frequently or clustered together across recent check-ins.',
      Moderate: 'Challenges appeared often enough to be noticeable, but not across most check-ins.',
      Low: 'Challenges appeared relatively infrequently and did not form a broad recent burden.',
    },
    instability: {
      High: 'Wellness shifted sharply between nearby recorded days, creating a highly uneven pattern.',
      Moderate: 'Wellness moved noticeably between some nearby recorded days, with calmer stretches between them.',
      Low: 'Wellness stayed within a comparatively consistent range from one recorded day to the next.',
    },
    persistence: {
      High: 'Difficult observations tended to continue across several recorded days instead of resolving quickly.',
      Moderate: 'Some difficult periods carried across check-ins, while others remained brief.',
      Low: 'Difficult observations were generally isolated or brief rather than sustained across check-ins.',
    },
    recovery: {
      High: 'After difficult observations, returns toward the established personal range were slow or incomplete.',
      Moderate: 'Recovery toward the established range occurred, but it was uneven or took multiple check-ins.',
      Low: 'Observations generally returned toward the established range after difficult periods.',
    },
  } as const
  return descriptions[dimension][level]
}

const dimensions = (dynamics: PatternDynamics) => [
  {
    key: 'burden',
    label: 'Burden',
    value: dynamics.burden,
    detail: levelDescription('burden', dynamics.burden),
  },
  {
    key: 'instability',
    label: 'Instability',
    value: dynamics.instability,
    detail: levelDescription('instability', dynamics.instability),
  },
  {
    key: 'persistence',
    label: 'Persistence',
    value: dynamics.persistence,
    detail: levelDescription('persistence', dynamics.persistence),
  },
  {
    key: 'recovery',
    label: 'Recovery difficulty',
    value: dynamics.recoveryDifficulty,
    detail: levelDescription('recovery', dynamics.recoveryDifficulty),
  },
]

export const PatternStrainBreakdown = ({
  dynamics,
}: {
  dynamics: PatternDynamics
}) => {
  return (
    <section
      className="pattern-strain-report-layout"
      aria-labelledby="pattern-strain-title"
    >
      <FlippableCard
        className={`pattern-strain-report pattern-strain-report--${dynamics.band}`}
        back={(
          <div className="pattern-strain-methodology">
            <h2>How Pattern Strain is interpreted</h2>
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
          </div>
        )}
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
        <p className="pattern-strain-report__confidence">
          {dynamics.dataQuality.isSufficient
            ? 'There is enough recent data to describe the current pattern. Confidence also reflects baseline history and valid day-to-day transitions.'
            : 'The pattern is still forming because only a limited number of recent observations are available.'}{' '}
          Days without check-ins remain unknown and are not counted as easier days.
        </p>
      </FlippableCard>
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
    </section>
  )
}
