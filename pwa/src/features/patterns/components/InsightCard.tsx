import { FlippableCard } from '../../../components/FlippableCard'
import { IonCardContent } from '@ionic/react'
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
}): React.JSX.Element => (
  <FlippableCard
    className={`pattern-insight pattern-insight--${insight.tone}`}
    kicker={<span className="pattern-insight__icon" aria-hidden="true">{TONE_ICON[insight.tone]}</span>}
    title={insight.title}
  >
    <IonCardContent>
      <p className="pattern-insight__detail">{insight.detail}</p>
      {showConfidence && <ConfidenceBadge confidence={insight.confidence} />}
    </IonCardContent>
  </FlippableCard>
)
