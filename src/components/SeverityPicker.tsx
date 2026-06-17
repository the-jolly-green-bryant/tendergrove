import { IonSegment, IonSegmentButton, IonLabel } from '@ionic/react'
import { Severity } from '../lib/domain'

export function SeverityPicker({
  value,
  onChange,
}: {
  value: Severity
  onChange: (value: Severity) => void
}) {
  return (
    <IonSegment
      value={String(value)}
      onIonChange={(event) => onChange(Number(event.detail.value) as Severity)}
    >
      {[1, 2, 3, 4, 5].map((level) => (
        <IonSegmentButton
          key={level}
          value={String(level)}
        >
          <IonLabel>{level}</IonLabel>
        </IonSegmentButton>
      ))}
    </IonSegment>
  )
}
