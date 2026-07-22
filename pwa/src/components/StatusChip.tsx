import { IonChip } from '@ionic/react'

import type { Status } from '../lib/status'

interface PageProps {
  label: Status['label']
}

export const StatusChip = ({ label }: PageProps) => {
  const color = {
    Concern: 'danger',
    Watch: 'warning',
    Steady: 'success',
    'No data': 'medium',
  }[label]

  return (
    <IonChip className={`timeline-status-chip timeline-status-chip--${color}`}>
      {label}
    </IonChip>
  )
}
