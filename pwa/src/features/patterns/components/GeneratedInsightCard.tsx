import { FlippableCard } from '../../../components/FlippableCard'
import { IonButton, IonCardContent, IonIcon } from '@ionic/react'
import {
  alertCircleOutline,
  calendarOutline,
  heartOutline,
  leafOutline,
  moonOutline,
  sparklesOutline,
} from 'ionicons/icons'
import React from 'react'

import { useAppAuth } from '../../../auth/AuthContext'
import { addReportPin, readReportPins } from '../../reports/reportPins'
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
  personId,
}: {
  readonly insight: GeneratedInsight
  readonly personId: string | null
}): React.JSX.Element => {
  const { user } = useAppAuth()
  const [pinned, setPinned] = React.useState(() => readReportPins(user?.userId).some((item) => item.id === insight.id))
  const shareText = [
    insight.title,
    insight.description,
    insight.evidence,
    insight.action,
    'Grove observation — not a diagnosis.',
  ].filter(Boolean).join('\n\n')
  const share = async () => {
    if (navigator.share) await navigator.share({ title: insight.title, text: shareText })
    else await navigator.clipboard.writeText(shareText)
  }
  const addToReport = () => {
    addReportPin(user?.userId, { id: insight.id, personId, text: shareText })
    setPinned(true)
  }

  return (
    <FlippableCard
      className={`pattern-insight pattern-insight--${insight.tone}`}
      kicker={<IonIcon className="pattern-insight__icon" icon={ICON[insight.icon]} aria-hidden="true" />}
      title={insight.title}
    >
      <IonCardContent>
      <p className="pattern-insight__detail">{insight.description}</p>
      {insight.evidence && <p><strong>What we observed:</strong> {insight.evidence}</p>}
      {insight.alternative && <p><strong>What else could explain it:</strong> {insight.alternative}</p>}
      {insight.action && <p><strong>One thing to try:</strong> {insight.action}</p>}
      <ConfidenceBadge confidence={insight.confidence} />
      <IonButton size="small" fill="clear" onClick={() => void share()}>Share or discuss</IonButton>
      <IonButton size="small" fill="clear" disabled={pinned} onClick={addToReport}>{pinned ? 'Added to appointment' : 'Add to appointment'}</IonButton>
      </IonCardContent>
    </FlippableCard>
  )
}
