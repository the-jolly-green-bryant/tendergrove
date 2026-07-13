import { IonChip } from '@ionic/react'
import React from 'react'

import type { Confidence } from '../analytics'

const LABEL: Record<Confidence, string> = {
  high: 'High confidence',
  moderate: 'Moderate confidence',
  low: 'Low confidence',
}

export const ConfidenceBadge = ({
  confidence,
}: {
  readonly confidence: Confidence
}): React.JSX.Element => {
  return (
    <IonChip className={`pattern-confidence pattern-confidence--${confidence}`}>
      {LABEL[confidence]}
    </IonChip>
  )
}
