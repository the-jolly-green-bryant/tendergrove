import { IonChip } from '@ionic/react'
import React from 'react'

import type { Confidence } from '../analytics'

const LABEL: Record<Confidence, string> = {
  high: 'High confidence',
  moderate: 'Moderate confidence',
  low: 'Low confidence',
}

/**
 * A small, reassuring confidence label. We always tell caregivers how sure we
 * are so a low-data guess never reads as fact.
 */
export function ConfidenceBadge({
  confidence,
}: {
  readonly confidence: Confidence
}): React.JSX.Element {
  return (
    <IonChip className={`pattern-confidence pattern-confidence--${confidence}`}>
      {LABEL[confidence]}
    </IonChip>
  )
}
