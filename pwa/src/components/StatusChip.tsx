import { IonChip } from '@ionic/react'

import type { Status } from '../lib/status'

interface PageProps {
  label: Status['label']
}

export const StatusChip = ({ label }: PageProps) => {
  const color = {
    'Needs attention': 'danger',
    'More changes recorded': 'warning',
    'No notable change': 'success',
    'Not enough data': 'medium',
  }[label]

  return (
    <IonChip className={`timeline-status-chip timeline-status-chip--${color}`}>
      {label}
    </IonChip>
  )
}
