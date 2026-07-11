import {
  IonCard,
  IonCardContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonNote,
} from '@ionic/react'
import { arrowForwardOutline } from 'ionicons/icons'
import React from 'react'

import type { CorrelationInsight } from '../analytics'
import { ConfidenceBadge } from './ConfidenceBadge'

function lagLabel(lagDays: 0 | 1): string {
  return lagDays === 0 ? 'Same day' : 'Next day'
}

/** A single correlation, shown as a readable card (source → target + summary). */
export function CorrelationCard({
  correlation,
}: {
  readonly correlation: CorrelationInsight
}): React.JSX.Element {
  return (
    <IonItem>
      <IonLabel>
        {correlation.sourceLabel}

        <IonIcon
          icon={arrowForwardOutline}
          aria-hidden="true"
          style={{ margin: '0 6px', verticalAlign: 'middle' }}
        />

        {correlation.targetLabel}
      </IonLabel>
    </IonItem>
  )
}
