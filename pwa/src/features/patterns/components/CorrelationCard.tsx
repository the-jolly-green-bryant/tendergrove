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

const lagLabel = (lagDays: 0 | 1): string => (lagDays === 0 ? 'Same day' : 'Next day')

export const CorrelationCard = ({
  correlation,
}: {
  readonly correlation: CorrelationInsight
}): React.JSX.Element => (
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
