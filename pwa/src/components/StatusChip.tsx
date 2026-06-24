import { IonChip } from '@ionic/react'

interface PageProps {
  label: 'Crisis' | 'Moderate Risk' | 'Doing Well'
}

export const StatusChip = ({ label }: PageProps) => {
  const color = {
    Crisis: 'danger',
    'Moderate Risk': 'warning',
    'Doing Well': 'success',
  }[label]

  return (
    <>
      <IonChip className={`timeline-status-chip timeline-status-chip--${color}`}>
        {label.replace('Moderate ', '').replace('Doing ', '')}
      </IonChip>
    </>
  )
}
