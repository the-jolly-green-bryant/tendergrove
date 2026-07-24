import { IonIcon } from '@ionic/react'
import { informationCircleOutline } from 'ionicons/icons'

import { RESEARCH_METHODOLOGY_PATH } from '../../about/researchReferences'
import {
  PATTERN_STRAIN_LABELS,
  type PatternDynamics,
} from '../analytics/patternDynamics'

export const PatternStrainSummaryCard = ({
  dynamics,
}: {
  readonly dynamics: PatternDynamics
}) => {
  const isForming = !dynamics.dataQuality.isSufficient
  return (
    <article
      className={`pattern-strain-summary pattern-strain-summary--${dynamics.band}`}
      aria-labelledby="current-pattern-strain"
    >
      <div className="pattern-strain-summary__heading">
        <div>
          <p>Current Pattern Strain</p>
          <h3 id="current-pattern-strain">
            {isForming ? 'Pattern forming' : PATTERN_STRAIN_LABELS[dynamics.band]}
          </h3>
        </div>
        <a
          href={RESEARCH_METHODOLOGY_PATH}
          aria-label="Research and methodology behind Pattern Strain"
        >
          <IonIcon icon={informationCircleOutline} />
        </a>
      </div>
      <p className="pattern-strain-summary__description">
        {isForming
          ? 'More recorded days are needed before Grove can describe burden, instability, persistence, and recovery with useful confidence.'
          : dynamics.summary}
      </p>
      <p className="pattern-strain-summary__coverage">
        Based on {dynamics.dataQuality.observedDays} observed days ·{' '}
        {dynamics.dataQuality.coverage}% recent coverage
      </p>
    </article>
  )
}
