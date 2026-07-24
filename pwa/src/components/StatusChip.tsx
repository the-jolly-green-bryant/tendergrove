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
    'Low strain': 'success',
    'Emerging strain': 'medium',
    'Elevated strain': 'warning',
    'Sustained strain': 'danger',
    'Intensive strain': 'danger',
    'Pattern forming': 'medium',
    'No data': 'medium',
  }[label]

  return (
    <IonChip className={`timeline-status-chip timeline-status-chip--${color}`}>
      {label}
    </IonChip>
  )
}
