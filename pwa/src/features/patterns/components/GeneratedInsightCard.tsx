import { IonButton, IonCard, IonCardContent, IonIcon } from '@ionic/react'
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
}): React.JSX.Element => {
  const shareText = [
    insight.title,
    insight.description,
    insight.evidence,
    insight.action,
    'Tendergrove observation — not a diagnosis.',
  ].filter(Boolean).join('\n\n')
  const share = async () => {
    if (navigator.share) await navigator.share({ title: insight.title, text: shareText })
    else await navigator.clipboard.writeText(shareText)
  }

  return (
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
      {insight.evidence && <p><strong>What we observed:</strong> {insight.evidence}</p>}
      {insight.alternative && <p><strong>What else could explain it:</strong> {insight.alternative}</p>}
      {insight.action && <p><strong>One thing to try:</strong> {insight.action}</p>}
      <ConfidenceBadge confidence={insight.confidence} />
      <IonButton size="small" fill="clear" onClick={() => void share()}>Share or discuss</IonButton>
      </IonCardContent>
    </IonCard>
  )
}
