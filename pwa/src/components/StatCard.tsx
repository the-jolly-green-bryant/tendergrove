import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
} from '@ionic/react'

/**
 *
 */
export function StatCard({
  title,
  value,
  note,
}: {
  readonly title: string
  readonly value: string | number
  readonly note?: string
}) {
  return (
    <IonCard className="stat-card">
      <IonCardHeader>
        <IonCardSubtitle>{title}</IonCardSubtitle>
        <IonCardTitle>{value}</IonCardTitle>
      </IonCardHeader>
      {note && <IonCardContent>{note}</IonCardContent>}
    </IonCard>
  )
}
