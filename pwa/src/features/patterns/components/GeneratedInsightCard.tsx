import { IonCard, IonCardContent, IonIcon } from '@ionic/react'
import {
  alertCircleOutline,
  calendarOutline,
  heartOutline,
  leafOutline,
  moonOutline,
  sparklesOutline,
} from 'ionicons/icons'
import React from 'react'

import type { GeneratedInsight, InsightIcon } from '../analytics'
import { ConfidenceBadge } from './ConfidenceBadge'

const ICON: Record<InsightIcon, string> = {
  moon: moonOutline,
  calendar: calendarOutline,
  leaf: leafOutline,
  heart: heartOutline,
  sparkle: sparklesOutline,
  alert: alertCircleOutline,
}

export const GeneratedInsightCard = ({
  insight,
}: {
  readonly insight: GeneratedInsight
}): React.JSX.Element => (
  <IonCard className={`pattern-insight pattern-insight--${insight.tone}`}>
    <IonCardContent>
      <div className="pattern-insight__head">
        <IonIcon
          className="pattern-insight__icon"
          icon={ICON[insight.icon]}
          aria-hidden="true"
        />
        <h3 className="pattern-insight__title">{insight.title}</h3>
      </div>
      <p className="pattern-insight__detail">{insight.description}</p>
      <ConfidenceBadge confidence={insight.confidence} />
    </IonCardContent>
  </IonCard>
)
