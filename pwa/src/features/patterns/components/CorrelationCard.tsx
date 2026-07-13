import { IonIcon, IonItem, IonLabel } from '@ionic/react'
import { arrowForwardOutline } from 'ionicons/icons'
import React from 'react'

import type { CorrelationInsight } from '../analytics'

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
