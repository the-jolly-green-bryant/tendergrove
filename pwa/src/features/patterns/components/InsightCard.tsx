import { IonCard, IonCardContent } from '@ionic/react'
import React from 'react'

import type { PatternInsight } from '../analytics'
import { ConfidenceBadge } from './ConfidenceBadge'

const TONE_ICON: Record<PatternInsight['tone'], string> = {
  positive: '🌱',
  watch: '👀',
  neutral: '🔎',
}

export const InsightCard = ({
  insight,
  showConfidence = true,
}: {
  readonly insight: PatternInsight
  readonly showConfidence?: boolean
}): React.JSX.Element => {
  return (
    <IonCard className={`pattern-insight pattern-insight--${insight.tone}`}>
      <IonCardContent>
        <div className="pattern-insight__head">
          <span
            className="pattern-insight__icon"
            aria-hidden="true"
          >
            {TONE_ICON[insight.tone]}
          </span>
          <h3 className="pattern-insight__title">{insight.title}</h3>
        </div>
        <p className="pattern-insight__detail">{insight.detail}</p>
        {showConfidence && <ConfidenceBadge confidence={insight.confidence} />}
      </IonCardContent>
    </IonCard>
  )
}
