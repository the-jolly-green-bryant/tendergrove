import { IonChip } from '@ionic/react'

import type { Status } from '../lib/status'

interface PageProps {
  label: Status['label']
}

export const StatusChip = ({ label }: PageProps) => {
  const color = {
    Crisis: 'danger',
    'Moderate Risk': 'warning',
    'Doing Well': 'success',
    'No Data': 'medium',
  }[label]

  return (
    <>
      <IonChip className={`timeline-status-chip timeline-status-chip--${color}`}>
        {label.replace('Moderate ', '').replace('Doing ', '')}
      </IonChip>
    </>
  )
}
